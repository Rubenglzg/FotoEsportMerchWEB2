import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, Briefcase, Banknote, Factory, Calendar, Folder, AlertTriangle,  
  Mail,
  ArrowRight, 
  MoveLeft,
  Trash2, Image as ImageIcon, X, Check, AlertCircle, BarChart3,
} from 'lucide-react';

import { collection, doc, updateDoc, writeBatch, arrayUnion, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

import { db } from '../config/firebase';
import { appId } from '../config/constants';
import { Button } from '../components/ui/Button';

// UTILS
import { generateStockEmailHTML, generateEmailHTML } from '../utils/emailTemplates';
import { generateSeasonExcel } from '../utils/excelExport';

import { FilesManager } from '../components/admin/FilesManager';
import { SupplierManager } from '../components/admin/SupplierManager';

// MODALS
import { SupplierStockModal } from '../components/admin/modals/SupplierStockModal';
import { ManageBatchModal } from '../components/admin/modals/ManageBatchModal';
import { IncidentModal } from '../components/admin/modals/IncidentModal';
import { EditOrderModal } from '../components/admin/modals/EditOrderModal';
import { BatchHistoryModal } from '../components/admin/modals/BatchHistoryModal';
import { StatusChangeModal } from '../components/admin/modals/StatusChangeModal';
import { RevertBatchModal } from '../components/admin/modals/RevertBatchModal';
import { MoveSeasonModal } from '../components/admin/modals/MoveSeasonModal';

// TABS (PESTAÑAS)
import { ManagementTab } from '../components/admin/tabs/ManagementTab';
import { AccountingTab } from '../components/admin/tabs/AccountingTab';
import { AccountingControlTab } from '../components/admin/tabs/AccountingControlTab';
import { SpecialOrdersTab } from '../components/admin/tabs/SpecialOrdersTab';
import { SeasonsTab } from '../components/admin/tabs/SeasonsTab';
import { IncidentsTab } from '../components/admin/tabs/IncidentsTab';
import { FinancesTab } from '../components/admin/tabs/FinancesTab';

// HOOKS
import { useDashboardStats } from '../hooks/useDashboardStats';

export function AdminDashboard({ products, orders, clubs, incrementClubErrorBatch, updateOrderStatus, financialConfig, setFinancialConfig, updateFinancialConfig, updateProduct, addProduct, deleteProduct, createClub, deleteClub, updateClub, toggleClubBlock, modificationFee, setModificationFee, seasons, addSeason, deleteSeason, toggleSeasonVisibility, storeConfig, setStoreConfig, incrementClubGlobalOrder, decrementClubGlobalOrder, showNotification, createSpecialOrder, addIncident, updateIncidentStatus, suppliers, createSupplier, updateSupplier, deleteSupplier, updateProductCostBatch, campaignConfig, setCampaignConfig,}) {
  const [tab, setTab] = useState('management');
  const [financeSeasonId, setFinanceSeasonId] = useState(seasons[seasons.length - 1]?.id || 'all');

  // Modificamos el estado de mover temporada para que acepte lotes completos
  const [moveSeasonModal, setMoveSeasonModal] = useState({ active: false, target: null, type: 'batch' }); // type: 'batch' | 'order'
  const [isEditingActiveBatch, setIsEditingActiveBatch] = useState(false);
  const [tempBatchValue, setTempBatchValue] = useState(1);
  const [filterClubId, setFilterClubId] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState(clubs[0]?.id || '');
  const [selectedClubFiles, setSelectedClubFiles] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [statsClubFilter, setStatsClubFilter] = useState('all');

  // --- ESTADOS PARA EDICIÓN Y MOVIMIENTOS ---
  const [editOrderModal, setEditOrderModal] = useState({ 
      active: false, 
      original: null, 
      modified: null 
  });

    // --- PEGAR ESTO JUNTO A LOS OTROS useState ---
  const [incidents, setIncidents] = useState([]);
  
  // Calcula cuántas no están cerradas ni resueltas (es decir, 'open')
    const pendingCount = incidents.filter(i => i.status === 'open').length;

  // Cargar incidencias cuando entres en la pestaña
  useEffect(() => {
    if (tab === 'incidents') {
      const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        setIncidents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [tab]);

  // --- NUEVO ESTADO PARA GESTIÓN AVANZADA DE LOTES ---
    const [manageBatchModal, setManageBatchModal] = useState({
        active: false,
        club: null,
        batchId: null,
        orders: [],
        action: 'move',     // 'move' | 'delete'
        targetBatch: '',    // Para mover
        deleteType: 'full'  // 'full' (Borrar Lote y Retroceder) | 'empty' (Solo vaciar pedidos)
    });

// ABRIR MODAL
  const openManageBatchModal = (club, batchId, batchOrders) => {
      let defaultTarget = '';
      if (String(batchId).startsWith('ERR')) {
          defaultTarget = club.activeGlobalOrderId; 
      } else {
          defaultTarget = club.activeGlobalOrderId;
          if(batchId === club.activeGlobalOrderId) defaultTarget = 'INDIVIDUAL';
      }

      setManageBatchModal({
          active: true,
          club: club,
          batchId: batchId,
          orders: batchOrders,
          action: batchOrders.length > 0 ? 'move' : 'delete',
          targetBatch: defaultTarget,
          deleteType: 'full' // Por defecto eliminar completo
      });
  };

// --- FUNCIÓN EJECUTAR (ROBUSTA) ---
  const executeBatchManagement = async () => {
      const { club, batchId, orders: batchOrders, action, targetBatch, deleteType } = manageBatchModal;
      if (!club || !batchId) return;

      if (action === 'move' && !targetBatch) {
          showNotification("Debes seleccionar un lote de destino", "error");
          return;
      }

      try {
          const batch = writeBatch(db);
          
          // Lógica robusta para identificar IDs numéricos
          let batchNum = typeof batchId === 'number' ? batchId : 0;
          let isErrorBatch = false;

          if (typeof batchId === 'string' && batchId.startsWith('ERR')) {
              isErrorBatch = true;
              batchNum = parseInt(batchId.split('-')[1]); // "ERR-2" -> 2
          }

          // 1. PROCESAR PEDIDOS (Mover o Borrar)
          batchOrders.forEach(order => {
              const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
              if (action === 'delete') {
                  batch.delete(ref);
              } else {
                  // Lógica de mover (igual que antes)
                  let finalGlobalBatch = targetBatch;
                  if (targetBatch === 'ERR_ACTIVE') {
                      finalGlobalBatch = `ERR-${club.activeErrorBatchId || 1}`;
                  } else if (targetBatch !== 'INDIVIDUAL' && targetBatch !== 'SPECIAL') {
                      if (!String(targetBatch).startsWith('ERR')) finalGlobalBatch = parseInt(targetBatch);
                  }
                  batch.update(ref, { 
                      globalBatch: finalGlobalBatch, 
                      status: 'recopilando', 
                      visibleStatus: 'Recopilando (Traspasado)' 
                  });
              }
          });

          // 2. RETROCEDER CONTADOR (Solo si es 'delete full' y coincide con el activo)
          if (action === 'delete' && deleteType === 'full') {
              const clubRef = doc(db, 'clubs', club.id);
              
              if (isErrorBatch) {
                  // CASO ERROR: ERR-2 -> Retroceder a 1
                  const currentActiveErr = parseInt(club.activeErrorBatchId || 1);
                  if (batchNum === currentActiveErr && batchNum >= 1) {
                      // Restamos 1 (si es 1 pasa a 0 y desaparecen los errores)
                      batch.update(clubRef, { activeErrorBatchId: batchNum - 1 });
                      
                      // Reabrir pedidos del anterior (si existen)
                      if (batchNum > 1) {
                          const prevBatchId = `ERR-${batchNum - 1}`;
                          const prevOrders = orders.filter(o => o.clubId === club.id && o.globalBatch === prevBatchId);
                          prevOrders.forEach(po => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'orders', po.id), { status: 'recopilando' }));
                      }
                  }
              } else {
                  // CASO STANDARD: 5 -> Retroceder a 4
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


  // Estado para controlar el modal de cambio de estado con notificación
    const [statusChangeModal, setStatusChangeModal] = useState({ 
        active: false, clubId: null, batchId: null, newStatus: '' 
    });

    const [supplierStockModal, setSupplierStockModal] = useState({ 
        active: false, batchId: null, orders: [], club: null
    });

    const initiateStatusChange = (clubId, batchId, newStatus) => {
    console.log("CLICK DETECTADO:", { clubId, batchId, newStatus }); // <--- Añade esto para comprobar
    setStatusChangeModal({ active: true, clubId, batchId, newStatus });
    };

    // --- FUNCIÓN PARA ENVIAR CORREOS DE PREVISIÓN (CON HISTORIAL DETALLADO) ---
    const handleSendSupplierEmails = async (targetSuppliers, batchId, club) => {
        if (!targetSuppliers.length) return;
        
        const batchWrite = writeBatch(db);
        let sentCount = 0;
        const nowStr = new Date().toISOString();
        
        // Obtenemos el historial actual del club para no perder datos al escribir
        // (Nota: club ya viene actualizado en las props si se usa onSnapshot en App)
        const currentBatchLog = (club.accountingLog && club.accountingLog[batchId]) ? club.accountingLog[batchId] : {};
        const currentEmailHistory = currentBatchLog.supplierEmails || {};

        const clubRef = doc(db, 'clubs', club.id);
        const updates = {};

        targetSuppliers.forEach(data => {
            if (!data.email) return;

            // 1. Preparar destinatarios y CC
            const ccEmails = (data.contacts || [])
                .filter(c => c.ccDefault === true && c.email)
                .map(c => c.email);

            const emailSubject = `FotoEsport Merch // ${club.name} // Pedido Global ${batchId}`;

            // 2. Crear documento de Email
            const mailRef = doc(collection(db, 'mail'));
            batchWrite.set(mailRef, {
                to: [data.email],
                cc: ccEmails, 
                message: {
                    subject: emailSubject,
                    html: generateStockEmailHTML(data.name, batchId, club.name, data.stockItems),
                    text: `Previsión de stock para ${club.name}. Lote ${batchId}.`
                },
                metadata: {
                    type: 'stock_forecast',
                    supplierId: data.id,
                    clubId: club.id,
                    batchId: batchId,
                    sentAt: nowStr,
                    snapshotQty: data.totalUnits // Guardamos cuántos había al enviar
                }
            });

            // 3. Preparar el nuevo objeto de historial
            const newHistoryEntry = {
                sentAt: nowStr,
                qty: data.totalUnits,     // Cantidad total en este momento
                refs: data.stockItems.length // Cantidad de productos distintos
            };

            // 4. Obtener historial previo de este proveedor
            let supplierHistory = currentEmailHistory[data.id];

            // Gestión de compatibilidad: si antes era un string (código antiguo), lo convertimos a array
            if (typeof supplierHistory === 'string') {
                supplierHistory = [{ sentAt: supplierHistory, qty: '?', refs: '?' }];
            } else if (!Array.isArray(supplierHistory)) {
                supplierHistory = [];
            }

            // Añadimos la nueva entrada
            const newHistoryList = [...supplierHistory, newHistoryEntry];
            
            // Preparamos el update usando notación de punto para este proveedor específico
            updates[`accountingLog.${batchId}.supplierEmails.${data.id}`] = newHistoryList;

            sentCount++;
        });

        if (sentCount > 0) {
            // Ejecutamos todos los updates del club en el batch
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


    // --- FUNCIÓN ACTUALIZADA: GUARDA HISTORIAL GLOBAL EN EL CLUB CON VALIDACIÓN DE TIPOS ---
    const executeBatchStatusUpdate = async (shouldNotify) => {
        const { clubId, batchId, newStatus } = statusChangeModal;
        if (!clubId || !batchId || !newStatus) return;

        // --- NUEVA VALIDACIÓN: IMPEDIR MÚLTIPLES LOTES ACTIVOS DEL MISMO TIPO ---
        if (newStatus === 'recopilando') {
            // 1. Determinar el tipo del lote que intentamos activar
            const targetIsError = String(batchId).startsWith('ERR');
            const targetIsIndividual = batchId === 'INDIVIDUAL';
            const targetIsGlobal = !targetIsError && !targetIsIndividual; // Lotes numéricos normales (1, 2, 3...)

            // 2. Buscar si ya existe algún pedido/lote en 'recopilando' que sea conflictivo
            const conflictOrder = orders.find(o => {
                // Solo revisar pedidos de este club
                if (o.clubId !== clubId) return false;
                // Solo nos importan los que están activos actualmente
                if (o.status !== 'recopilando') return false;
                // Ignoramos los pedidos que pertenecen al lote que estamos editando (no son conflicto)
                if (o.globalBatch === batchId) return false;

                // Determinar tipo del pedido encontrado
                const currentIsError = String(o.globalBatch).startsWith('ERR');
                const currentIsIndividual = o.globalBatch === 'INDIVIDUAL';
                const currentIsGlobal = !currentIsError && !currentIsIndividual;

                // 3. Verificar colisión de tipos
                if (targetIsError && currentIsError) return true;       // Conflicto: Dos lotes de errores abiertos
                if (targetIsIndividual && currentIsIndividual) return true; // Conflicto: Dos grupos individuales (raro)
                if (targetIsGlobal && currentIsGlobal) return true;     // Conflicto: Lote 1 abierto y abrimos Lote 2

                return false;
            });

            if (conflictOrder) {
                showNotification(`⛔ ACCIÓN DENEGADA: Ya tienes el Lote Global #${conflictOrder.globalBatch} en estado "Recopilando". Debes pasarlo a producción antes de abrir otro del mismo tipo.`, 'error');
                setStatusChangeModal({ ...statusChangeModal, active: false });
                return; // DETENEMOS LA EJECUCIÓN AQUÍ
            }
        }
        // --------------------------------------------------------------------------

        setStatusChangeModal({ ...statusChangeModal, active: false });

        // Filtramos los pedidos del lote
        const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId && o.status !== 'pendiente_validacion'); 
        
        // Obtenemos el nombre del club para el email
        const club = clubs.find(c => c.id === clubId);
        const clubName = club ? club.name : 'Tu Club';

        const batchWrite = writeBatch(db);
        let count = 0; 
        let notifiedCount = 0;
        const now = new Date().toISOString();
        
        // Estado anterior para el log
        const prevStatus = batchOrders[0]?.status || 'desconocido';

        // 1. Actualizar Pedidos Individuales y PREPARAR EMAILS
        batchOrders.forEach(order => {
            // Solo actualizamos si el estado es diferente
            if (order.status !== newStatus) { 
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                
                // Actualización del pedido
                const updates = { 
                    status: newStatus, 
                    visibleStatus: newStatus === 'recopilando' ? 'Recopilando' : newStatus === 'en_produccion' ? 'En Producción' : 'Entregado al Club'
                };
                
                // LOGICA DE EMAIL
                if (shouldNotify) {
                    const targetEmail = order.customer.email;
                    // CAMBIO 3: Verificar explícitamente si el cliente marcó la casilla
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
                            metadata: {
                                orderId: order.id,
                                clubId: clubId,
                                batchId: batchId,
                                timestamp: serverTimestamp()
                            }
                        });
                        updates.notificationLog = arrayUnion({ 
                            date: now, 
                            statusFrom: order.status,
                            statusTo: newStatus, 
                            method: 'email' 
                        });
                        notifiedCount++;
                    }
                }

                batchWrite.update(ref, updates);
                count++; 
            }
        });

        // 2. Guardar Historial GLOBAL en el Club
        const clubRefDoc = doc(db, 'clubs', clubId);
        const globalLogEntry = {
            batchId: batchId,
            date: now,
            statusFrom: prevStatus,
            statusTo: newStatus,
            notifiedCount: shouldNotify ? notifiedCount : 0,
            action: 'Cambio de Estado'
        };
        
        batchWrite.update(clubRefDoc, {
            batchHistory: arrayUnion(globalLogEntry)
        });

        // 3. Lógica de Tregua y Avance de Contadores
        if (newStatus === 'recopilando') {
            // Si activamos un lote, reseteamos el tiempo de reapertura (Tregua)
            batchWrite.update(clubRefDoc, { lastBatchReopenTime: Date.now() });
            
            // ADICIONAL: Si es un lote numérico, nos aseguramos de que el club apunte a este como activo
            // Esto corrige inconsistencias si se reabre un lote antiguo manualmente
            if (typeof batchId === 'number' && !String(batchId).startsWith('ERR')) {
                batchWrite.update(clubRefDoc, { activeGlobalOrderId: batchId });
            }
        }
        
        if (newStatus === 'en_produccion') { 
            // A) Lógica existente para Lotes Globales Numéricos (1, 2, 3...)
            if (club && club.activeGlobalOrderId === batchId) { 
                batchWrite.update(clubRefDoc, { activeGlobalOrderId: club.activeGlobalOrderId + 1 });
            } 

            // B) Lógica: Lotes de Errores (ERR-1, ERR-2...)
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
            if (showNotification) showNotification(msg, 'success');
        } catch (e) {
            console.error(e);
            if (showNotification) showNotification("Error al actualizar lote y enviar correos", "error");
        }
    };

    // Función para mostrar nombres bonitos de los estados
    const formatStatus = (status) => {
        switch(status) {
            case 'recopilando': return 'Recopilando';
            case 'en_produccion': return 'En Producción';
            case 'entregado_club': return 'Entregado';
            case 'pendiente_validacion': return 'Pendiente';
            case 'pagado': return 'Pagado';
            default: return status || '-';
        }
    };

    // --- NUEVO ESTADO: VISOR DE HISTORIAL DE LOTE ---
    const [batchHistoryModal, setBatchHistoryModal] = useState({ 
        active: false, 
        history: [], 
        batchId: null, 
        clubName: '' 
    });

    // EFECTO: AUTOMATIZACIÓN DE CIERRE (Con margen de 5 minutos + Avanzar Lote)
    useEffect(() => {
        const checkAndAutoCloseBatches = async () => {
            if (!orders || orders.length === 0 || !clubs || clubs.length === 0) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const club of clubs) {
                if (club.nextBatchDate) {
                    const closeDate = new Date(club.nextBatchDate);
                    
                    // Calculamos si estamos en "Tregua" (5 mins)
                    const lastReopen = club.lastBatchReopenTime || 0;
                    const minutesSinceReopen = (Date.now() - lastReopen) / 1000 / 60;
                    const inGracePeriod = minutesSinceReopen < 5; 

                    // Solo actuamos si la fecha venció Y NO estamos en tregua
                    if (closeDate < today && !inGracePeriod) {
                        
                        const activeBatchId = club.activeGlobalOrderId;
                        
                        // Buscamos pedidos del lote activo que sigan "recopilando"
                        const ordersToUpdate = orders.filter(o => 
                            o.clubId === club.id && 
                            o.globalBatch === activeBatchId && 
                            o.status === 'recopilando'
                        );

                        // Si hay pedidos o si simplemente queremos cerrar el lote vacío por fecha:
                        if (ordersToUpdate.length > 0) {
                            try {
                                const batch = writeBatch(db);
                                
                                // 1. Actualizar los pedidos a "En Producción"
                                ordersToUpdate.forEach(order => {
                                    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                                    batch.update(ref, { 
                                        status: 'en_produccion', 
                                        visibleStatus: 'En Producción (Automático)' 
                                    });
                                });

                                // 2. NUEVO: Cerrar Lote actual, abrir el siguiente y limpiar fecha
                                const clubRef = doc(db, 'clubs', club.id);
                                batch.update(clubRef, { 
                                    activeGlobalOrderId: activeBatchId + 1, // Abrir siguiente
                                    nextBatchDate: null // Quitar la fecha vencida
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
    }, [clubs, orders]);

  const [confirmation, setConfirmation] = useState(null); // Nuevo estado local para confirmaciones
  
  
// --- ESTADO MEJORADO PARA INCIDENCIAS ---
  const [incidentForm, setIncidentForm] = useState({ 
      active: false, 
      order: null,      // El pedido original completo
      item: null,       // El producto afectado
      qty: 1,           // Cantidad a reponer
      cost: 0,          // Coste de reimpresión
      reason: '', 
      responsibility: 'internal', // 'internal' o 'club'
      internalOrigin: 'us',
      recharge: false,  // Si es fallo del club, ¿se cobra?
      targetBatch: ''   // A qué lote va la reposición
  });

  // --- FUNCIÓN PARA ABRIR EL MODAL ---
    const handleOpenIncident = (order, item) => {
        // Calculamos el coste inicial (1 unidad * coste unitario del producto)
        const unitCost = item.cost || 0; 

        setIncidentForm({
            active: true,
            order,
            item,
            qty: 1,
            cost: unitCost, // <--- ASIGNACIÓN AUTOMÁTICA INICIAL
            reason: '',
            responsibility: 'internal',
            internalOrigin: 'us',
            recharge: false,
            targetBatch: order.globalBatch === 'INDIVIDUAL' ? 'INDIVIDUAL' : (selectedClub?.activeGlobalOrderId || '')
        });
    };
  const [revertModal, setRevertModal] = useState({ active: false, clubId: null, currentBatchId: null, ordersCount: 0 });



  const selectedClub = clubs.find(c => c.id === selectedClubId) || clubs[0];

  const {
    financialOrders, visibleOrders, statsData, errorStats,
    accountingData, globalAccountingStats, totalRevenue,
    totalIncidentCosts, netProfit, averageTicket
  } = useDashboardStats({
    orders, seasons, clubs, financialConfig,
    financeSeasonId, statsClubFilter, filterClubId
  });


// --- FUNCIÓN: ELIMINAR PEDIDO (Corregida) ---
  const handleDeleteOrder = (orderId) => {
      setConfirmation({
          msg: "⚠️ ¿Estás seguro de ELIMINAR este pedido definitivamente?",
          onConfirm: async () => {
              try {
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
                  showNotification('Pedido eliminado correctamente');
              } catch (e) {
                  showNotification('Error al eliminar pedido', 'error');
              }
          }
      });
  };

  // --- FUNCIÓN: ELIMINAR LOTE GLOBAL (Corregida) ---
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
              } catch (e) {
                  showNotification('Error al eliminar el lote', 'error');
              }
          }
      });
  };

    // --- FUNCIÓN: PREPARAR Y GUARDAR EDICIÓN (Con Resumen) ---
  const handlePreSaveOrder = () => {
      const { original, modified } = editOrderModal;
      if (!original || !modified) return;

      const changes = [];

      // 1. Detectar cambios en cliente
      if(original.customer.name !== modified.customer.name) 
          changes.push(`👤 Cliente: "${original.customer.name}" ➝ "${modified.customer.name}"`);
      if(original.customer.email !== modified.customer.email) 
          changes.push(`📧 Email: "${original.customer.email}" ➝ "${modified.customer.email}"`);

      // 2. Detectar cambios en productos
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

      // 3. Pedir Confirmación con Resumen
      setConfirmation({
          title: "Confirmar Modificaciones",
          msg: "Estás a punto de aplicar los siguientes cambios:",
          details: changes, // Pasamos la lista de cambios
          onConfirm: async () => {
              try {
                  // Recalcular total
                  const newTotal = modified.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                  
                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', modified.id), {
                      customer: modified.customer,
                      items: modified.items,
                      total: newTotal
                  });
                  showNotification('Cambios aplicados correctamente');
                  setEditOrderModal({ active: false, original: null, modified: null });
              } catch (e) {
                  showNotification('Error al guardar cambios', 'error');
              }
          }
      });
  };

// --- FUNCIÓN: MOVER LOTE DE TEMPORADA ---
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
      } catch (e) {
          showNotification('Error al mover el lote', 'error');
      }
  };

  // --- FUNCIÓN: GUARDAR EDICIÓN DE PEDIDO ---
  const handleSaveOrderEdit = async () => {
      if (!editOrderModal.order) return;
      try {
          const o = editOrderModal.order;
          // Recalcular total por si se cambiaron precios
          const newTotal = o.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
          
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), {
              customer: o.customer,
              items: o.items,
              total: newTotal
          });
          showNotification('Pedido modificado correctamente');
          setEditOrderModal({ active: false, order: null });
      } catch (e) {
          showNotification('Error al guardar cambios', 'error');
      }
  };

