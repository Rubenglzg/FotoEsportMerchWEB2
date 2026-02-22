import { useEffect } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId } from '../config/constants';

export function useAutoCloseBatches(clubs, orders, showNotification) {
    useEffect(() => {
        const checkAndAutoCloseBatches = async () => {
            if (!orders || orders.length === 0 || !clubs || clubs.length === 0) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const club of clubs) {
                if (club.nextBatchDate) {
                    const closeDate = new Date(club.nextBatchDate);
                    
                    const lastReopen = club.lastBatchReopenTime || 0;
                    const minutesSinceReopen = (Date.now() - lastReopen) / 1000 / 60;
                    const inGracePeriod = minutesSinceReopen < 5; 

                    if (closeDate < today && !inGracePeriod) {
                        const activeBatchId = club.activeGlobalOrderId;
                        const ordersToUpdate = orders.filter(o => 
                            o.clubId === club.id && 
                            o.globalBatch === activeBatchId && 
                            o.status === 'recopilando'
                        );

                        if (ordersToUpdate.length > 0) {
                            try {
                                const batch = writeBatch(db);
                                ordersToUpdate.forEach(order => {
                                    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                                    batch.update(ref, { 
                                        status: 'en_produccion', 
                                        visibleStatus: 'En Producción (Automático)' 
                                    });
                                });

                                const clubRef = doc(db, 'clubs', club.id);
                                batch.update(clubRef, { 
                                    activeGlobalOrderId: activeBatchId + 1,
                                    nextBatchDate: null 
                                });

                                await batch.commit();
                                showNotification(`📅 Lote #${activeBatchId} de ${club.name} cerrado y procesado.`, 'warning');
                            } catch (error) {
                                console.error("Error cierre automático:", error);
                            }
                        }
                    }
                }
            }
        };

        const timer = setTimeout(checkAndAutoCloseBatches, 3000);
        return () => clearTimeout(timer);
    }, [clubs, orders, showNotification]);
}