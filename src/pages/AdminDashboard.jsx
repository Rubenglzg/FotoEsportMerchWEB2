import React, { useState } from 'react';

import { 
  LayoutDashboard, Package, Briefcase, Banknote, Factory, Calendar, Folder, AlertTriangle,  
  AlertCircle, BarChart3, Tag,
} from 'lucide-react';

import { Button } from '../components/ui/Button';

// UTILS
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
import { ProductsTab } from '../components/admin/tabs/ProductsTab';

// HOOKS
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDashboardActions } from '../hooks/useDashboardActions';
import { useAutoCloseBatches } from '../hooks/useAutoCloseBatches';
import { useAccountingHandlers } from '../hooks/useAccountingHandlers';
import { useDeleteHandlers } from '../hooks/useDeleteHandlers';
import { useDashboardModals } from '../hooks/useDashboardModals';
import { useIncidents } from '../hooks/useIncidents';

export function AdminDashboard({ products, orders, clubs, updateOrderStatus, financialConfig, setFinancialConfig, updateFinancialConfig, updateProduct, addProduct, deleteProduct, createClub, deleteClub, updateClub, toggleClubBlock, seasons, addSeason, deleteSeason, toggleSeasonVisibility, storeConfig, setStoreConfig, incrementClubGlobalOrder, decrementClubGlobalOrder, showNotification, createSpecialOrder, suppliers, createSupplier, updateSupplier, deleteSupplier, updateProductCostBatch, campaignConfig, setCampaignConfig,}) {
  const [tab, setTab] = useState('management');
  const [financeSeasonId, setFinanceSeasonId] = useState(seasons[seasons.length - 1]?.id || 'all');

  // Modificamos el estado de mover temporada para que acepte lotes completos
  const [moveSeasonModal, setMoveSeasonModal] = useState({ active: false, target: null, type: 'batch' }); // type: 'batch' | 'order'
  const [filterClubId, setFilterClubId] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState(clubs[0]?.id || '');
  const [statsClubFilter, setStatsClubFilter] = useState('all');

  // --- ESTADOS PARA EDICIÓN Y MOVIMIENTOS ---
  const [editOrderModal, setEditOrderModal] = useState({ 
      active: false, 
      original: null, 
      modified: null 
  });

  const { incidents, pendingCount } = useIncidents(tab);

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

    // --- NUEVO ESTADO: VISOR DE HISTORIAL DE LOTE ---
    const [batchHistoryModal, setBatchHistoryModal] = useState({ 
        active: false, 
        history: [], 
        batchId: null, 
        clubName: '' 
    });

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
    financialOrders, statsData, errorStats,
    accountingData, globalAccountingStats, totalRevenue,
    netProfit, averageTicket
  } = useDashboardStats({
    orders, seasons, clubs, financialConfig,
    financeSeasonId, statsClubFilter, filterClubId
  });

  const {
      sendSupplierEmails,
      processBatchStatusUpdate,
      processBatchManagement,
      createIncidentReplacement
  } = useDashboardActions(showNotification);

  useAutoCloseBatches(clubs, orders, showNotification);
  const { handlePaymentChange, updateBatchValue } = useAccountingHandlers(updateClub, setConfirmation);
  const { handleDeleteOrder, handleDeleteGlobalBatch, handleDeleteSeasonData } = useDeleteHandlers(orders, seasons, setConfirmation, showNotification);
  const {
      handlePreSaveOrder,
      handleMoveBatchSeasonSubmit,
      handleRevertGlobalBatch,
      processRevertBatch
  } = useDashboardModals({
      orders, clubs, showNotification, setConfirmation,
      editOrderModal, setEditOrderModal,
      moveSeasonModal, setMoveSeasonModal,
      revertModal, setRevertModal, decrementClubGlobalOrder
  });

  const executeBatchManagement = () => processBatchManagement(manageBatchModal, orders, setManageBatchModal);
  const handleSendSupplierEmails = (targetSuppliers, batchId, club) => sendSupplierEmails(targetSuppliers, batchId, club);
  const executeBatchStatusUpdate = (shouldNotify) => processBatchStatusUpdate(statusChangeModal, shouldNotify, orders, clubs, setStatusChangeModal);
  const submitIncident = () => createIncidentReplacement(incidentForm, clubs, setIncidentForm);


  return (
    <div>
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b bg-white p-2 rounded-lg shadow-sm">
        {[
            {id: 'management', label: 'Gestión', icon: LayoutDashboard},
            {id: 'products', label: 'Productos', icon: Tag},
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

{tab === 'products' && (
    <ProductsTab 
        products={products} 
        addProduct={addProduct} 
        updateProduct={updateProduct} 
        deleteProduct={deleteProduct} 
        suppliers={suppliers}
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