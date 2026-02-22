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
                    const batch = writeBatch(db);
                    ordersInBatch.forEach(o => {
                        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
                        batch.delete(ref);
                    });
                    await batch.commit();
                    showNotification(`Lote #${batchId} eliminado correctamente`);
                } catch (e) { showNotification('Error al eliminar el lote', 'error'); }
            }
        });
    };

    const handleDeleteSeasonData = (seasonId) => {
        const season = seasons.find(s => s.id === seasonId);
        if (!season) return;

        const start = new Date(season.startDate).getTime();
        const end = new Date(season.endDate).getTime();
        
        const ordersToDelete = orders.filter(o => {
            if (o.manualSeasonId) return o.manualSeasonId === season.id;
            const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
            return d >= start && d <= end;
        });

        if (ordersToDelete.length === 0) {
            showNotification('No hay datos para borrar en esta temporada', 'warning');
            return;
        }

        setConfirmation({
            title: "⚠️ PELIGRO: BORRADO DE DATOS",
            msg: `Estás a punto de eliminar DEFINITIVAMENTE todos los datos de la temporada "${season.name}".\n\nEsto borrará ${ordersToDelete.length} pedidos de la base de datos y de la web.\n\nEsta acción NO SE PUEDE DESHACER. ¿Estás seguro?`,
            onConfirm: async () => {
                try {
                    const batch = writeBatch(db);
                    ordersToDelete.forEach(o => {
                        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
                        batch.delete(ref);
                    });
                    await batch.commit();
                    showNotification(`Se han eliminado ${ordersToDelete.length} pedidos de la temporada ${season.name}.`);
                } catch (e) {
                    console.error(e);
                    showNotification('Error al eliminar los datos', 'error');
                }
            }
        });
    };

    return { handleDeleteOrder, handleDeleteGlobalBatch, handleDeleteSeasonData };
}