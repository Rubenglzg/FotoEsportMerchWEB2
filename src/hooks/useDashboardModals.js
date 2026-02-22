import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId } from '../config/constants';

export function useDashboardModals({
    orders,
    clubs,
    showNotification,
    setConfirmation,
    editOrderModal,
    setEditOrderModal,
    moveSeasonModal,
    setMoveSeasonModal,
    revertModal,
    setRevertModal,
    decrementClubGlobalOrder
}) {

    // --- GUARDAR EDICIÓN DE PEDIDO ---
    const handlePreSaveOrder = () => {
        const { original, modified } = editOrderModal;
        if (!original || !modified) return;

        const changes = [];

        if (original.customer.name !== modified.customer.name) changes.push(`👤 Cliente: "${original.customer.name}" ➝ "${modified.customer.name}"`);
        if (original.customer.email !== modified.customer.email) changes.push(`📧 Email: "${original.customer.email}" ➝ "${modified.customer.email}"`);

        modified.items.forEach((mItem, idx) => {
            const oItem = original.items[idx];
            const prodName = mItem.name || 'Producto';
            
            if (!oItem) {
                 changes.push(`➕ Nuevo producto: ${prodName}`);
            } else {
                 if(oItem.name !== mItem.name) changes.push(`📦 Nombre (${idx+1}): "${oItem.name}" ➝ "${mItem.name}"`);
                 if(oItem.quantity !== mItem.quantity) changes.push(`🔢 Cantidad (${prodName}): ${oItem.quantity} ➝ ${mItem.quantity}`);
                 if(oItem.playerNumber !== mItem.playerNumber) changes.push(`Shirt # (${prodName}): ${oItem.playerNumber || '-'} ➝ ${mItem.playerNumber || '-'}`);
                 if(oItem.playerName !== mItem.playerName) changes.push(`Shirt Name (${prodName}): ${oItem.playerName || '-'} ➝ ${mItem.playerName || '-'}`);
                 if(oItem.price !== mItem.price) changes.push(`💶 Precio (${prodName}): ${oItem.price}€ ➝ ${mItem.price}€`);
            }
        });

        if (changes.length === 0) {
            showNotification('No se han detectado cambios', 'warning');
            return;
        }

        setConfirmation({
            title: "Confirmar Modificaciones",
            msg: "Estás a punto de aplicar los siguientes cambios:",
            details: changes,
            onConfirm: async () => {
                try {
                    const newTotal = modified.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', modified.id), {
                        customer: modified.customer, items: modified.items, total: newTotal
                    });
                    showNotification('Cambios aplicados correctamente');
                    setEditOrderModal({ active: false, original: null, modified: null });
                } catch (e) { showNotification('Error al guardar cambios', 'error'); }
            }
        });
    };

    // --- MOVER LOTE DE TEMPORADA ---
    const handleMoveBatchSeasonSubmit = async (newSeasonId) => {
        if (!moveSeasonModal.target) return;
        const { clubId, batchId } = moveSeasonModal.target;
        const ordersInBatch = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId);
        
        try {
            const batch = writeBatch(db);
            ordersInBatch.forEach(o => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
                batch.update(ref, { manualSeasonId: newSeasonId });
            });
            await batch.commit();
            showNotification(`Lote #${batchId} movido a la nueva temporada`);
            setMoveSeasonModal({ active: false, target: null });
        } catch (e) { showNotification('Error al mover el lote', 'error'); }
    };

    // --- REVERTIR LOTE ---
    const handleRevertGlobalBatch = (clubId) => {
        const club = clubs.find(c => c.id === clubId);
        if (!club || club.activeGlobalOrderId <= 1) return;
        const currentBatchId = club.activeGlobalOrderId;
        const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === currentBatchId);

        if (batchOrders.length === 0) {
            decrementClubGlobalOrder(clubId, currentBatchId - 1);
        } else {
            setRevertModal({ active: true, clubId, currentBatchId, ordersCount: batchOrders.length });
        }
    };

    const processRevertBatch = async (action) => {
        const { clubId, currentBatchId } = revertModal;
        if (!clubId) return;
        const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === currentBatchId);
        
        try {
            const batch = writeBatch(db);
            batchOrders.forEach(order => {
                if (action === 'delete') {
                    batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id));
                } else {
                    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { globalBatch: currentBatchId - 1 });
                }
            });
            await batch.commit();
            decrementClubGlobalOrder(clubId, currentBatchId - 1);
            setRevertModal({ active: false, clubId: null, currentBatchId: null, ordersCount: 0 });
        } catch (e) {
            alert("Error al procesar la acción. Inténtalo de nuevo.");
        }
    };

    return { handlePreSaveOrder, handleMoveBatchSeasonSubmit, handleRevertGlobalBatch, processRevertBatch };
}