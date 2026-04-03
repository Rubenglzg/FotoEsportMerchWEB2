import { doc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId } from '../config/constants';

export function useDeleteHandlers(orders, seasons, setConfirmation, showNotification) {
    
    const handleDeleteOrder = (orderId) => {
        setConfirmation({
            msg: "⚠️ ¿Estás seguro de ELIMINAR este pedido definitivamente?",
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
                    showNotification('Pedido eliminado correctamente');
                } catch (e) { showNotification('Error al eliminar pedido', 'error'); }
            }
        });
    };

    const handleDeleteGlobalBatch = (clubId, batchId) => {
        const ordersInBatch = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId);
        setConfirmation({
            msg: `⚠️ PELIGRO: Vas a eliminar el LOTE GLOBAL #${batchId} con ${ordersInBatch.length} pedidos.\n\nEsta acción borrará TODOS los pedidos de este lote definitivamente.`,
            onConfirm: async () => {
                try {
                    // --- NUEVO: Borrado en lotes de 500 para evitar el límite de Firestore ---
                    const CHUNK_SIZE = 500;
                    for (let i = 0; i < ordersInBatch.length; i += CHUNK_SIZE) {
                        const chunk = ordersInBatch.slice(i, i + CHUNK_SIZE);
                        const batch = writeBatch(db);
                        
                        chunk.forEach(o => {
                            const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
                            batch.delete(ref);
                        });
                        
                        await batch.commit();
                    }
                    // ----------------------------------------------------------------------
                    
                    showNotification(`Lote #${batchId} eliminado correctamente`);
                } catch (e) { 
                    console.error(e);
                    showNotification('Error al eliminar el lote', 'error'); 
                }
            }
        });
    };

    const handleDeleteSeasonData = (seasonId, selectedClubIds = [], deleteConfigFn = null) => {
        const season = seasons.find(s => s.id === seasonId);
        if (!season) return;

        const start = new Date(season.startDate).getTime();
        const end = new Date(season.endDate).getTime();
        
        const ordersToDelete = orders.filter(o => {
            // Filtrar por club si se han seleccionado clubes específicos
            if (selectedClubIds.length > 0 && !selectedClubIds.includes(o.clubId)) {
                return false;
            }
            // Filtrar por temporada
            if (o.manualSeasonId) return o.manualSeasonId === season.id;
            const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
            return d >= start && d <= end;
        });

        const isFullDelete = typeof deleteConfigFn === 'function';

        if (ordersToDelete.length === 0 && !isFullDelete) {
            showNotification('No hay datos para borrar en los clubes seleccionados', 'warning');
            return;
        }

        const msg = isFullDelete 
            ? `Estás a punto de eliminar DEFINITIVAMENTE la temporada "${season.name}" de la configuración y TODOS sus pedidos asociados (${ordersToDelete.length} pedidos encontrados).\n\nEsta acción NO SE PUEDE DESHACER.`
            : `Estás a punto de eliminar DEFINITIVAMENTE los pedidos de la temporada "${season.name}" de los ${selectedClubIds.length} clubes seleccionados (${ordersToDelete.length} pedidos encontrados).\n\nEsta acción NO SE PUEDE DESHACER.`;

        setConfirmation({
            title: isFullDelete ? "⚠️ ELIMINAR TEMPORADA Y PEDIDOS" : "⚠️ BORRADO PARCIAL DE PEDIDOS",
            msg: msg,
            onConfirm: async () => {
                try {
                    // 1. Borrar pedidos en Firebase en grupos de 500
                    if (ordersToDelete.length > 0) {
                        const CHUNK_SIZE = 500;
                        for (let i = 0; i < ordersToDelete.length; i += CHUNK_SIZE) {
                            const chunk = ordersToDelete.slice(i, i + CHUNK_SIZE);
                            const batch = writeBatch(db);
                            
                            chunk.forEach(o => {
                                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
                                batch.delete(ref);
                            });
                            
                            await batch.commit();
                        }
                    }
                    
                    // 2. Si es borrado total (papelera roja), borrar la configuración
                    if (isFullDelete) {
                        deleteConfigFn();
                    }
                    
                    showNotification(isFullDelete 
                        ? `Temporada ${season.name} eliminada por completo.` 
                        : `Se han eliminado ${ordersToDelete.length} pedidos.`);
                } catch (e) {
                    console.error(e);
                    showNotification('Error al eliminar los datos', 'error');
                }
            }
        });
    };

    return { handleDeleteOrder, handleDeleteGlobalBatch, handleDeleteSeasonData };
}