// --- FUNCIÓN PARA EDITAR LOTE ACTIVO (CON REACTIVACIÓN SEGURA) ---
  const saveActiveBatchManually = () => {
      if (!selectedClubId) return;
      
      const targetBatchId = parseInt(tempBatchValue);
      if (isNaN(targetBatchId) || targetBatchId < 1) {
          showNotification('Número de lote inválido', 'error');
          return;
      }

      // 1. Buscamos si existen pedidos en ese lote destino
      const batchOrders = orders.filter(o => 
          o.clubId === selectedClubId && 
          o.globalBatch === targetBatchId &&
          o.status !== 'pendiente_validacion'
      );

      // 2. Comprobamos si el lote está "cerrado" (tiene pedidos que no están recopilando)
      const needsReopening = batchOrders.some(o => o.status !== 'recopilando');

      const performUpdate = async (shouldReopenOrders) => {
          try {
              // A. Si hay que reactivar, actualizamos los pedidos en Firebase
              if (shouldReopenOrders && batchOrders.length > 0) {
                  const batch = writeBatch(db);
                  batchOrders.forEach(order => {
                      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                      // Forzamos estado 'recopilando'
                      batch.update(ref, { status: 'recopilando', visibleStatus: 'Recopilando (Reabierto)' });
                  });
                  await batch.commit();
              }

              // B. Actualizamos el puntero del Club (Estado Local)
              const club = clubs.find(c => c.id === selectedClubId);
              updateClub({ ...club, activeGlobalOrderId: targetBatchId });
              
              setIsEditingActiveBatch(false);
              showNotification(shouldReopenOrders 
                  ? `Lote #${targetBatchId} reactivado y establecido como actual.` 
                  : `Lote activo actualizado a #${targetBatchId}`
              );
          } catch (e) {
              console.error(e);
              showNotification('Error al actualizar el lote', 'error');
          }
      };

      // 3. Lógica de Confirmación
      if (needsReopening) {
          setConfirmation({
              title: "⚠️ ¿Reactivar Lote Cerrado?",
              msg: `El Lote Global #${targetBatchId} contiene pedidos que ya están EN PRODUCCIÓN o ENTREGADOS.\n\nSi lo seleccionas como ACTIVO, todos sus pedidos volverán al estado "RECOPILANDO" para aceptar cambios o nuevos añadidos.\n\n¿Estás seguro?`,
              onConfirm: () => performUpdate(true)
          });
      } else {
          // Si el lote está vacío o ya está recopilando, cambiamos directamente
          performUpdate(false);
      }
  };
  
