import { doc, updateDoc, writeBatch, addDoc, collection, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId } from '../config/constants';
import { generateStockEmailHTML, generateEmailHTML } from '../utils/emailTemplates';

export function useDashboardActions(showNotification) {

    // --- ENVIAR CORREOS A PROVEEDORES (STOCK) ---
    const sendSupplierEmails = async (targetSuppliers, batchId, club) => {
        if (!targetSuppliers.length) return;
        const batchWrite = writeBatch(db);
        let sentCount = 0;
        const nowStr = new Date().toISOString();
        const currentBatchLog = (club.accountingLog && club.accountingLog[batchId]) ? club.accountingLog[batchId] : {};
        const currentEmailHistory = currentBatchLog.supplierEmails || {};
        const clubRef = doc(db, 'clubs', club.id);
        const updates = {};

        targetSuppliers.forEach(data => {
            if (!data.email) return;
            const ccEmails = (data.contacts || []).filter(c => c.ccDefault === true && c.email).map(c => c.email);
            const emailSubject = `FotoEsport Merch // ${club.name} // Pedido Global ${batchId}`;
            const mailRef = doc(collection(db, 'mail'));
            batchWrite.set(mailRef, {
                to: [data.email],
                cc: ccEmails, 
                message: {
                    subject: emailSubject,
                    html: generateStockEmailHTML(data.name, batchId, club.name, data.stockItems),
                    text: `Previsión de stock para ${club.name}. Lote ${batchId}.`
                },
                metadata: { type: 'stock_forecast', supplierId: data.id, clubId: club.id, batchId: batchId, sentAt: nowStr, snapshotQty: data.totalUnits }
            });

            const newHistoryEntry = { sentAt: nowStr, qty: data.totalUnits, refs: data.stockItems.length };
            let supplierHistory = currentEmailHistory[data.id];
            if (typeof supplierHistory === 'string') {
                supplierHistory = [{ sentAt: supplierHistory, qty: '?', refs: '?' }];
            } else if (!Array.isArray(supplierHistory)) {
                supplierHistory = [];
            }
            const newHistoryList = [...supplierHistory, newHistoryEntry];
            updates[`accountingLog.${batchId}.supplierEmails.${data.id}`] = newHistoryList;
            sentCount++;
        });

        if (sentCount > 0) {
            batchWrite.update(clubRef, updates);
            try {
                await batchWrite.commit();
                showNotification(`✅ Enviados ${sentCount} correos y actualizado historial.`);
            } catch (e) {
                console.error("Error envío:", e);
                showNotification("Error al enviar correos.", "error");
            }
        }
    };

    // --- ACTUALIZAR ESTADO DE LOTE GLOBAL ---
    const processBatchStatusUpdate = async (statusChangeModal, shouldNotify, orders, clubs, setStatusChangeModal) => {
        const { clubId, batchId, newStatus } = statusChangeModal;
        if (!clubId || !batchId || !newStatus) return;

        if (newStatus === 'recopilando') {
            const targetIsError = String(batchId).startsWith('ERR');
            const targetIsIndividual = batchId === 'INDIVIDUAL';
            const targetIsGlobal = !targetIsError && !targetIsIndividual;

            const conflictOrder = orders.find(o => {
                if (o.clubId !== clubId) return false;
                if (o.status !== 'recopilando') return false;
                if (o.globalBatch === batchId) return false;
                const currentIsError = String(o.globalBatch).startsWith('ERR');
                const currentIsIndividual = o.globalBatch === 'INDIVIDUAL';
                const currentIsGlobal = !currentIsError && !currentIsIndividual;
                if (targetIsError && currentIsError) return true;
                if (targetIsIndividual && currentIsIndividual) return true;
                if (targetIsGlobal && currentIsGlobal) return true;
                return false;
            });

            if (conflictOrder) {
                showNotification(`⛔ ACCIÓN DENEGADA: Ya tienes el Lote Global #${conflictOrder.globalBatch} en estado "Recopilando". Debes pasarlo a producción antes de abrir otro del mismo tipo.`, 'error');
                setStatusChangeModal({ ...statusChangeModal, active: false });
                return;
            }
        }

        setStatusChangeModal({ ...statusChangeModal, active: false });
        const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId && o.status !== 'pendiente_validacion'); 
        const club = clubs.find(c => c.id === clubId);
        const clubName = club ? club.name : 'Tu Club';
        const batchWrite = writeBatch(db);
        let count = 0, notifiedCount = 0;
        const now = new Date().toISOString();
        const prevStatus = batchOrders[0]?.status || 'desconocido';

        batchOrders.forEach(order => {
            if (order.status !== newStatus) { 
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                const updates = { 
                    status: newStatus, 
                    visibleStatus: newStatus === 'recopilando' ? 'Recopilando' : newStatus === 'en_produccion' ? 'En Producción' : 'Entregado al Club'
                };
                
                if (shouldNotify) {
                    const targetEmail = order.customer.email;
                    const wantsUpdates = order.customer.emailUpdates === true;
                    if (wantsUpdates && targetEmail && targetEmail.includes('@') && targetEmail.length > 5) {
                        const mailRef = doc(collection(db, 'mail'));
                        batchWrite.set(mailRef, {
                            to: [targetEmail],
                            message: {
                                subject: `📢 Estado Actualizado: Pedido ${clubName} (#${order.id.slice(0,6)})`,
                                html: generateEmailHTML(order, newStatus, clubName),
                                text: `Tu pedido ha cambiado al estado: ${newStatus}. Contacta con tu club para más detalles.`
                            },
                            metadata: { orderId: order.id, clubId: clubId, batchId: batchId, timestamp: serverTimestamp() }
                        });
                        updates.notificationLog = arrayUnion({ date: now, statusFrom: order.status, statusTo: newStatus, method: 'email' });
                        notifiedCount++;
                    }
                }
                batchWrite.update(ref, updates);
                count++; 
            }
        });

        const clubRefDoc = doc(db, 'clubs', clubId);
        const globalLogEntry = { batchId: batchId, date: now, statusFrom: prevStatus, statusTo: newStatus, notifiedCount: shouldNotify ? notifiedCount : 0, action: 'Cambio de Estado' };
        batchWrite.update(clubRefDoc, { batchHistory: arrayUnion(globalLogEntry) });

        if (newStatus === 'recopilando') {
            batchWrite.update(clubRefDoc, { lastBatchReopenTime: Date.now() });
            if (typeof batchId === 'number' && !String(batchId).startsWith('ERR')) {
                batchWrite.update(clubRefDoc, { activeGlobalOrderId: batchId });
            }
        }
        
        if (newStatus === 'en_produccion') { 
            if (club && club.activeGlobalOrderId === batchId) { 
                batchWrite.update(clubRefDoc, { activeGlobalOrderId: club.activeGlobalOrderId + 1 });
            } 
            if (typeof batchId === 'string' && batchId.startsWith('ERR-')) {
                const currentErrNum = parseInt(batchId.split('-')[1]);
                const activeErrNum = parseInt(club.activeErrorBatchId || 1);
                if (!isNaN(currentErrNum) && currentErrNum === activeErrNum) {
                    batchWrite.update(clubRefDoc, { activeErrorBatchId: activeErrNum + 1 });
                }
            }
        }

        try {
            await batchWrite.commit();
            let msg = `Lote #${batchId}: ${count} pedidos actualizados.`;
            if (shouldNotify) msg += ` Se han puesto en cola ${notifiedCount} correos electrónicos.`;
            showNotification(msg, 'success');
        } catch (e) {
            console.error(e);
            showNotification("Error al actualizar lote y enviar correos", "error");
        }
    };

    // --- GESTIÓN AVANZADA DE LOTE (Mover / Borrar) ---
    const processBatchManagement = async (manageBatchModal, orders, setManageBatchModal) => {
        const { club, batchId, orders: batchOrders, action, targetBatch, deleteType } = manageBatchModal;
        if (!club || !batchId) return;

        if (action === 'move' && !targetBatch) {
            showNotification("Debes seleccionar un lote de destino", "error");
            return;
        }

        try {
            const batch = writeBatch(db);
            let batchNum = typeof batchId === 'number' ? batchId : 0;
            let isErrorBatch = false;

            if (typeof batchId === 'string' && batchId.startsWith('ERR')) {
                isErrorBatch = true;
                batchNum = parseInt(batchId.split('-')[1]); 
            }

            batchOrders.forEach(order => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                if (action === 'delete') {
                    batch.delete(ref);
                } else {
                    let finalGlobalBatch = targetBatch;
                    if (targetBatch === 'ERR_ACTIVE') {
                        finalGlobalBatch = `ERR-${club.activeErrorBatchId || 1}`;
                    } else if (targetBatch !== 'INDIVIDUAL' && targetBatch !== 'SPECIAL') {
                        if (!String(targetBatch).startsWith('ERR')) finalGlobalBatch = parseInt(targetBatch);
                    }
                    batch.update(ref, { globalBatch: finalGlobalBatch, status: 'recopilando', visibleStatus: 'Recopilando (Traspasado)' });
                }
            });

            if (action === 'delete' && deleteType === 'full') {
                const clubRef = doc(db, 'clubs', club.id);
                if (isErrorBatch) {
                    const currentActiveErr = parseInt(club.activeErrorBatchId || 1);
                    if (batchNum === currentActiveErr && batchNum >= 1) {
                        batch.update(clubRef, { activeErrorBatchId: batchNum - 1 });
                        if (batchNum > 1) {
                            const prevBatchId = `ERR-${batchNum - 1}`;
                            const prevOrders = orders.filter(o => o.clubId === club.id && o.globalBatch === prevBatchId);
                            prevOrders.forEach(po => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'orders', po.id), { status: 'recopilando' }));
                        }
                    }
                } else {
                    const currentActiveStd = parseInt(club.activeGlobalOrderId || 1);
                    if (batchNum === currentActiveStd && batchNum >= 1) {
                        batch.update(clubRef, { activeGlobalOrderId: batchNum - 1 });
                        if (batchNum > 1) {
                            const prevOrders = orders.filter(o => o.clubId === club.id && o.globalBatch === batchNum - 1);
                            prevOrders.forEach(po => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'orders', po.id), { status: 'recopilando' }));
                        }
                    }
                }
            }

            await batch.commit();
            showNotification(action === 'move' ? 'Pedidos traspasados' : 'Lote eliminado correctamente');
            setManageBatchModal({ ...manageBatchModal, active: false });

        } catch (error) {
            console.error("Error batch management:", error);
            showNotification("Error al procesar", "error");
        }
    };

    // --- CREAR REPOSICIÓN / INCIDENCIA ---
    const createIncidentReplacement = async (incidentForm, clubs, setIncidentForm) => {
        if (!incidentForm.item || !incidentForm.order) return;
        const { order, item, qty, cost, reason, responsibility, internalOrigin, recharge, targetBatch } = incidentForm;
        
        let batchIdToSave = targetBatch;
        if (targetBatch === 'ERRORS') {
            const currentClub = clubs.find(c => c.id === order.clubId);
            const errorId = currentClub?.activeErrorBatchId || 1; 
            batchIdToSave = `ERR-${errorId}`; 
        } else if (targetBatch !== 'INDIVIDUAL') {
            batchIdToSave = parseInt(targetBatch);
        }
        
        const finalPrice = (responsibility === 'club' && recharge) ? item.price : 0;
        let finalCost = parseFloat(cost);
        if (responsibility === 'internal' && internalOrigin === 'supplier') {
            finalCost = 0;
        }
        const totalOrder = finalPrice * qty;

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
                createdAt: serverTimestamp(),
                clubId: order.clubId,
                clubName: order.clubName || 'Club',
                customer: { name: `${order.customer.name} (REPOSICIÓN)`, email: order.customer.email, phone: order.customer.phone },
                items: [{ ...item, quantity: parseInt(qty), price: finalPrice, cost: finalCost, name: `${item.name} [REP]` }],
                total: totalOrder,
                status: targetBatch === 'INDIVIDUAL' ? 'en_produccion' : 'recopilando',
                visibleStatus: 'Reposición / Incidencia',
                type: 'replacement',
                paymentMethod: 'incident', 
                globalBatch: batchIdToSave,
                relatedOrderId: order.id,
                incidentDetails: { originalItemId: item.cartId, reason: reason, responsibility: responsibility, internalOrigin: responsibility === 'internal' ? internalOrigin : null },
                incidents: []
            });

            const originalRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
            await updateDoc(originalRef, {
                incidents: arrayUnion({
                    id: Date.now(),
                    itemId: item.cartId,
                    itemName: item.name,
                    date: new Date().toISOString(),
                    resolved: true,
                    note: `Reposición generada (${String(batchIdToSave).startsWith('ERR') ? 'Lote Errores' : 'Lote ' + batchIdToSave})`
                })
            });

            showNotification('Pedido de reposición generado correctamente');
            setIncidentForm({ ...incidentForm, active: false });

        } catch (e) {
            console.error(e);
            showNotification('Error al generar la reposición', 'error');
        }
    };

    return {
        sendSupplierEmails,
        processBatchStatusUpdate,
        processBatchManagement,
        createIncidentReplacement
    };
}