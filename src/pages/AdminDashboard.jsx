import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Package, Briefcase, Banknote, Factory, Calendar, Folder, AlertTriangle,  
  Mail,
  ArrowRight, 
  MoveLeft,
  Trash2, Image as ImageIcon, X, Check, AlertCircle, BarChart3,
} from 'lucide-react';

import { collection, doc, updateDoc, writeBatch, arrayUnion, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import ExcelJS from 'exceljs';

import { db } from '../config/firebase';
import { appId } from '../config/constants';
import { Button } from '../components/ui/Button';
import { generateStockEmailHTML, generateEmailHTML } from '../utils/emailTemplates';

import { FilesManager } from '../components/admin/FilesManager';
import { SupplierManager } from '../components/admin/SupplierManager';

// MODALS
import { SupplierStockModal } from '../components/admin/modals/SupplierStockModal';
import { ManageBatchModal } from '../components/admin/modals/ManageBatchModal';
import { IncidentModal } from '../components/admin/modals/IncidentModal';
import { EditOrderModal } from '../components/admin/modals/EditOrderModal';
import { BatchHistoryModal } from '../components/admin/modals/BatchHistoryModal';
import { StatusChangeModal } from '../components/admin/modals/StatusChangeModal';

// TABS (PESTAÑAS)
import { ManagementTab } from '../components/admin/tabs/ManagementTab';
import { AccountingTab } from '../components/admin/tabs/AccountingTab';
import { AccountingControlTab } from '../components/admin/tabs/AccountingControlTab';
import { SpecialOrdersTab } from '../components/admin/tabs/SpecialOrdersTab';
import { SeasonsTab } from '../components/admin/tabs/SeasonsTab';
import { IncidentsTab } from '../components/admin/tabs/IncidentsTab';
import { FinancesTab } from '../components/admin/tabs/FinancesTab';

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

// --- FILTRADO POR TEMPORADA ---
    const financialOrders = useMemo(() => {
      // 1. LIMPIEZA GLOBAL: Excluir Errores, Incidencias y Reposiciones de todas las estadísticas
      const cleanOrders = orders.filter(o => 
          o.type !== 'replacement' && 
          o.paymentMethod !== 'incident' && 
          !String(o.globalBatch).startsWith('ERR')
      );

      if (financeSeasonId === 'all') return cleanOrders;

      const season = seasons.find(s => s.id === financeSeasonId);
      if (!season) return cleanOrders;
      
      const start = new Date(season.startDate).getTime();
      const end = new Date(season.endDate).getTime();
      
      return cleanOrders.filter(o => {
          // 2. Lógica de Temporada
          if (o.manualSeasonId) return o.manualSeasonId === financeSeasonId;
          
          // Si tiene temporada manual asignada a OTRA temporada, no debe salir aquí
          if (o.manualSeasonId && o.manualSeasonId !== financeSeasonId) return false;
          
          // Si no hay manual, usamos la fecha
          const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
          return d >= start && d <= end;
      });
  }, [orders, financeSeasonId, seasons]);

  // --- NUEVO: LISTA COMPLETA PARA GESTIÓN (INCLUYE ERRORES Y MANUALES) ---
    const visibleOrders = useMemo(() => {
        // Usamos 'orders' directamente para NO filtrar errores/reposiciones
        let list = orders;

        // Aplicamos SOLO el filtro de Temporada
        if (financeSeasonId !== 'all') {
            const season = seasons.find(s => s.id === financeSeasonId);
            if (season) {
                const start = new Date(season.startDate).getTime();
                const end = new Date(season.endDate).getTime();
                list = list.filter(o => {
                    if (o.manualSeasonId) return o.manualSeasonId === financeSeasonId;
                    if (o.manualSeasonId && o.manualSeasonId !== financeSeasonId) return false;
                    
                    const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
                    return d >= start && d <= end;
                });
            }
        }
        return list;
    }, [orders, financeSeasonId, seasons]);

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
  

const statsData = useMemo(() => {
      // 1. Filtrar pedidos por temporada y club
      let filteredOrders = financialOrders;
      if (statsClubFilter !== 'all') {
          filteredOrders = filteredOrders.filter(o => o.clubId === statsClubFilter);
      }

      const categorySales = {}; 
      const productSales = {};  
      const monthlySales = {};  
      const paymentStats = {}; 

      filteredOrders.forEach(order => {
          // --- FILTRO DE SEGURIDAD: EXCLUIR ERRORES Y REPOSICIONES DE LAS ESTADÍSTICAS DE PRODUCTO ---
          const isIncident = order.type === 'replacement' || order.paymentMethod === 'incident' || String(order.globalBatch).startsWith('ERR');

          // A. Métodos de Pago (SOLO VENTAS REALES)
          if (!isIncident) {
              let pMethod = order.paymentMethod || 'card';
              
              // AGRUPACIÓN SOLICITADA: Transferencia y Bizum juntos
              if (pMethod === 'bizum' || pMethod === 'transfer') {
                  pMethod = 'transfer_bizum'; 
              }

              if (!paymentStats[pMethod]) paymentStats[pMethod] = { amount: 0, count: 0 };
              paymentStats[pMethod].amount += order.total;
              paymentStats[pMethod].count += 1;
          }

          // B. Acumular por Mes (SOLO VENTAS REALES)
          if (!isIncident) {
              const date = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
              const monthKey = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
              const sortKey = date.getFullYear() * 100 + date.getMonth();
              
              if (!monthlySales[monthKey]) monthlySales[monthKey] = { total: 0, sort: sortKey };
              monthlySales[monthKey].total += order.total;
          }

          // C. Items del pedido (PRODUCTOS Y CATEGORÍAS)
          if (!isIncident) { // NO CONTABILIZAR PRODUCTOS SI ES REPOSICIÓN (Evita duplicados)
              order.items.forEach(item => {
                  const qty = item.quantity || 1;
                  const subtotal = qty * item.price;

                  // --- Categoría Equipo (CORRECCIÓN: FILTRAR GENERAL) ---
                  let teamCat = item.category;
                  // Si no tiene categoría o es 'General' o 'Servicios', NO lo mostramos en el gráfico de equipos
                  if (teamCat && teamCat !== 'General' && teamCat !== 'Servicios') {
                      const normCat = teamCat.trim().replace(/\s+[A-Z0-9]$/i, ''); 
                      
                      if (!categorySales[normCat]) {
                          categorySales[normCat] = { total: 0, subCats: new Set() };
                      }
                      
                      categorySales[normCat].total += subtotal;
                      categorySales[normCat].subCats.add(`${order.clubId}-${teamCat}`);
                  }

                  // --- Producto Individual ---
                    // Nos aseguramos de no contar variantes de error si se colaron
                    if (!item.name.includes('[REP]')) {
                        // AÑADIDO: Inicializamos cost a 0
                        if (!productSales[item.name]) productSales[item.name] = { qty: 0, total: 0, cost: 0 };
                        productSales[item.name].qty += qty;
                        productSales[item.name].total += subtotal;
                        // AÑADIDO: Acumulamos el coste real (coste unitario * cantidad)
                        productSales[item.name].cost += (item.cost || 0) * qty;
                    }
              });
          }
      });

      // Procesar Arrays para Gráficos
      const sortedCategories = Object.entries(categorySales)
          .map(([name, data]) => ({ 
              name, 
              value: data.total,
              count: data.subCats.size 
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

        // AÑADIDO: Creamos una lista con TODOS los productos y calculamos su MARGEN
        const allProductsStats = Object.entries(productSales)
            .map(([name, data]) => ({ 
                name, 
                ...data,
                margin: data.total - data.cost // Margen = Ventas - Coste
            }))
            .sort((a, b) => b.margin - a.margin); // Ordenamos por margen (de mayor a menor)

        // Mantenemos sortedProducts para el widget de "Top 5" original
        const sortedProducts = allProductsStats.slice(0, 5);

      // Ordenar Métodos de Pago
      const sortedPaymentMethods = Object.entries(paymentStats)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => {
              // Orden personalizado: Tarjeta, Efectivo, Transferencia
              const priorities = { card: 1, cash: 2, transfer_bizum: 3 };
              return (priorities[a.name] || 99) - (priorities[b.name] || 99);
          });

      const sortedMonths = Object.entries(monthlySales)
          .map(([name, data]) => ({ name, value: data.total, sort: data.sort }))
          .sort((a, b) => a.sort - b.sort);

      // --- LOGICA REPORTE FINANCIERO (Separación por Temporada o Club) ---
      const isComparisonMode = statsClubFilter !== 'all' && financeSeasonId === 'all';
      
      let reportRows = [];
      
      // Función Helper para calcular métricas de un set de pedidos y un club
      const calculateMetrics = (ordersList, clubObj, rowId, rowName) => {
          const validOrders = ordersList.filter(o => 
            o.type !== 'replacement' && 
            o.paymentMethod !== 'incident' &&
            !String(o.globalBatch).startsWith('ERR')
          );
          
          let grossSales = 0;
          let supplierCost = 0;
          let gatewayCost = 0;
          
          validOrders.forEach(order => {
             grossSales += order.total;
             const orderCost = order.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 1)), 0);
             supplierCost += orderCost;
             
             if ((order.paymentMethod || 'card') === 'card') {
                 const fee = (order.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee;
                 gatewayCost += fee;
             }
          });
          
          const currentClubCommission = clubObj && clubObj.commission !== undefined ? clubObj.commission : 0.12;
          const commClub = grossSales * currentClubCommission;
          
          const commercialBase = grossSales - supplierCost - commClub - gatewayCost;
          const commCommercial = commercialBase > 0 ? (commercialBase * financialConfig.commercialCommissionPct) : 0;
          
          const netIncome = grossSales - supplierCost - commClub - commCommercial - gatewayCost;
          
          return {
              id: rowId,
              name: rowName,
              ordersCount: validOrders.length,
              grossSales,
              supplierCost,
              commClub,
              commCommercial,
              gatewayCost,
              netIncome
          };
      };

      if (isComparisonMode) {
          // MODO COMPARACIÓN: Filas son TEMPORADAS para el club seleccionado
          const selectedClub = clubs.find(c => c.id === statsClubFilter);
          
          reportRows = seasons.map(season => {
              const start = new Date(season.startDate).getTime();
              const end = new Date(season.endDate).getTime();
              
              // Filtramos de financialOrders (que tiene TODO si financeSeasonId es all)
              const seasonOrders = financialOrders.filter(o => {
                  if (o.clubId !== statsClubFilter) return false;
                  
                  // Lógica Temporada
                  if (o.manualSeasonId) return o.manualSeasonId === season.id;
                  if (o.manualSeasonId && o.manualSeasonId !== season.id) return false; // Pertenece a otra
                  
                  const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
                  return d >= start && d <= end;
              });
              
              return calculateMetrics(seasonOrders, selectedClub, season.id, season.name);
          }).sort((a,b) => b.grossSales - a.grossSales); 
          
      } else {
          // MODO STANDARD: Filas son CLUBES (Filtrados o Todos)
          const relevantClubs = statsClubFilter === 'all' ? clubs : clubs.filter(c => c.id === statsClubFilter);
          
          reportRows = relevantClubs.map(club => {
              // filteredOrders ya está filtrado por club si aplica, pero aquí iteramos clubs.
              // Usamos financialOrders que ya tiene el filtro de temporada (si aplica)
              const clubOrders = financialOrders.filter(o => o.clubId === club.id);
              
              return calculateMetrics(clubOrders, club, club.id, club.name);
          }).sort((a, b) => b.grossSales - a.grossSales);
      }

      return { sortedCategories, sortedProducts, sortedPaymentMethods, sortedMonths, financialReport: reportRows, allProductsStats };
  }, [financialOrders, statsClubFilter, clubs, financialConfig, products, seasons, financeSeasonId]);

// --- LÓGICA DE ESTADÍSTICAS DE ERRORES (NUEVO) ---
    const errorStats = useMemo(() => {
      // 1. Filtrar pedidos por temporada y club
      let relevantOrders = orders;
      
      // Filtro Temporada
      if (financeSeasonId !== 'all') {
          const season = seasons.find(s => s.id === financeSeasonId);
          if (season) {
              const start = new Date(season.startDate).getTime();
              const end = new Date(season.endDate).getTime();
              relevantOrders = relevantOrders.filter(o => {
                  if (o.manualSeasonId) return o.manualSeasonId === financeSeasonId;
                  const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
                  return d >= start && d <= end;
              });
          }
      }

      // Filtro Club
      if (statsClubFilter !== 'all') {
          relevantOrders = relevantOrders.filter(o => o.clubId === statsClubFilter);
      }

      // 2. Separar pedidos
      const normalOrders = relevantOrders.filter(o => o.type !== 'replacement' && o.paymentMethod !== 'incident' && !String(o.globalBatch).startsWith('ERR'));
      const incidentOrders = relevantOrders.filter(o => o.type === 'replacement' || o.paymentMethod === 'incident' || String(o.globalBatch).startsWith('ERR'));

      // 3. Cálculos Métricas
      const totalOrdersCount = normalOrders.length + incidentOrders.length;
      const errorCount = incidentOrders.length;
      const errorRate = totalOrdersCount > 0 ? (errorCount / totalOrdersCount) * 100 : 0;

      const responsibility = { internal: 0, club: 0, supplier: 0 };
      const costAssumed = { internal: 0, club: 0, supplier: 0 };
      const productErrors = {};
      

      incidentOrders.forEach(ord => {
          const details = ord.incidentDetails || {};
          const resp = details.responsibility || 'internal';
          
          // CORRECCIÓN 1: Calcular coste total multiplicando por cantidad
          const cost = ord.items.reduce((sum, i) => sum + ((i.cost || 0) * (i.quantity || 1)), 0);
          
          // Precio de venta total (ya suele incluir cantidades en ord.total)
          const price = ord.total;

          // A) Conteo de Responsabilidad
          if (responsibility[resp] !== undefined) responsibility[resp]++;
          else responsibility.internal++;

          // B) Costes Asumidos
          if (resp === 'club') {
              costAssumed.club += price;
          } else if (resp === 'supplier') {
              costAssumed.supplier += cost; 
          } else {
              costAssumed.internal += cost;
          }

          // C) Productos con fallo
          ord.items.forEach(item => {
              const name = item.name.replace(/\[REP\]/g, '').trim();
              // CORRECCIÓN 2: Sumar la cantidad real del producto fallido
              const qty = item.quantity || 1;
              productErrors[name] = (productErrors[name] || 0) + qty;
          });
      });

      // Ordenar productos con más fallos
      const sortedProductErrors = Object.entries(productErrors)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

      return {
          totalOrdersCount,
          errorCount,
          errorRate,
          responsibility,
          costAssumed,
          sortedProductErrors
      };
  }, [orders, financeSeasonId, statsClubFilter, seasons]);

// Lógica de agrupación de pedidos (V4 - Con Lote Activo siempre visible)
    const accountingData = useMemo(() => {
        const visibleClubs = filterClubId === 'all' ? clubs : clubs.filter(c => c.id === filterClubId);

        return visibleClubs.map(club => {
            // USAMOS visibleOrders PARA QUE APAREZCAN LOS ERRORES Y MANUALES
            const clubOrders = visibleOrders.filter(o => o.clubId === club.id); 
            
            const batches = {};
            
            clubOrders.forEach(order => {
                let batchId = order.globalBatch || 1;
                // Asegurar que string ids se traten como strings
                if (typeof batchId === 'string' && batchId.startsWith('ERR')) {
                    // Mantener batchId tal cual (ej: "ERR-1")
                } else {
                    if (order.type === 'special') batchId = 'SPECIAL';
                    if (batchId === 'INDIVIDUAL') batchId = 'INDIVIDUAL';
                }
                
                if (!batches[batchId]) batches[batchId] = [];
                batches[batchId].push(order);
            });

            // Asegurar Lote Activo Standard
            if (club.activeGlobalOrderId && !batches[club.activeGlobalOrderId]) {
                batches[club.activeGlobalOrderId] = [];
            }

            // Asegurar Lote Activo de Errores (para que salga aunque esté vacío)
            const activeErr = `ERR-${club.activeErrorBatchId || 1}`;
            if (!batches[activeErr]) batches[activeErr] = [];

            const sortedBatches = Object.entries(batches)
                .map(([id, orders]) => {
                    // Detectar si es un lote de errores (string que empieza por ERR)
                    const isError = typeof id === 'string' && id.startsWith('ERR');
                    // Si es SPECIAL, INDIVIDUAL o ERROR, mantenemos el ID como string. Si no, número.
                    return { id: (id === 'SPECIAL' || id === 'INDIVIDUAL' || isError) ? id : parseInt(id), orders, isError };
                })
                .sort((a, b) => {
                    // 1. Especiales primero
                    if (a.id === 'SPECIAL') return -1;
                    if (b.id === 'SPECIAL') return 1;
                    
                    // 2. Errores después (Ordenados del más nuevo al más viejo: ERR-2, ERR-1...)
                    if (a.isError && b.isError) {
                        const numA = parseInt(a.id.split('-')[1]);
                        const numB = parseInt(b.id.split('-')[1]);
                        return numB - numA; 
                    }
                    if (a.isError) return -1; // Errores van antes que los lotes normales
                    if (b.isError) return 1;

                    // 3. Individuales al final
                    if (a.id === 'INDIVIDUAL') return 1;
                    if (b.id === 'INDIVIDUAL') return -1;
                    
                    // 4. Lotes numéricos normales (descendente)
                    return b.id - a.id; 
                });

            return { club, batches: sortedBatches };
        });
    }, [clubs, financialOrders, filterClubId]);


// 2. Lógica de cálculo de totales (ACTUALIZADA: Errores individuales no afectan al comercial)
  const globalAccountingStats = useMemo(() => {
      const stats = {
        cardTotal: 0,
        cardFees: 0,
        totalNetProfit: 0,
        cash: { collected: 0, pending: 0, listPending: [], listCollected: [] },
        supplier: { paid: 0, pending: 0, listPending: [], listPaid: [] },
        commercial: { paid: 0, pending: 0, listPending: [], listPaid: [] },
        club: { paid: 0, pending: 0, listPending: [], listPaid: [] }
    };

    accountingData.forEach(({ club, batches }) => {
        batches.forEach(batch => {
            const log = club.accountingLog?.[batch.id] || {};
            
            // --- A. DEFINICIÓN DE EXENCIONES DE LOTE ---
            const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
            // Si es un lote entero de errores, nadie cobra comisión
            const isCommissionExempt = isErrorBatch; 

            // --- B. FILTROS DE PAGO (GENERALES) ---
            const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
            const nonCashOrders = batch.orders.filter(o => o.paymentMethod !== 'cash');

            // --- C. TOTALES REALES DEL LOTE (Para Cajas y Neto Empresa) ---
            const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total, 0);
            const nonCashRevenue = nonCashOrders.reduce((sum, o) => sum + o.total, 0);
            const totalBatchRevenue = cashRevenue + nonCashRevenue;

            // Coste TOTAL (Incluye coste de errores/reposiciones)
            const totalCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
            
            // Pasarela TOTAL (Solo pedidos tarjeta)
            const totalFees = batch.orders.reduce((sum, o) => {
                if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                return sum;
            }, 0);

            // --- D. CÁLCULO DE COMISIONES (FILTRADO) ---
            // "Los pedidos de errores no afectan al comercial" -> Filtramos los pedidos que generan comisión
            const commissionableOrders = batch.orders.filter(o => 
                o.paymentMethod !== 'incident' && 
                o.paymentMethod !== 'gift' && 
                o.type !== 'replacement'
            );

            // Base para comisiones (Solo pedidos válidos)
            const commRevenue = commissionableOrders.reduce((sum, o) => sum + o.total, 0);
            const commCost = commissionableOrders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
            const commFees = commissionableOrders.reduce((sum, o) => {
                if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                return sum;
            }, 0);

            // 1. PAGO CLUB (Sobre ventas reales, si no es lote exento)
            const clubCommissionRate = isCommissionExempt ? 0 : (club.commission !== undefined ? club.commission : 0.12);
            const commClub = commRevenue * clubCommissionRate;

            // 2. PAGO COMERCIAL (Sobre base limpia de errores)
            // Base = Ingresos Reales - Pasarela Real - Coste Real - Club Real
            const commercialBase = commRevenue - commFees - commCost - commClub;
            const commComm = isCommissionExempt ? 0 : (commercialBase * financialConfig.commercialCommissionPct);

            // --- E. BENEFICIO NETO EMPRESA ---
            // Ingresos Totales - Costes Totales (inc. errores) - Pagos a terceros
            const batchNetProfit = totalBatchRevenue - totalCost - commClub - commComm - totalFees;

            // ACUMULADORES GLOBALES
            stats.cardTotal += nonCashRevenue; 
            stats.cardFees += totalFees;
            stats.totalNetProfit += batchNetProfit;

            // Lógica de Cajas y Deudas
            const cashVal = cashRevenue + (log.cashUnder || 0) - (log.cashOver || 0);
            if (log.cashCollected) {
                stats.cash.collected += cashVal;
                if(cashVal > 0) stats.cash.listCollected.push({ club: club.name, batch: batch.id, amount: cashVal });
            } else {
                stats.cash.pending += cashVal;
                if(cashVal > 0) stats.cash.listPending.push({ club: club.name, batch: batch.id, amount: cashVal });
            }

            const suppVal = totalCost + (log.supplierUnder || 0) - (log.supplierOver || 0);
            if (log.supplierPaid) {
                stats.supplier.paid += suppVal;
                if(suppVal > 0) stats.supplier.listPaid.push({ club: club.name, batch: batch.id, amount: suppVal });
            } else {
                stats.supplier.pending += suppVal;
                if(suppVal > 0) stats.supplier.listPending.push({ club: club.name, batch: batch.id, amount: suppVal });
            }

            // Deudas solo si hay importes > 0
            if (commComm > 0) {
                const commVal = commComm + (log.commercialUnder || 0) - (log.commercialOver || 0);
                if (log.commercialPaid) {
                    stats.commercial.paid += commVal;
                    if(commVal > 0) stats.commercial.listPaid.push({ club: club.name, batch: batch.id, amount: commVal });
                } else {
                    stats.commercial.pending += commVal;
                    if(commVal > 0) stats.commercial.listPending.push({ club: club.name, batch: batch.id, amount: commVal });
                }
            }

            if (commClub > 0) {
                const clubVal = commClub + (log.clubUnder || 0) - (log.clubOver || 0);
                if (log.clubPaid) {
                    stats.club.paid += clubVal;
                    if(clubVal > 0) stats.club.listPaid.push({ club: club.name, batch: batch.id, amount: clubVal });
                } else {
                    stats.club.pending += clubVal;
                    if(clubVal > 0) stats.club.listPending.push({ club: club.name, batch: batch.id, amount: clubVal });
                }
            }
        });
    });
    return stats;
  }, [accountingData, financialConfig]);

  const totalRevenue = financialOrders.reduce((sum, o) => sum + o.total, 0);
  const totalIncidentCosts = financialOrders.reduce((sum, o) => {
      return sum + (o.incidents?.reduce((iSum, inc) => iSum + (inc.cost || 0), 0) || 0);
  }, 0);

  // Cálculo de beneficio neto global (ACTUALIZADO)
  const netProfit = financialOrders.reduce((total, o) => {
      const club = clubs.find(c => c.id === o.clubId);
      const clubCommPct = club && club.commission !== undefined ? club.commission : 0.12;
      
      const cost = o.items ? o.items.reduce((s, i) => s + ((i.cost || 0) * (i.quantity || 1)), 0) : (o.cost || 0);
      const incidentCost = o.incidents?.reduce((iSum, inc) => iSum + (inc.cost || 0), 0) || 0;
      
      const commClub = o.total * clubCommPct;
      const commComm = o.total * financialConfig.commercialCommissionPct;
      
      return total + (o.total - cost - incidentCost - commClub - commComm);
  }, 0);
  
  const averageTicket = totalRevenue / (financialOrders.length || 1);
  

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