// --- LÓGICA DE CREACIÓN DE REPOSICIÓN (V2 - Soporte Individual) ---
    const submitIncident = async () => {
        if (!incidentForm.item || !incidentForm.order) return;

        const { order, item, qty, cost, reason, responsibility, internalOrigin, recharge, targetBatch } = incidentForm;
        
        // Obtener el club actualizado para saber el ID de error actual
        const currentClub = clubs.find(c => c.id === order.clubId);
        
        // LÓGICA DE LOTE DE ERRORES
        let batchIdToSave = targetBatch;
        if (targetBatch === 'ERRORS') {
            const currentClub = clubs.find(c => c.id === order.clubId);
            const errorId = currentClub?.activeErrorBatchId || 1; 
            batchIdToSave = `ERR-${errorId}`; // <--- ESTO ES LA CLAVE
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
                customer: { 
                    name: `${order.customer.name} (REPOSICIÓN)`, 
                    email: order.customer.email, 
                    phone: order.customer.phone 
                },
                items: [{
                    ...item,
                    quantity: parseInt(qty),
                    price: finalPrice,
                    cost: finalCost,
                    name: `${item.name} [REP]`
                }],
                total: totalOrder,
                // Si es un lote de errores, lo ponemos en "recopilando" para que salga en el dashboard
                status: targetBatch === 'INDIVIDUAL' ? 'en_produccion' : 'recopilando',
                visibleStatus: 'Reposición / Incidencia',
                type: 'replacement',
                paymentMethod: 'incident', 
                globalBatch: batchIdToSave,
                relatedOrderId: order.id,
                incidentDetails: {
                    originalItemId: item.cartId,
                    reason: reason,
                    responsibility: responsibility,
                    internalOrigin: responsibility === 'internal' ? internalOrigin : null
                },
                incidents: []
            });

            // ... (resto del código igual: updateDoc incidents array, showNotification, etc.)
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