// --- FUNCIÓN EXCEL MEJORADA (COMISIONES EXACTAS POR CLUB + NUEVAS SECCIONES) ---
const handleExportSeasonExcel = async (seasonId) => {
        const season = seasons.find(s => s.id === seasonId);
        if (!season) return;

        const start = new Date(season.startDate).getTime();
        const end = new Date(season.endDate).getTime();

        const seasonOrders = orders.filter(o => {
            if (o.manualSeasonId) return o.manualSeasonId === season.id;
            if (o.manualSeasonId && o.manualSeasonId !== season.id) return false;
            const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
            return d >= start && d <= end;
        });

        if (seasonOrders.length === 0) {
            showNotification('No hay pedidos en esta temporada', 'error');
            return;
        }

        const safeNum = (val) => (typeof val === 'number' && !isNaN(val)) ? val : 0;

        // --- CÁLCULO DE ESTADÍSTICAS ---
        const calculateStats = (ordersToProcess) => {
            let grossSales = 0;
            let supplierCost = 0;
            let gatewayCost = 0;
            let totalClubComm = 0;
            let totalCommComm = 0;

            const monthly = {};
            const payment = {};
            const categories = {};
            const productsStats = {}; // { qty, total, cost }
            
            // Stats Incidencias
            let incidentCount = 0;
            const responsibility = { internal: 0, club: 0, supplier: 0 };
            const costAssumed = { internal: 0, club: 0, supplier: 0 };
            const productIncidents = {}; 

            ordersToProcess.forEach(order => {
                const isIncident = order.type === 'replacement' || order.paymentMethod === 'incident' || String(order.globalBatch).startsWith('ERR');

                if (!isIncident) {
                    // --- VENTAS ---
                    const total = safeNum(order.total);
                    grossSales += total;

                    const orderCost = order.items.reduce((sum, item) => sum + (safeNum(item.cost) * (item.quantity || 1)), 0);
                    supplierCost += orderCost;

                    let rawMethod = order.paymentMethod || 'card';
                    let methodLabel = 'tarjeta';
                    if (rawMethod === 'cash') methodLabel = 'efectivo';
                    else if (rawMethod === 'bizum' || rawMethod === 'transfer') methodLabel = 'transferencia/bizum';
                    
                    let orderGatewayFee = 0;
                    if (methodLabel === 'tarjeta') {
                        orderGatewayFee = (total * safeNum(financialConfig.gatewayPercentFee)) + safeNum(financialConfig.gatewayFixedFee);
                        gatewayCost += orderGatewayFee;
                    }

                    const orderClub = clubs.find(c => c.id === order.clubId);
                    const clubPct = orderClub ? (safeNum(orderClub.commission) || 0) : 0; 
                    const currentClubComm = total * clubPct;
                    totalClubComm += currentClubComm;

                    const commBase = total - orderCost - currentClubComm - orderGatewayFee;
                    const currentCommComm = commBase > 0 ? commBase * safeNum(financialConfig.commercialCommissionPct) : 0;
                    totalCommComm += currentCommComm;

                    if (!payment[methodLabel]) payment[methodLabel] = { total: 0, count: 0 };
                    payment[methodLabel].total += total;
                    payment[methodLabel].count += 1;

                    const date = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
                    const monthKey = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
                    const sortKey = date.getFullYear() * 100 + date.getMonth();
                    if (!monthly[monthKey]) monthly[monthKey] = { total: 0, count: 0, sort: sortKey };
                    monthly[monthKey].total += total;
                    monthly[monthKey].count += 1;

                    order.items.forEach(item => {
                        const qty = item.quantity || 1;
                        const subtotal = qty * safeNum(item.price);
                        const itemTotalCost = qty * safeNum(item.cost); 

                        let catName = item.category || 'General';
                        const normCat = catName.trim().replace(/\s+[A-Z0-9]$/i, '');
                        if (!categories[normCat]) categories[normCat] = { total: 0, subCats: new Set() };
                        categories[normCat].total += subtotal;
                        
                        if (!productsStats[item.name]) productsStats[item.name] = { qty: 0, total: 0, cost: 0 };
                        productsStats[item.name].qty += qty;
                        productsStats[item.name].total += subtotal;
                        productsStats[item.name].cost += itemTotalCost;
                    });

                } else {
                    // --- INCIDENCIAS ---
                    incidentCount++;
                    const details = order.incidentDetails || {};
                    const resp = details.responsibility || 'internal';
                    const incCost = order.items.reduce((sum, i) => sum + ((i.cost || 0) * (i.quantity || 1)), 0);
                    const incPrice = order.total; // Si se cobró

                    if (responsibility[resp] !== undefined) responsibility[resp]++;
                    else responsibility.internal++;

                    if (resp === 'club') costAssumed.club += incPrice;
                    else if (resp === 'supplier') costAssumed.supplier += incCost;
                    else costAssumed.internal += incCost;

                    order.items.forEach(item => {
                        const qty = item.quantity || 1;
                        let cleanName = item.name.replace(/\s*\[.*?\]/g, '').trim(); 
                        if (!productIncidents[cleanName]) productIncidents[cleanName] = 0;
                        productIncidents[cleanName] += qty;
                    });
                }
            });

            const validOrdersCount = ordersToProcess.filter(o => !['replacement','incident'].includes(o.paymentMethod) && !String(o.globalBatch).startsWith('ERR')).length;
            const avgTicket = validOrdersCount > 0 ? grossSales / validOrdersCount : 0;
            const netIncome = grossSales - supplierCost - gatewayCost - totalClubComm - totalCommComm;

            const processedProducts = Object.entries(productsStats).map(([k,v]) => {
                const profit = v.total - v.cost;
                const margin = v.total > 0 ? (profit / v.total) : 0;
                return { name: k, ...v, profit, margin };
            });

            return {
                count: validOrdersCount,
                grossSales,
                supplierCost,
                gatewayCost,
                commClub: totalClubComm,
                commCommercial: totalCommComm,
                netIncome,
                avgTicket,
                incidentData: { count: incidentCount, responsibility, costAssumed },
                sortedMonths: Object.entries(monthly).map(([k,v]) => ({name: k, ...v})).sort((a,b) => a.sort - b.sort),
                sortedPayment: Object.entries(payment).map(([k,v]) => ({name: k, ...v})).sort((a,b) => b.total - a.total),
                sortedCats: Object.entries(categories).map(([k,v]) => ({name: k, total: v.total})).sort((a,b) => b.total - a.total),
                sortedProds: processedProducts.sort((a,b) => b.qty - a.qty).slice(0, 10),
                sortedProdsProfit: processedProducts.sort((a,b) => b.profit - a.profit).slice(0, 20),
                sortedProductIncidents: Object.entries(productIncidents)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
            };
        };

        const adjustColumnWidths = (worksheet) => {
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell) => {
                    if (cell.isMerged) return;
                    const v = cell.value ? cell.value.toString() : '';
                    if (v.length > maxLength) maxLength = v.length;
                });
                column.width = Math.max(maxLength + 2, 15);
            });
        };

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'FotoEsport Admin';
        workbook.created = new Date();

        const styles = {
            header: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }, font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }, alignment: { horizontal: 'center' } },
            subHeader: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }, font: { bold: true } },
            title: { font: { bold: true, size: 16 } },
            sectionTitle: { font: { color: { argb: 'FF10B981' }, bold: true, size: 12 } },
            currency: { numFmt: '#,##0.00 "€"' },
            currencyRed: { numFmt: '#,##0.00 "€"', font: { color: { argb: 'FFDC2626' } } },
            currencyBold: { numFmt: '#,##0.00 "€"', font: { bold: true } },
            percent: { numFmt: '0.00%' }
        };

        // --- HOJA 1: VISTA GLOBAL ---
        const globalStats = calculateStats(seasonOrders);
        const wsGlobal = workbook.addWorksheet('Vista Global');
        
        wsGlobal.columns = [{key:'A'},{key:'B'},{key:'C'},{key:'D'},{key:'E'},{key:'F'},{key:'G'}, {key:'H'}];

        wsGlobal.addRow([`Reporte Global - ${season.name}`]);
        wsGlobal.getCell('A1').font = styles.title.font;
        wsGlobal.mergeCells('A1:H1');
        wsGlobal.addRow([]);

        wsGlobal.addRow(['Resumen General']);
        wsGlobal.getCell('A3').font = styles.sectionTitle.font;
        wsGlobal.addRow(['Total Pedidos', globalStats.count]);
        const rFact = wsGlobal.addRow(['Facturación Total', globalStats.grossSales]);
        rFact.getCell(2).numFmt = styles.currencyBold.numFmt;
        const rTicket = wsGlobal.addRow(['Ticket Medio', globalStats.avgTicket]);
        rTicket.getCell(2).numFmt = styles.currency.numFmt;
        const rNet = wsGlobal.addRow(['Beneficio Neto Global', globalStats.netIncome]);
        rNet.getCell(2).numFmt = styles.currencyBold.numFmt;
        wsGlobal.addRow([]);

        wsGlobal.addRow(['Reporte Financiero Detallado por Club']);
        wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
        wsGlobal.mergeCells(`A${wsGlobal.lastRow.number}:H${wsGlobal.lastRow.number}`);

        const headerRow = wsGlobal.addRow(['Club', 'Pedidos', 'Facturación', 'Coste Prov.', 'Pasarela/Gastos', 'Com. Club', 'Neto Comercial', 'Beneficio Neto']);
        for(let i=1; i<=8; i++) Object.assign(headerRow.getCell(i), styles.header);

        let totalTableGross = 0, totalTableSupp = 0, totalTableGate = 0, totalTableClub = 0, totalTableComm = 0, totalTableNet = 0;

        clubs.forEach(c => {
            const cStats = calculateStats(seasonOrders.filter(o => o.clubId === c.id));
            const commClub = cStats.commClub;
            const commCommercial = cStats.commCommercial;
            const net = cStats.netIncome;

            totalTableGross += cStats.grossSales;
            totalTableSupp += cStats.supplierCost;
            totalTableGate += cStats.gatewayCost;
            totalTableClub += commClub;
            totalTableComm += commCommercial;
            totalTableNet += net;

            const row = wsGlobal.addRow([
                c.name, cStats.count, cStats.grossSales, -cStats.supplierCost, -cStats.gatewayCost, -commClub, 
                -commCommercial, // <--- CAMBIO: AHORA NEGATIVO
                net
            ]);
            row.getCell(3).numFmt = styles.currency.numFmt;
            Object.assign(row.getCell(4), styles.currencyRed);
            Object.assign(row.getCell(5), styles.currencyRed);
            Object.assign(row.getCell(6), styles.currencyRed);
            Object.assign(row.getCell(7), styles.currencyRed); // Estilo Rojo para Comercial
            Object.assign(row.getCell(8), styles.currencyBold);
        });

        const totalRow = wsGlobal.addRow(['TOTALES', globalStats.count, totalTableGross, -totalTableSupp, -totalTableGate, -totalTableClub, -totalTableComm, totalTableNet]); // Totales también negativos
        for(let i=1; i<=8; i++) {
            Object.assign(totalRow.getCell(i), styles.subHeader);
            if(i > 2) totalRow.getCell(i).numFmt = styles.currency.numFmt;
        }
        
        wsGlobal.addRow([]);

        // ... (Resto de secciones de Vista Global: Meses, Productos, Incidencias... IGUAL) ...
        // 3. Tablas Laterales
        const rSecTitle = wsGlobal.addRow(['Evolución Mensual', '', '', 'Métodos de Pago', '', '', 'Facturación por Categoría']);
        [1, 4, 7].forEach(i => rSecTitle.getCell(i).font = styles.sectionTitle.font);
        
        const rSecHead = wsGlobal.addRow(['Mes', 'Ventas', '', 'Método', 'Total', '', 'Categoría', 'Total']);
        [1,2, 4,5, 7,8].forEach(i => Object.assign(rSecHead.getCell(i), styles.subHeader));

        const maxRows = Math.max(globalStats.sortedMonths.length, globalStats.sortedPayment.length, globalStats.sortedCats.length);

        for(let i=0; i<maxRows; i++){
            const m = globalStats.sortedMonths[i];
            const p = globalStats.sortedPayment[i];
            const c = globalStats.sortedCats[i];

            const row = wsGlobal.addRow([
                m ? m.name : '', m ? m.total : '', '', 
                p ? p.name.toUpperCase() : '', p ? p.total : '', '', 
                c ? c.name : '', c ? c.total : ''
            ]);
            if(m) row.getCell(2).numFmt = styles.currency.numFmt;
            if(p) row.getCell(5).numFmt = styles.currency.numFmt;
            if(c) row.getCell(8).numFmt = styles.currency.numFmt;
        }
        wsGlobal.addRow([]);

        // 4. Productos Estrella
        wsGlobal.addRow(['Productos Estrella (Top Ventas)']);
        wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
        const headProd = wsGlobal.addRow(['Producto', 'Unidades Vendidas', 'Facturación']);
        [1,2,3].forEach(i => Object.assign(headProd.getCell(i), styles.subHeader));
        globalStats.sortedProds.forEach(prod => {
            const r = wsGlobal.addRow([prod.name, prod.qty, prod.total]);
            r.getCell(3).numFmt = styles.currency.numFmt;
        });
        wsGlobal.addRow([]);

        // 5. Rentabilidad
        wsGlobal.addRow(['Rentabilidad Real por Producto (Top Beneficio)']);
        wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
        const headRent = wsGlobal.addRow(['Producto', 'Unidades', 'Facturación', 'Coste Total', 'Beneficio Real', 'Margen %']);
        [1,2,3,4,5,6].forEach(i => Object.assign(headRent.getCell(i), styles.subHeader));
        globalStats.sortedProdsProfit.forEach(prod => {
            const r = wsGlobal.addRow([prod.name, prod.qty, prod.total, prod.cost, prod.profit, prod.margin]);
            r.getCell(3).numFmt = styles.currency.numFmt;
            r.getCell(4).numFmt = styles.currencyRed.numFmt;
            r.getCell(5).numFmt = styles.currencyBold.numFmt;
            r.getCell(6).numFmt = styles.percent.numFmt;
        });
        wsGlobal.addRow([]);

        // 6. Incidencias
        wsGlobal.addRow(['Control de Incidencias y Calidad']);
        wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
        const incData = globalStats.incidentData;
        const errorRate = (incData.count / (globalStats.count + incData.count)) * 100 || 0;
        
        wsGlobal.addRow(['Tasa de Incidencias', `${errorRate.toFixed(2)}% (${incData.count} pedidos afectados)`]);
        const headInc = wsGlobal.addRow(['Responsabilidad', 'Cantidad', 'Coste Asumido']);
        [1,2,3].forEach(i => Object.assign(headInc.getCell(i), styles.subHeader));
        
        const rInt = wsGlobal.addRow(['Interno / Fábrica', incData.responsibility.internal, incData.costAssumed.internal]);
        rInt.getCell(3).numFmt = styles.currencyRed.numFmt;
        const rClub = wsGlobal.addRow(['Club (Facturable)', incData.responsibility.club, incData.costAssumed.club]);
        rClub.getCell(3).numFmt = styles.currency.numFmt;
        const rSupp = wsGlobal.addRow(['Proveedor (Garantía)', incData.responsibility.supplier, incData.costAssumed.supplier]);
        rSupp.getCell(3).numFmt = styles.currency.numFmt;
        wsGlobal.addRow([]);

        if(globalStats.sortedProductIncidents.length > 0){
            wsGlobal.addRow(['Productos más Problemáticos (Top Fallos)']);
            wsGlobal.getCell(`A${wsGlobal.lastRow.number}`).font = styles.sectionTitle.font;
            const headProb = wsGlobal.addRow(['Producto', 'Unidades Fallidas/Repuestas']);
            [1,2].forEach(i => Object.assign(headProb.getCell(i), styles.subHeader));
            globalStats.sortedProductIncidents.forEach(p => wsGlobal.addRow([p.name, p.count]));
        }

        adjustColumnWidths(wsGlobal);