// --- DENTRO DE AdminDashboard (Sustituir función existente) ---

  const toggleIncidentResolved = (order, incidentId) => {
      const updatedIncidents = order.incidents.map(inc => 
          inc.id === incidentId ? { ...inc, resolved: !inc.resolved } : inc
      );
      updateIncidentStatus(order.id, updatedIncidents);
  };

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
          console.error("Error processing revert:", e);
          alert("Error al procesar la acción. Inténtalo de nuevo.");
      }
  };

// --- FUNCIÓN MODIFICADA: Ahora guarda FECHA y maneja el estado ---
  const toggleBatchPaymentStatus = (club, batchId, field) => {
      const currentLog = club.accountingLog || {};
      const batchLog = currentLog[batchId] || { 
          supplierPaid: false, clubPaid: false, commercialPaid: false, cashCollected: false 
      };
      
      const currentValue = batchLog[field];
      const newValue = !currentValue;
      
      // Definimos el nombre del campo de fecha (ej: supplierPaid -> supplierPaidDate)
      const dateField = `${field}Date`;

      const newBatchLog = { 
          ...batchLog, 
          [field]: newValue,
          // Si se marca como pagado/cobrado, guardamos fecha ISO. Si se desmarca, null.
          [dateField]: newValue ? new Date().toISOString() : null 
      };

      updateClub({
          ...club,
          accountingLog: {
              ...currentLog,
              [batchId]: newBatchLog
          }
      });
  };

  // --- NUEVA FUNCIÓN: Pide confirmación antes de cambiar el estado ---
  const handlePaymentChange = (club, batchId, field, currentStatus) => {
      const fieldLabels = {
          'cashCollected': 'Recogida de Efectivo',
          'supplierPaid': 'Pago a Proveedor',
          'commercialPaid': 'Pago a Comercial',
          'clubPaid': 'Pago al Club'
      };

      const action = currentStatus ? 'marcar como PENDIENTE' : 'marcar como COMPLETADO';
      const label = fieldLabels[field] || field;

      setConfirmation({
          title: "Confirmar Movimiento Contable",
          msg: `Vas a ${action} el concepto:\n\n👉 ${label}\nClub: ${club.name}\nLote: #${batchId}\n\n¿Confirmar cambio?`,
          onConfirm: () => toggleBatchPaymentStatus(club, batchId, field)
      });
  };

  // --- Función para guardar ajustes numéricos (Deudas/Cambios) ---
  const updateBatchValue = (club, batchId, field, value) => {
      const currentLog = club.accountingLog || {};
      const batchLog = currentLog[batchId] || {};
      
      updateClub({
          ...club,
          accountingLog: {
              ...currentLog,
              [batchId]: { ...batchLog, [field]: parseFloat(value) || 0 }
          }
      });
  };

  // ---------------------------------------------------------
  // NUEVO: LÓGICA DE GESTIÓN DE DATOS Y EXCEL
  // ---------------------------------------------------------
  
  // Estado local para el selector de temporada en esta sección
  const [dataManageSeasonId, setDataManageSeasonId] = useState(seasons[seasons.length - 1]?.id || '');