// ==========================
      // HOJAS POR CLUB
      // ==========================
      clubs.forEach(club => {
          const clubOrders = seasonOrders.filter(o => o.clubId === club.id);
          // calculateStats ya devuelve 'commCommercial' sumando pedido a pedido correctamente
          const cStats = calculateStats(clubOrders);
          
          const clubCommPct = safeNum(club.commission) || 0.12;
          
          // Valores Totales
          const commClub = cStats.commClub; // Usamos el acumulado real
          const commComm = cStats.commCommercial; // Usamos el acumulado real (ya tiene en cuenta que Errores = 0)
          
          // Neto Total (Ventas - Costes - ComisionClub - ComisionComercial - Pasarela)
          // Nota: cStats.netIncome ya trae este cálculo, pero si quieres hacerlo explícito aquí:
          const net = cStats.grossSales - cStats.supplierCost - cStats.gatewayCost - commClub - commComm;

          const sheetName = club.name.replace(/[*?:\/\[\]]/g, '').substring(0, 30);
          const ws = workbook.addWorksheet(sheetName);
          
          // Definir columnas (Extendidas para incluir contabilidad)
          ws.columns = [
              { key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }, { key: 'E' }, 
              { key: 'F' }, { key: 'G' }, { key: 'H' }, { key: 'I' }, { key: 'J' },
              { key: 'K' }, { key: 'L' }, { key: 'M' }, { key: 'N' }, { key: 'O' }, 
              { key: 'P' }, { key: 'Q' }, { key: 'R' }, { key: 'S' }
          ];

          ws.addRow([`${club.name} - Resumen`]);
          ws.getCell('A1').font = styles.title.font;
          ws.mergeCells('A1:J1');
          ws.addRow([]);

          // KPIs
          const kpiHead = ws.addRow(['Métrica', 'Valor']);
          Object.assign(kpiHead.getCell(1), styles.subHeader);
          Object.assign(kpiHead.getCell(2), styles.subHeader);
          ws.addRow(['Total Pedidos', cStats.count]);
          const rTk = ws.addRow(['Ticket Medio', cStats.avgTicket]);
          rTk.getCell(2).numFmt = styles.currency.numFmt;
          ws.addRow([]);

          // Reporte Financiero
          ws.addRow(['Reporte Financiero']);
          ws.getCell(`A${ws.lastRow.number}`).font = styles.sectionTitle.font;
          const finHead = ws.addRow(['Concepto', 'Importe']);
          Object.assign(finHead.getCell(1), styles.subHeader);
          Object.assign(finHead.getCell(2), styles.subHeader);
          
          const addFin = (label, val, style) => { const r = ws.addRow([label, val]); if(style) Object.assign(r.getCell(2), style); else r.getCell(2).numFmt = styles.currency.numFmt; };
          
          addFin('Facturación Total', cStats.grossSales);
          addFin('Coste Proveedores', -cStats.supplierCost, styles.currencyRed);
          addFin('Pasarela/Gastos', -cStats.gatewayCost, styles.currencyRed); // Añadido para cuadrar el neto
          addFin('Comisión Club', -commClub, styles.currencyRed);
          addFin('Neto Comercial', -commComm, styles.currencyRed); // En negativo y con el valor correcto
          addFin('Beneficio Neto', net, styles.currencyBold);
          
          ws.addRow([]);

          // Listado Detallado con Contabilidad
          ws.addRow(['Listado Detallado de Pedidos y Contabilidad']);
          ws.getCell(`A${ws.lastRow.number}`).font = styles.title.font;
          ws.mergeCells(`A${ws.lastRow.number}:S${ws.lastRow.number}`);

          const headers = [
              'ID', 'Fecha', 'Cliente', 'Email', 'Teléfono', 'Cant.', 'Productos', 'Total Venta', 'Método Pago', 'Lote',
              'Fecha Cobro', 'Estado Cobro', // Caja
              'Coste Prov.', 'Fecha Pago Prov.', 'Estado Prov.', // Proveedor
              'Comisión Club', 'Fecha Pago Club', 'Estado Club', // Club
              'Comisión Com.', 'Fecha Pago Com.', 'Estado Com.' // Comercial
          ];
          const hRow = ws.addRow(headers);
          hRow.eachCell(c => Object.assign(c, styles.header));

          clubOrders.forEach(o => {
              const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleDateString() : '-';
              const totalItems = o.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
              const productsStr = o.items.map(i => {
                  const sizeStr = i.size ? `(${i.size})` : '';
                  return `${i.name} ${sizeStr}`.trim();
              }).join('; ');

              // Datos Contables del Lote
              const batchId = o.globalBatch;
              const log = club.accountingLog?.[batchId] || {};
              
              // 1. Cobro (Caja)
              const isCash = o.paymentMethod === 'cash';
              let fechaCobro = isCash ? (log.cashCollectedDate ? new Date(log.cashCollectedDate).toLocaleDateString() : '-') : date; 
              let estadoCobro = isCash ? (log.cashCollected ? 'Recogido' : 'Pdte. Entrega') : 'Pagado TPV';
              
              // 2. Costes y Proveedor
              const oCost = o.items.reduce((s, i) => s + (safeNum(i.cost) * (i.quantity||1)), 0);
              const fechaProv = log.supplierPaidDate ? new Date(log.supplierPaidDate).toLocaleDateString() : '-';
              const estadoProv = log.supplierPaid ? 'Pagado' : 'Pendiente';

              // 3. Comisión Club
              // Usamos la comisión configurada en el club en el momento del reporte (o podrías guardar la histórica en el pedido si existiera)
              const oCommClub = safeNum(o.total) * clubCommPct;
              const fechaClub = log.clubPaidDate ? new Date(log.clubPaidDate).toLocaleDateString() : '-';
              const estadoClub = log.clubPaid ? 'Pagado' : 'Pendiente';

              // 4. Comisión Comercial (DETECCIÓN DE ERRORES)
              // Detectar si es un pedido de error/reposición
              const isErrorOrder = String(o.globalBatch).startsWith('ERR') || o.type === 'replacement' || ['replacement', 'incident'].includes(o.paymentMethod);

              let oCommComm = 0;
              if (!isErrorOrder) {
                  // Solo calculamos comercial si NO es un error
                  const fees = (o.paymentMethod === 'card') ? (o.total * safeNum(financialConfig.gatewayPercentFee) + safeNum(financialConfig.gatewayFixedFee)) : 0;
                  const baseComm = o.total - oCost - oCommClub - fees;
                  // Si la base es positiva, aplicamos el %. Si es negativa (pérdidas), el comercial es 0.
                  if (baseComm > 0) {
                      oCommComm = baseComm * safeNum(financialConfig.commercialCommissionPct);
                  }
              }
              
              const fechaComm = log.commercialPaidDate ? new Date(log.commercialPaidDate).toLocaleDateString() : '-';
              const estadoComm = log.commercialPaid ? 'Pagado' : 'Pendiente';

              const r = ws.addRow([
                  o.id.slice(0,8), date, o.customer.name, o.customer.email, o.customer.phone, 
                  totalItems, productsStr, safeNum(o.total), o.paymentMethod || 'card', batchId,
                  fechaCobro, estadoCobro,
                  oCost, fechaProv, estadoProv,
                  oCommClub, fechaClub, estadoClub,
                  oCommComm, fechaComm, estadoComm
              ]);

              // Formatos Moneda
              r.getCell(8).numFmt = styles.currency.numFmt; // Total Venta
              r.getCell(13).numFmt = styles.currency.numFmt; // Coste Prov
              r.getCell(16).numFmt = styles.currency.numFmt; // Com Club
              r.getCell(19).numFmt = styles.currency.numFmt; // Com Com
          });

          adjustColumnWidths(ws);
      });

      // Descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${season.name.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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


      {/* --- REVERT MODAL --- */}
      {revertModal.active && (
          <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-2 border-red-100">
                  <div className="flex items-center gap-2 mb-4 text-red-600">
                      <AlertTriangle className="w-6 h-6"/>
                      <h3 className="font-bold text-lg">Reabrir Pedido Global Anterior</h3>
                  </div>
                  <p className="text-gray-600 mb-2">
                      Estás a punto de eliminar el <strong>Lote Global #{revertModal.currentBatchId}</strong> y volver a activar el <strong>#{revertModal.currentBatchId - 1}</strong>.
                  </p>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6">
                      <p className="font-bold text-red-800 text-sm mb-2">¡Atención! El lote actual tiene {revertModal.ordersCount} pedidos.</p>
                      
                      <div className="space-y-2">
                          <button onClick={() => processRevertBatch('transfer')} className="w-full text-left p-3 rounded bg-white border border-red-200 hover:border-red-400 flex items-center gap-3 transition-colors group">
                              <div className="bg-blue-100 p-2 rounded-full text-blue-600 group-hover:bg-blue-200"><MoveLeft className="w-4 h-4"/></div>
                              <div><span className="block font-bold text-sm text-gray-800">Traspasar al Anterior</span><span className="block text-xs text-gray-500">Moverlos al Lote #{revertModal.currentBatchId - 1} y borrar este lote.</span></div>
                          </button>
                          <button onClick={() => processRevertBatch('delete')} className="w-full text-left p-3 rounded bg-white border border-red-200 hover:border-red-400 flex items-center gap-3 transition-colors group">
                              <div className="bg-red-100 p-2 rounded-full text-red-600 group-hover:bg-red-200"><Trash2 className="w-4 h-4"/></div>
                              <div><span className="block font-bold text-sm text-gray-800">Eliminar Pedidos</span><span className="block text-xs text-gray-500">Borrar estos pedidos permanentemente.</span></div>
                          </button>
                      </div>
                  </div>
                  <div className="flex justify-end">
                      <Button variant="secondary" onClick={() => setRevertModal({ active: false, clubId: null, currentBatchId: null, ordersCount: 0 })}>Cancelar</Button>
                  </div>
              </div>
          </div>
      )}

{/* --- MODAL MOVER TEMPORADA (POR LOTE) --- */}
      {moveSeasonModal.active && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                      <Calendar className="w-5 h-5 text-blue-600"/> Mover Lote de Temporada
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                      Estás moviendo el <strong>Lote Global #{moveSeasonModal.target.batchId}</strong> completo. Todos los pedidos incluidos pasarán a la temporada seleccionada.
                  </p>
                  <div className="space-y-2 mb-6">
                      {seasons.map(s => (
                          <button key={s.id} onClick={() => handleMoveBatchSeasonSubmit(s.id)} className="w-full text-left p-3 rounded border text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors">
                              {s.name}
                          </button>
                      ))}
                      <button onClick={() => handleMoveBatchSeasonSubmit(null)} className="w-full text-left p-3 rounded border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 text-center">
                          Restaurar a Fecha Original
                      </button>
                  </div>
                  <div className="flex justify-end"><Button variant="secondary" onClick={() => setMoveSeasonModal({ active: false, target: null })}>Cancelar</Button></div>
              </div>
          </div>
      )}

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
        handleExportSeasonExcel={handleExportSeasonExcel}
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