// --- FUNCIONES AUXILIARES PARA EXCEL ---

  const escapeXml = (unsafe) => {
      return unsafe ? unsafe.toString().replace(/[<>&'"]/g, c => {
          switch (c) { case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;'; case '\'': return '&apos;'; case '"': return '&quot;'; }
      }) : '';
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

  return (
    <div>
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b bg-white p-2 rounded-lg shadow-sm">
        {[
            {id: 'management', label: 'Gestión', icon: LayoutDashboard},
            {id: 'accounting', label: 'Pedidos', icon: Package},
            {id: 'special-orders', label: 'Pedidos Especiales', icon: Briefcase},
            {id: 'accounting-control', label: 'Contabilidad', icon: Banknote},
            {id: 'suppliers', label: 'Proveedores', icon: Factory},
            {id: 'seasons', label: 'Temporadas', icon: Calendar},
            {id: 'files', label: 'Archivos', icon: Folder},
            // AQUI AÑADIMOS LA PROPIEDAD 'badge' CON EL CONTADOR
            {id: 'incidents', label: 'Incidencias', icon: AlertTriangle, badge: pendingCount},
            {id: 'finances', label: 'Estadísticas', icon: BarChart3},
        ].map(item => (
            <button 
                key={item.id} 
                onClick={() => setTab(item.id)} 
                // AÑADIMOS 'relative' PARA PODER POSICIONAR EL GLOBO
                className={`relative px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                    tab === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <item.icon className="w-4 h-4" /> 
                {item.label}

                {/* LÓGICA DEL GLOBO ROJO (BADGE) */}
                {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                        {item.badge}
                    </span>
                )}
            </button>
        ))}
        </div>

{tab === 'management' && (
    <ManagementTab 
        campaignConfig={campaignConfig} setCampaignConfig={setCampaignConfig}
        storeConfig={storeConfig} setStoreConfig={setStoreConfig}
        financialConfig={financialConfig} setFinancialConfig={setFinancialConfig} updateFinancialConfig={updateFinancialConfig}
        products={products} addProduct={addProduct} updateProduct={updateProduct} deleteProduct={deleteProduct} suppliers={suppliers}
        clubs={clubs} createClub={createClub} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock}
        showNotification={showNotification}
    />
)}

{tab === 'suppliers' && (
                <div className="animate-fade-in-up">
                    <SupplierManager 
                        suppliers={suppliers}
                        products={products}
                        createSupplier={createSupplier}
                        updateSupplier={updateSupplier}
                        deleteSupplier={deleteSupplier}
                        updateProductCostBatch={updateProductCostBatch}
                    />
                </div>
            )}


<RevertBatchModal
    active={revertModal.active}
    currentBatchId={revertModal.currentBatchId}
    ordersCount={revertModal.ordersCount}
    onClose={() => setRevertModal({ active: false, clubId: null, currentBatchId: null, ordersCount: 0 })}
    onProcess={processRevertBatch}
/>

<MoveSeasonModal
    active={moveSeasonModal.active}
    target={moveSeasonModal.target}
    seasons={seasons}
    onClose={() => setMoveSeasonModal({ active: false, target: null })}
    onSubmit={handleMoveBatchSeasonSubmit}
/>

      {/* --- MODAL CONFIRMACIÓN (LOCAL DEL DASHBOARD) --- */}
      {confirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] backdrop-blur-sm animate-fade-in">
              <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-gray-100">
                  <div className="flex items-center gap-2 mb-4 text-gray-800">
                      <AlertCircle className="w-6 h-6 text-emerald-600"/>
                      <h3 className="font-bold text-lg">{confirmation.title || 'Confirmar Acción'}</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-4 whitespace-pre-line">{confirmation.msg}</p>
                  
                  {/* Lista de detalles (Resumen de cambios) */}
                  {confirmation.details && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-6 max-h-40 overflow-y-auto text-sm text-emerald-900 space-y-1">
                          {confirmation.details.map((line, i) => (
                              <div key={i} className="font-mono">{line}</div>
                          ))}
                      </div>
                  )}

                  <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={() => setConfirmation(null)}>Cancelar</Button>
                      <Button variant="danger" onClick={() => { confirmation.onConfirm(); setConfirmation(null); }}>
                          Confirmar
                      </Button>
                  </div>
              </div>
          </div>
      )}


    {/* MODAL DE STOCK PROVEEDORES */}
    <SupplierStockModal 
        active={supplierStockModal.active}
        onClose={() => setSupplierStockModal({ ...supplierStockModal, active: false })}
        batchId={supplierStockModal.batchId}
        orders={supplierStockModal.orders}
        club={supplierStockModal.club}
        suppliers={suppliers}
        products={products}
        onSend={handleSendSupplierEmails}
    />

      
{tab === 'accounting' && (
    <AccountingTab
        clubs={clubs}
        orders={orders}
        products={products}
        accountingData={accountingData}
        filterClubId={filterClubId}
        setFilterClubId={setFilterClubId}
        financialConfig={financialConfig}
        showNotification={showNotification}
        setConfirmation={setConfirmation}
        setSupplierStockModal={setSupplierStockModal}
        initiateStatusChange={initiateStatusChange}
        setBatchHistoryModal={setBatchHistoryModal}
        openManageBatchModal={openManageBatchModal}
        updateOrderStatus={updateOrderStatus}
        handleOpenIncident={handleOpenIncident}
        setEditOrderModal={setEditOrderModal}
        handleDeleteOrder={handleDeleteOrder}
    />
)}


{tab === 'accounting-control' && (
    <AccountingControlTab
        clubs={clubs}
        seasons={seasons}
        filterClubId={filterClubId}
        setFilterClubId={setFilterClubId}
        financeSeasonId={financeSeasonId}
        setFinanceSeasonId={setFinanceSeasonId}
        globalAccountingStats={globalAccountingStats}
        accountingData={accountingData}
        financialConfig={financialConfig}
        handlePaymentChange={handlePaymentChange}
        updateBatchValue={updateBatchValue}
    />
)}

{tab === 'special-orders' && (
    <SpecialOrdersTab 
        clubs={clubs}
        specialOrders={financialOrders.filter(o => o.type === 'special')}
        createSpecialOrder={createSpecialOrder}
    />
)}

{tab === 'seasons' && (
    <SeasonsTab 
        seasons={seasons}
        addSeason={addSeason}
        toggleSeasonVisibility={toggleSeasonVisibility}
        deleteSeason={deleteSeason}
        setConfirmation={setConfirmation}
        handleExportSeasonExcel={(seasonId) => generateSeasonExcel(seasonId, seasons, orders, clubs, financialConfig, showNotification)}
        handleDeleteSeasonData={handleDeleteSeasonData}
    />
)}

      {tab === 'files' && (
          <div className="animate-fade-in-up h-full">
              <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      <Folder className="w-6 h-6 text-emerald-600"/> 
                      Gestión de Archivos en la Nube
                  </h3>
              </div>
              
              {/* AQUÍ LLAMAMOS AL NUEVO COMPONENTE */}
              <FilesManager clubs={clubs} />
          </div>
      )}

{tab === 'incidents' && (
    <IncidentsTab incidents={incidents} />
)}

{tab === 'finances' && (
    <FinancesTab
        financeSeasonId={financeSeasonId}
        setFinanceSeasonId={setFinanceSeasonId}
        statsClubFilter={statsClubFilter}
        setStatsClubFilter={setStatsClubFilter}
        seasons={seasons}
        clubs={clubs}
        totalRevenue={totalRevenue}
        netProfit={netProfit}
        financialOrdersCount={financialOrders.length}
        averageTicket={averageTicket}
        statsData={statsData}
        errorStats={errorStats}
    />
)}

{/* MODALES GLOBALES EXTRAÍDOS */}
    <ManageBatchModal 
        manageBatchModal={manageBatchModal} 
        setManageBatchModal={setManageBatchModal} 
        executeBatchManagement={executeBatchManagement} 
    />
    
    <IncidentModal 
        incidentForm={incidentForm} 
        setIncidentForm={setIncidentForm} 
        submitIncident={submitIncident} 
        orders={orders} 
        clubs={clubs} 
    />

    <EditOrderModal 
        editOrderModal={editOrderModal} 
        setEditOrderModal={setEditOrderModal} 
        handlePreSaveOrder={handlePreSaveOrder} 
    />

<BatchHistoryModal 
        batchHistoryModal={batchHistoryModal} 
        setBatchHistoryModal={setBatchHistoryModal} 
    />
    
    <StatusChangeModal 
        statusChangeModal={statusChangeModal} 
        setStatusChangeModal={setStatusChangeModal} 
        executeBatchStatusUpdate={executeBatchStatusUpdate} 
    />

    </div>
  );
}