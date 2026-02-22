import React, { useState, useEffect } from 'react';
import { Layers, ChevronRight, Plus, Package, Briefcase, AlertTriangle, Calendar, Check, X, Lock, FileDown, Printer, Factory, NotebookText, Trash2, Edit3, Mail, ArrowRight, ShoppingCart } from 'lucide-react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, listAll } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { appId, AVAILABLE_COLORS } from '../../../config/constants';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { generateBatchExcel } from '../../../utils/excelExport';
import { printBatchAlbaran } from '../../../utils/printTemplates';

const INITIAL_MANUAL_FORM_STATE = {
    clubId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'transfer',
    targetBatch: '',
    classification: 'standard', 
    incidentResponsibility: 'internal', 
    items: [],
    tempItem: {
        productId: '', size: '', name: '', number: '', price: 0, quantity: 1,
        activeName: false, activeNumber: false, activeSize: false, activeShield: false
    }
};

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

export const AccountingTab = ({
    clubs, orders, products, accountingData, filterClubId, setFilterClubId,
    financialConfig, showNotification, setConfirmation, setSupplierStockModal,
    initiateStatusChange, setBatchHistoryModal, openManageBatchModal,
    updateOrderStatus, handleOpenIncident, setEditOrderModal, handleDeleteOrder
}) => {
    // Estados movidos desde AdminDashboard
    const [collapsedBatches, setCollapsedBatches] = useState([]);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [editingDate, setEditingDate] = useState({ clubId: null, date: '' });
    
    // Estados del Pedido Manual
    const [manualOrderModal, setManualOrderModal] = useState(false);
    const [manualOrderForm, setManualOrderForm] = useState(INITIAL_MANUAL_FORM_STATE);
    const [manualOrderCategories, setManualOrderCategories] = useState([]);

    const toggleBatch = (batchId) => {
        if (collapsedBatches.includes(batchId)) {
            setCollapsedBatches(collapsedBatches.filter(id => id !== batchId));
        } else {
            setCollapsedBatches([...collapsedBatches, batchId]);
        }
    };

    // Efecto para las categorías del pedido manual
    useEffect(() => {
        const fetchManualCategories = async () => {
            if (manualOrderForm.clubId) {
                try {
                    const club = clubs.find(c => c.id === manualOrderForm.clubId);
                    if (club) {
                        const clubRef = ref(storage, club.name);
                        const res = await listAll(clubRef);
                        setManualOrderCategories(res.prefixes.map(p => p.name));
                    }
                } catch (error) {
                    console.error("Error cargando categorías manuales:", error);
                    setManualOrderCategories([]);
                }
            } else {
                setManualOrderCategories([]);
            }
        };
        fetchManualCategories();
    }, [manualOrderForm.clubId, clubs]);

    const addManualItemToOrder = () => {
        const { productId, size, name, number, quantity, activeName, activeNumber, activeSize, activeShield } = manualOrderForm.tempItem;
        if (!productId) return;

        const productDef = products.find(p => p.id === productId);
        const selectedClub = clubs.find(c => c.id === manualOrderForm.clubId);
        const clubColor = selectedClub ? (selectedClub.color || 'white') : 'white';

        const defaults = productDef.defaults || { name: false, number: false, size: false, shield: true };
        const modifiable = productDef.modifiable || { name: true, number: true, size: true, shield: true };
        const fee = financialConfig.modificationFee || 0;

        let unitPrice = productDef.price;
        if (modifiable.size && (activeSize !== defaults.size)) unitPrice += fee;
        if (modifiable.name && (activeName !== defaults.name)) unitPrice += fee;
        if (modifiable.number && (activeNumber !== defaults.number)) unitPrice += fee;
        if (modifiable.shield && (activeShield !== defaults.shield)) unitPrice += fee;

        let finalPrice = unitPrice;
        let finalCost = productDef.cost || 0;
        const currentClass = manualOrderForm.classification || 'standard';

        if (currentClass === 'gift') {
            finalPrice = 0; 
        } else if (currentClass === 'incident') {
            const resp = manualOrderForm.incidentResponsibility || 'internal';
            if (resp === 'club') {
                finalPrice = unitPrice; 
            } else if (resp === 'supplier') {
                finalPrice = 0; finalCost = 0; 
            } else {
                finalPrice = 0; 
            }
        }

        const newItem = {
            productId, name: productDef.name, size: activeSize ? (size || 'Única') : '',
            playerName: activeName ? (name || '') : '', playerNumber: activeNumber ? (number || '') : '',
            color: clubColor, includeName: activeName, includeNumber: activeNumber, includeShield: activeShield,
            price: finalPrice, quantity: parseInt(quantity), cost: finalCost, image: productDef.image, cartId: Date.now() + Math.random()
        };

        setManualOrderForm({
            ...manualOrderForm,
            items: [...manualOrderForm.items, newItem],
            tempItem: { productId: '', size: '', name: '', number: '', price: 0, quantity: 1, activeName: false, activeNumber: false, activeSize: false, activeShield: false } 
        });
    };

    const submitManualOrder = async () => {
        if (!manualOrderForm.clubId || !manualOrderForm.customerName || manualOrderForm.items.length === 0) {
            showNotification('Faltan datos (Club, Cliente o Productos)', 'error');
            return;
        }

        const selectedClub = clubs.find(c => c.id === manualOrderForm.clubId);
        const totalOrder = manualOrderForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        let rawBatch = manualOrderForm.targetBatch;
        if (!rawBatch && selectedClub) rawBatch = selectedClub.activeGlobalOrderId;

        let batchIdToSave = rawBatch;
        const batchStr = String(rawBatch);

        if (batchStr === 'INDIVIDUAL') batchIdToSave = 'INDIVIDUAL';
        else if (batchStr.startsWith('ERR-')) batchIdToSave = batchStr;
        else batchIdToSave = parseInt(rawBatch);

        const currentClass = manualOrderForm.classification || 'standard';
        let finalPaymentMethod = manualOrderForm.paymentMethod;
        if (currentClass === 'gift') finalPaymentMethod = 'gift';
        if (currentClass === 'incident') finalPaymentMethod = 'incident';

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
                createdAt: serverTimestamp(),
                clubId: selectedClub.id, clubName: selectedClub.name,
                customer: { name: manualOrderForm.customerName, email: manualOrderForm.customerEmail || 'manual@pedido.com', phone: manualOrderForm.customerPhone || '' },
                items: manualOrderForm.items.map(item => ({ ...item, cartId: item.cartId || (Date.now() + Math.random()), image: item.image || null })),
                total: totalOrder,
                status: batchIdToSave === 'INDIVIDUAL' ? 'en_produccion' : 'recopilando', 
                visibleStatus: 'Pedido Manual (Admin)',
                type: 'manual', paymentMethod: finalPaymentMethod, globalBatch: batchIdToSave,
                manualOrderDetails: { classification: currentClass, responsibility: currentClass === 'incident' ? (manualOrderForm.incidentResponsibility || 'internal') : null },
                incidents: []
            });

            showNotification('Pedido manual creado correctamente');
            setManualOrderModal(false);
            setManualOrderForm(INITIAL_MANUAL_FORM_STATE);

        } catch (error) {
            console.error(error);
            showNotification('Error al crear el pedido', 'error');
        }
    };

    const renderProductDetails = (item) => {
        const parts = [];
        if (item.category) parts.push(`Cat: ${item.category}`);
        if (item.playerName) parts.push(`Nombre: ${item.playerName}`);
        if (item.playerNumber) parts.push(`Dorsal: ${item.playerNumber}`);
        if (item.color) {
            const colorLabel = AVAILABLE_COLORS.find(c => c.id === item.color)?.label || item.color;
            if (item.color !== 'white') parts.push(`Color: ${colorLabel}`);
        }
        if (item.size) parts.push(`Talla: ${item.size}`);
        if (item.details) {
            if (item.details.player2) parts.push(`(J2: ${item.details.player2.name} #${item.details.player2.number})`);
            if (item.details.player3) parts.push(`(J3: ${item.details.player3.name} #${item.details.player3.number})`);
            if (item.details.variant && item.details.variant !== 'Standard') parts.push(`[${item.details.variant}]`);
        }
        return parts.join(', ');
    };

    return (
        <div className="animate-fade-in space-y-8 relative">
            {/* A. BARRA DE HERRAMIENTAS */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Layers className="w-5 h-5"/></div>
                    <div>
                        <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Control de Lotes</h4>
                        <p className="text-xs text-slate-500">Gestión de pedidos globales</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
                    <div className="relative group flex items-center">
                        <select 
                            className="appearance-none bg-transparent text-base font-extrabold text-slate-700 pr-8 cursor-pointer outline-none hover:text-blue-600 transition-colors"
                            value={filterClubId} 
                            onChange={(e) => setFilterClubId(e.target.value)} 
                        >
                            <option value="all">Todos los Clubes</option>
                            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none rotate-90"/>
                    </div>
                    {filterClubId !== 'all' && (
                        <>
                            <div className="h-8 w-px bg-slate-100"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 font-bold uppercase">Lote Activo:</span>
                                <span className="text-base font-extrabold text-slate-800">
                                    #{clubs.find(c => c.id === filterClubId)?.activeGlobalOrderId || '-'}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            const preSelectedClub = filterClubId !== 'all' ? filterClubId : '';
                            const preSelectedBatch = preSelectedClub ? clubs.find(c => c.id === preSelectedClub)?.activeGlobalOrderId : '';
                            setManualOrderForm({...manualOrderForm, clubId: preSelectedClub, targetBatch: preSelectedBatch || ''});
                            setManualOrderModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded shadow flex items-center gap-2 transition-colors"
                    >
                        <Plus className="w-4 h-4"/> Nuevo Pedido Manual
                    </button>
                </div>
            </div>

            {/* B. LISTADO DE LOTES */}
            <div className="space-y-12">
                {accountingData.map(({ club, batches }) => (
                    <div key={club.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                        <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">{club.code}</div>
                                <h4 className="font-bold text-lg">{club.name}</h4>
                            </div>
                            <span className="text-xs bg-gray-700 px-3 py-1 rounded-full text-gray-300">{batches.length} Lotes</span>
                        </div>
                        
                        <div className="divide-y divide-gray-200">
                            {batches.map(batch => {
                                const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                                const isStandard = typeof batch.id === 'number';
                                const isActiveStandard = isStandard && batch.id === club.activeGlobalOrderId;
                                const isActiveError = isErrorBatch && batch.id === `ERR-${club.activeErrorBatchId || 1}`;

                                const status = (!isStandard && !isErrorBatch) ? 'special' : (batch.orders[0]?.status || 'recopilando');
                                const isProduction = ['en_produccion', 'entregado_club'].includes(status);
                                const batchTotal = batch.orders.reduce((sum, o) => sum + o.total, 0);

                                return (
                                    <div key={batch.id} className={`p-4 transition-colors ${isActiveStandard ? 'bg-emerald-50/40' : isActiveError ? 'bg-red-50/40' : 'bg-white'}`}>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <button onClick={() => toggleBatch(batch.id)} className="p-1 rounded-full hover:bg-black/10 transition-colors">
                                                    <ChevronRight className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${collapsedBatches.includes(batch.id) ? '' : 'rotate-90'}`}/>
                                                </button>
                                                
                                                {isErrorBatch ? (
                                                    <span className="font-black text-lg text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/>PEDIDO ERRORES #{batch.id.split('-')[1]}</span>
                                                ) : isStandard ? (
                                                    <span className="font-bold text-lg text-emerald-900">Pedido Global #{batch.id}</span>
                                                ) : (
                                                    <span className="font-black text-lg text-gray-700 flex items-center gap-2">
                                                        {batch.id === 'SPECIAL' ? <Briefcase className="w-5 h-5 text-indigo-600"/> : <Package className="w-5 h-5 text-orange-600"/>}
                                                        {batch.id === 'SPECIAL' ? 'ESPECIALES' : 'INDIVIDUALES'}
                                                    </span>
                                                )}

                                                {(isActiveStandard || isActiveError) && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isErrorBatch ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>Activo</span>
                                                )}

                                                {(isStandard || isErrorBatch) && <Badge status={status} />}
                                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border">Total: {batchTotal.toFixed(2)}€</span>

                                                {isStandard && isActiveStandard && (
                                                    <div className="ml-2">
                                                        {editingDate.clubId === club.id ? (
                                                            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border-2 border-blue-400 shadow-md animate-fade-in scale-105 origin-left">
                                                                <div className="flex flex-col px-1">
                                                                    <span className="text-[8px] font-bold text-blue-500 uppercase leading-none">Nueva Fecha</span>
                                                                    <input 
                                                                        type="date" className="text-xs font-bold border-none p-0 focus:ring-0 text-gray-800 bg-transparent h-5 w-24"
                                                                        value={editingDate.date} onChange={(e) => setEditingDate({...editingDate, date: e.target.value})} autoFocus
                                                                    />
                                                                </div>
                                                                <div className="flex gap-1 border-l pl-1 border-gray-200">
                                                                    <button onClick={() => {
                                                                            if(!editingDate.date) return;
                                                                            setConfirmation({
                                                                                title: "📅 Confirmar Fecha",
                                                                                msg: `Vas a programar el cierre para el día:\n\n👉 ${new Date(editingDate.date).toLocaleDateString()}\n\n¿Guardar cambio?`,
                                                                                onConfirm: async () => {
                                                                                    await updateDoc(doc(db, 'clubs', club.id), { nextBatchDate: editingDate.date });
                                                                                    setEditingDate({ clubId: null, date: '' });
                                                                                    showNotification('Fecha programada correctamente');
                                                                                }
                                                                            });
                                                                        }}
                                                                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-1.5 rounded transition-colors"
                                                                    ><Check className="w-3.5 h-3.5"/></button>
                                                                    <button onClick={() => setEditingDate({ clubId: null, date: '' })} className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded transition-colors"><X className="w-3.5 h-3.5"/></button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${!club.nextBatchDate ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                                                                <Calendar className={`w-3.5 h-3.5 ${!club.nextBatchDate ? 'text-orange-500' : 'text-gray-400'}`}/>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-bold text-gray-400 uppercase leading-none">Cierre Previsto</span>
                                                                    <span className={`text-xs font-bold ${!club.nextBatchDate ? 'text-orange-600' : 'text-gray-700'}`}>
                                                                        {club.nextBatchDate ? new Date(club.nextBatchDate).toLocaleDateString() : 'Sin Fecha'}
                                                                    </span>
                                                                </div>
                                                                {!isProduction ? (
                                                                    <button onClick={() => setEditingDate({ clubId: club.id, date: club.nextBatchDate || '' })} className="ml-1 p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"><Edit3 className="w-3.5 h-3.5"/></button>
                                                                ) : (<Lock className="w-3.5 h-3.5 text-gray-300 ml-1" title="Bloqueado: En producción"/>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">                                        
                                                <Button size="xs" variant="outline" onClick={() => generateBatchExcel(batch.id, batch.orders, club.name)} disabled={batch.orders.length===0}><FileDown className="w-3 h-3 mr-1"/> Excel</Button>
                                                <Button size="xs" variant="outline" disabled={batch.orders.length === 0} onClick={() => printBatchAlbaran(batch.id, batch.orders, club.name, club.commission || 0.12)}><Printer className="w-3 h-3 mr-1"/> Albarán</Button>

                                                {(isStandard || isErrorBatch) && (
                                                    <>
                                                        <Button size="xs" variant="outline" className="ml-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50" disabled={batch.orders.length === 0} onClick={() => setSupplierStockModal({ active: true, batchId: batch.id, orders: batch.orders, club: club })}><Factory className="w-3 h-3 mr-1"/> Stock Prov.</Button>
                                                        <div className="flex items-center gap-2 ml-2 border-l pl-2 border-gray-300">
                                                            <select value={status} onChange={(e) => { e.preventDefault(); initiateStatusChange(club.id, batch.id, e.target.value); }} className={`text-xs border rounded py-1 px-2 font-bold cursor-pointer outline-none ${status === 'en_produccion' ? 'bg-purple-100 text-purple-700 border-purple-200' : status === 'entregado_club' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
                                                                <option value="recopilando">Recopilando</option>
                                                                <option value="en_produccion">En Producción</option>
                                                                <option value="entregado_club">Entregado</option>
                                                            </select>
                                                            <button onClick={() => { const history = club.batchHistory?.filter(h => h.batchId === batch.id) || []; setBatchHistoryModal({ active: true, history: history.sort((a,b) => new Date(b.date) - new Date(a.date)), batchId: batch.id, clubName: club.name }); }} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200 transition-colors"><NotebookText className="w-4 h-4" /></button>
                                                        </div>
                                                    </>
                                                )}
                                                <button onClick={() => openManageBatchModal(club, batch.id, batch.orders)} className="p-2 ml-2 rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm group" title="Gestionar o Eliminar Lote"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        {!collapsedBatches.includes(batch.id) ? (
                                            <>
                                                {batch.orders.length === 0 ? (
                                                    <div className="pl-4 border-l-4 border-gray-200 py-4 text-gray-400 text-sm italic">Aún no hay pedidos en este lote.</div>
                                                ) : (
                                                    <div className={`pl-4 border-l-4 space-y-2 ${isErrorBatch ? 'border-red-200' : 'border-gray-200'}`}>
                                                        {batch.orders.map(order => (
                                                            <div key={order.id} className={`border rounded-lg bg-white shadow-sm overflow-hidden transition-all hover:border-emerald-300 group/order ${order.type === 'manual' ? 'border-l-4 border-l-orange-400' : order.type === 'replacement' ? 'border-l-4 border-l-red-500' : ''}`}>
                                                                <div onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 select-none">
                                                                    <div className="flex gap-4 items-center">
                                                                        {order.type === 'special' ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">ESP</span> : (order.type === 'replacement' || (order.type === 'manual' && order.paymentMethod === 'incident')) ? (
                                                                            <div className="flex gap-1">
                                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1"><Edit3 className="w-3 h-3"/> MANUAL</span>
                                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> ERROR</span>
                                                                            </div>
                                                                        ) : order.type === 'manual' ? (
                                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1"><Edit3 className="w-3 h-3"/> MANUAL</span>
                                                                        ) : order.globalBatch === 'INDIVIDUAL' ? (
                                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">IND</span>
                                                                        ) : <span className="font-mono text-xs font-bold bg-gray-100 border px-1 rounded text-gray-600">#{order.id.slice(0,6)}</span>}
                                                                        
                                                                        <span className="font-bold text-sm text-gray-800">{order.customer.name}</span>
                                                                        
                                                                        {batch.id === 'INDIVIDUAL' ? (
                                                                            <div onClick={(e) => e.stopPropagation()}> 
                                                                                <select
                                                                                    value={order.status}
                                                                                    onChange={(e) => {
                                                                                        const newSt = e.target.value;
                                                                                        let visibleSt = 'Actualizado';
                                                                                        if (newSt === 'pendiente_validacion') visibleSt = 'Pendiente';
                                                                                        if (newSt === 'en_produccion') visibleSt = 'En Producción';
                                                                                        if (newSt === 'entregado_club') visibleSt = 'Entregado';
                                                                                        updateOrderStatus(order.id, newSt, visibleSt);
                                                                                    }}
                                                                                    className={`text-[10px] font-bold uppercase py-1 px-2 rounded border cursor-pointer outline-none ${order.status === 'en_produccion' ? 'bg-purple-100 text-purple-800 border-purple-200' : order.status === 'entregado_club' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}
                                                                                >
                                                                                    <option value="pendiente_validacion">Pendiente</option>
                                                                                    <option value="en_produccion">En Producción</option>
                                                                                    <option value="entregado_club">Entregado</option>
                                                                                </select>
                                                                            </div>
                                                                        ) : (!isStandard && !isErrorBatch) && <Badge status={order.status} />}
                                                                    </div>
                                                                    <div className="flex gap-4 items-center text-sm">
                                                                        <span className="font-bold">{order.total.toFixed(2)}€</span>
                                                                        <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-90' : ''}`}/>
                                                                    </div>
                                                                </div>
                                                                
                                                                {expandedOrderId === order.id && (
                                                                    <div className="p-4 bg-gray-50 border-t border-gray-100 text-sm animate-fade-in-down">
                                                                        {order.incidentDetails && (
                                                                            <div className="mb-4 bg-red-50 p-3 rounded border border-red-100 text-red-800 text-xs">
                                                                                <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Detalles del Fallo:</p>
                                                                                <p className="mt-1">"{order.incidentDetails.reason}"</p>
                                                                                <p className="mt-1 opacity-75">Responsable: {order.incidentDetails.responsibility === 'internal' ? 'Interno' : 'Club'}</p>
                                                                            </div>
                                                                        )}

                                                                        <h5 className="font-bold text-gray-500 mb-3 text-xs uppercase flex items-center gap-2"><Package className="w-3 h-3"/> Productos</h5>
                                                                        <div className="bg-white rounded border border-gray-200 divide-y divide-gray-100 mb-4">
                                                                            {order.items.map(item => {
                                                                                const isIncident = order.incidents?.some(inc => inc.itemId === item.cartId && !inc.resolved);
                                                                                return (
                                                                                    <div key={item.cartId || Math.random()} className="flex justify-between items-center p-3 hover:bg-gray-50">
                                                                                        <div className="flex gap-3 items-center flex-1">
                                                                                            {item.image ? <img src={item.image} className="w-10 h-10 object-cover rounded bg-gray-200 border" /> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300"><Package className="w-5 h-5"/></div>}
                                                                                            <div>
                                                                                                <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                                                                                                <p className="text-xs text-gray-500">{renderProductDetails(item)}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-6 mr-4">
                                                                                            <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Cant.</p><p className="font-medium text-sm">{item.quantity || 1}</p></div>
                                                                                            <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Precio</p><p className="font-medium text-sm">{item.price.toFixed(2)}€</p></div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 border-l pl-3">
                                                                                            {isIncident ? (
                                                                                                <span className="text-xs text-red-600 font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded"><AlertTriangle className="w-3 h-3"/> Reportado</span>
                                                                                            ) : (
                                                                                                <button onClick={(e) => { e.stopPropagation(); handleOpenIncident(order, item); }} className="text-orange-600 bg-orange-50 hover:bg-orange-100 p-1.5 rounded-md text-xs border border-orange-200 flex items-center gap-1 transition-colors" title="Reportar Fallo / Incidencia"><AlertTriangle className="w-3 h-3"/> Fallo</button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                                            <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                                                                                <h5 className="font-bold text-gray-600 text-xs uppercase flex items-center gap-2"><Mail className="w-3 h-3"/> Historial de Avisos</h5>
                                                                                <span className="text-[10px] text-gray-400">{order.notificationLog ? order.notificationLog.length : 0} registros</span>
                                                                            </div>
                                                                            <div className="max-h-32 overflow-y-auto">
                                                                                {order.notificationLog && order.notificationLog.length > 0 ? (
                                                                                    <table className="w-full text-left text-[10px]">
                                                                                        <thead className="bg-gray-50 text-gray-400"><tr><th className="px-3 py-1 font-medium">Fecha</th><th className="px-3 py-1 font-medium">Cambio</th><th className="px-3 py-1 font-medium">Canal</th></tr></thead>
                                                                                        <tbody className="divide-y divide-gray-50">
                                                                                            {order.notificationLog.map((log, i) => (
                                                                                                <tr key={i} className="hover:bg-gray-50">
                                                                                                    <td className="px-3 py-1.5 text-gray-600">{new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                                                                                    <td className="px-3 py-1.5"><div className="flex items-center gap-2"><span className="text-xs text-gray-400 font-medium">{formatStatus(log.statusFrom)}</span><ArrowRight className="w-3 h-3 text-emerald-500" /><span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{formatStatus(log.statusTo)}</span></div></td>
                                                                                                    <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${log.method === 'email' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{log.method.toUpperCase()}</span></td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                ) : <p className="p-3 text-xs text-gray-400 italic text-center">No se han enviado notificaciones.</p>}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                                                                            <button onClick={(e) => { e.stopPropagation(); const original = JSON.parse(JSON.stringify(order)); const modified = JSON.parse(JSON.stringify(order)); setEditOrderModal({ active: true, original, modified }); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"><Edit3 className="w-3 h-3"/> Modificar</button>
                                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"><Trash2 className="w-3 h-3"/> Eliminar</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="pl-4 py-2 text-xs text-gray-400 italic bg-gray-50 border-t border-gray-100">
                                                <span className="font-bold">{batch.orders.length} pedidos ocultos.</span> Haz clic en la flecha de la cabecera para desplegar.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL CREADOR PEDIDO MANUAL */}
            {manualOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="bg-gray-800 p-5 flex justify-between items-center text-white">
                            <div className="flex items-center gap-3"><Plus className="w-6 h-6 text-emerald-400"/><div><h3 className="text-lg font-bold">Nuevo Pedido Manual</h3><p className="text-xs text-gray-400">Configura destino y tipo de cobro</p></div></div>
                            <button onClick={() => setManualOrderModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Club</label>
                                <select className="w-full border rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-700" value={manualOrderForm.clubId} onChange={(e) => { const c = clubs.find(cl => cl.id === e.target.value); setManualOrderForm({...manualOrderForm, clubId: e.target.value, targetBatch: c?.activeGlobalOrderId}); }}>
                                    <option value="">-- Seleccionar Club --</option>
                                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {manualOrderForm.clubId && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">¿Dónde añadirlo?</label>
                                        <select className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={manualOrderForm.targetBatch} onChange={e => setManualOrderForm({...manualOrderForm, targetBatch: e.target.value})}>
                                            <option value="INDIVIDUAL">📦 Individual / Suelto</option>
                                            <optgroup label="--- Lotes Globales ---">
                                                {(() => {
                                                    const c = clubs.find(cl => cl.id === manualOrderForm.clubId);
                                                    if (!c) return null;
                                                    const activeBatchId = c.activeGlobalOrderId; 
                                                    const options = [];
                                                    const seenValues = new Set();
                                                    if (activeBatchId) {
                                                        const val = activeBatchId.toString();
                                                        seenValues.add(val);
                                                        options.push(<option key={`global-active-${val}`} value={activeBatchId}>🔥 Global Activo #{activeBatchId}</option>);
                                                    }
                                                    orders.filter(o => o.clubId === manualOrderForm.clubId && !['SPECIAL', 'INDIVIDUAL'].includes(o.globalBatch) && !o.globalBatch.toString().startsWith('ERR-') && ['recopilando', 'en_produccion'].includes(o.status)).forEach(o => {
                                                        const val = o.globalBatch.toString();
                                                        if (!seenValues.has(val)) {
                                                            seenValues.add(val);
                                                            options.push(<option key={o.id} value={o.globalBatch}>Global #{o.globalBatch} ({o.status === 'recopilando' ? 'Abierto' : 'Prod.'})</option>);
                                                        }
                                                    });
                                                    return options;
                                                })()}
                                            </optgroup>
                                            <optgroup label="--- Lotes de Errores ---" className="text-red-600 font-bold">
                                                {(() => {
                                                    const c = clubs.find(cl => cl.id === manualOrderForm.clubId);
                                                    const activeErrId = c ? (c.activeErrorBatchId || 1) : 1;
                                                    const activeErrBatch = `ERR-${activeErrId}`;
                                                    const options = [];
                                                    const seenValues = new Set();
                                                    const errorBatches = orders.filter(o => o.clubId === manualOrderForm.clubId && o.globalBatch && o.globalBatch.toString().startsWith('ERR-') && ['recopilando', 'en_produccion'].includes(o.status));
                                                    const allErrOptions = [];
                                                    const existsActiveInDB = errorBatches.some(o => o.globalBatch === activeErrBatch);
                                                    if (!existsActiveInDB) allErrOptions.push({ val: activeErrBatch, label: `🚨 Errores Activo #${activeErrId} (Nuevo)`, isNew: true });
                                                    errorBatches.forEach(o => {
                                                        const isRecopilando = o.status === 'recopilando';
                                                        allErrOptions.push({ val: o.globalBatch, label: `${isRecopilando ? '🚨' : '⚠️'} ${o.visibleStatus || o.globalBatch} (${isRecopilando ? 'Abierto' : 'Prod.'})`, isNew: false });
                                                    });
                                                    allErrOptions.sort((a, b) => b.val.localeCompare(a.val, undefined, { numeric: true }));
                                                    allErrOptions.forEach((opt, idx) => {
                                                        if (!seenValues.has(opt.val)) {
                                                            seenValues.add(opt.val);
                                                            options.push(<option key={`${opt.val}-${idx}`} value={opt.val}>{opt.label}</option>);
                                                        }
                                                    });
                                                    return options;
                                                })()}
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Clasificación</label>
                                        <select className={`w-full border rounded-lg p-2.5 text-sm font-bold outline-none focus:ring-2 ${manualOrderForm.classification === 'standard' ? 'border-gray-300 text-gray-800 focus:ring-emerald-500' : manualOrderForm.classification === 'gift' ? 'border-blue-300 bg-blue-50 text-blue-700 focus:ring-blue-500' : 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500'}`} value={manualOrderForm.classification} onChange={e => setManualOrderForm({...manualOrderForm, classification: e.target.value})}>
                                            <option value="standard">💰 Venta Normal</option>
                                            <option value="gift">🎁 Regalo (Coste Interno)</option>
                                            <option value="incident">⚠️ Fallo / Reposición</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {manualOrderForm.classification === 'incident' && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col gap-2 animate-fade-in">
                                    <label className="text-xs font-bold text-red-700 uppercase">¿Quién asume el coste?</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setManualOrderForm({...manualOrderForm, incidentResponsibility: 'internal'})} className={`flex-1 py-2 text-xs rounded border transition-colors ${manualOrderForm.incidentResponsibility === 'internal' ? 'bg-white border-red-400 text-red-700 font-bold shadow-sm' : 'border-transparent hover:bg-red-100 text-red-500'}`}>Fallo Nuestro (Coste Empresa)</button>
                                        <button onClick={() => setManualOrderForm({...manualOrderForm, incidentResponsibility: 'supplier'})} className={`flex-1 py-2 text-xs rounded border transition-colors ${manualOrderForm.incidentResponsibility === 'supplier' ? 'bg-white border-red-400 text-red-700 font-bold shadow-sm' : 'border-transparent hover:bg-red-100 text-red-500'}`}>Garantía Proveedor (Coste 0)</button>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b border-gray-200 pb-2">Datos Cliente</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input placeholder="Nombre Completo" className="border rounded p-2 text-sm" value={manualOrderForm.customerName} onChange={e => setManualOrderForm({...manualOrderForm, customerName: e.target.value})} />
                                    <input placeholder="Email (Opcional)" className="border rounded p-2 text-sm" value={manualOrderForm.customerEmail} onChange={e => setManualOrderForm({...manualOrderForm, customerEmail: e.target.value})} />
                                    <input placeholder="Teléfono" className="border rounded p-2 text-sm" value={manualOrderForm.customerPhone} onChange={e => setManualOrderForm({...manualOrderForm, customerPhone: e.target.value})} />
                                    {manualOrderForm.classification === 'standard' ? (
                                        <select className="border rounded p-2 text-sm font-bold text-gray-700" value={manualOrderForm.paymentMethod} onChange={e => setManualOrderForm({...manualOrderForm, paymentMethod: e.target.value})}><option value="transfer">Transferencia</option><option value="bizum">Bizum</option><option value="cash">Efectivo</option></select>
                                    ) : (
                                        <div className="border rounded p-2 text-sm bg-gray-200 text-gray-500 font-bold italic text-center">{manualOrderForm.classification === 'gift' ? 'Sin Cobro (Regalo)' : 'Sin Cobro (Incidencia)'}</div>
                                    )}
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border ${manualOrderForm.classification === 'standard' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-200'}`}>
                                <h4 className="text-xs font-bold uppercase mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4"/> Productos</h4>
                                <div className="flex flex-wrap items-end gap-2 mb-4 bg-white p-3 rounded-lg border shadow-sm">
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Producto</label>
                                        <select className="w-full border rounded p-1.5 text-sm font-bold" value={manualOrderForm.tempItem.productId} onChange={(e) => { const p = products.find(prod => prod.id === e.target.value); if(p) { const defs = p.defaults || { name: false, number: false, size: true, shield: true }; setManualOrderForm({...manualOrderForm, tempItem: { ...manualOrderForm.tempItem, productId: p.id, name: '', number: '', size: '', quantity: 1, activeName: defs.name, activeNumber: defs.number, activeSize: defs.size !== undefined ? defs.size : true, activeShield: defs.shield !== undefined ? defs.shield : true } }); } }}>
                                            <option value="">Elegir...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    {(() => {
                                        const selectedProd = products.find(p => p.id === manualOrderForm.tempItem.productId);
                                        if (!selectedProd) return null;
                                        const features = selectedProd.features || { name: true, number: true, size: true, shield: true };
                                        const defaults = selectedProd.defaults || { name: false, number: false, size: true, shield: true };
                                        const modifiable = selectedProd.modifiable || { name: true, number: true, size: true, shield: true };
                                        const fee = financialConfig.modificationFee || 0;
                                        const prodSizes = selectedProd.sizes || [];

                                        let currentPrice = selectedProd.price;
                                        if (modifiable.size && (manualOrderForm.tempItem.activeSize !== defaults.size)) currentPrice += fee;
                                        if (modifiable.name && (manualOrderForm.tempItem.activeName !== defaults.name)) currentPrice += fee;
                                        if (modifiable.number && (manualOrderForm.tempItem.activeNumber !== defaults.number)) currentPrice += fee;
                                        if (modifiable.shield && (manualOrderForm.tempItem.activeShield !== defaults.shield)) currentPrice += fee;

                                        return (
                                            <>
                                                <div className="w-16">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Cant.</label>
                                                    <input type="number" min="1" className="w-full border rounded p-1.5 text-sm" value={manualOrderForm.tempItem.quantity} onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, quantity: e.target.value}})} />
                                                </div>
                                                <div className="w-32">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Categoría</label>
                                                    <div className="relative">
                                                        <select className="w-full border rounded p-1.5 text-sm bg-white outline-none focus:border-emerald-500 appearance-none" value={manualOrderForm.tempItem.category || ''} onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, category: e.target.value}})}>
                                                            <option value="">-- Seleccionar --</option>
                                                            {manualOrderCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                        </select>
                                                        <div className="absolute right-2 top-2 pointer-events-none text-gray-400"><ChevronRight className="w-3 h-3 rotate-90"/></div>
                                                    </div>
                                                </div>
                                                {features.size && (
                                                    <div className="w-28">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <input type="checkbox" checked={manualOrderForm.tempItem.activeSize || false} onChange={(e) => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, activeSize: e.target.checked}})} disabled={!modifiable.size} className="rounded text-emerald-600 cursor-pointer" />
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Talla {modifiable.size && manualOrderForm.tempItem.activeSize !== defaults.size && <span className="ml-1 text-orange-500">{defaults.size ? `(-${fee}€)` : `(+${fee}€)`}</span>}</label>
                                                        </div>
                                                        {prodSizes.length > 0 ? (
                                                            <select className={`w-full border rounded p-1.5 text-sm ${!manualOrderForm.tempItem.activeSize ? 'bg-gray-100 text-gray-400' : ''}`} value={manualOrderForm.tempItem.size} onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, size: e.target.value}})} disabled={!manualOrderForm.tempItem.activeSize}>
                                                                <option value="">Seleccionar...</option>
                                                                {prodSizes.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                        ) : (
                                                            <input className={`w-full border rounded p-1.5 text-sm ${!manualOrderForm.tempItem.activeSize ? 'bg-gray-100 text-gray-400' : ''}`} placeholder="Talla" value={manualOrderForm.tempItem.size} onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, size: e.target.value}})} disabled={!manualOrderForm.tempItem.activeSize} />
                                                        )}
                                                    </div>
                                                )}
                                                {features.name && (
                                                    <div className="flex-1 min-w-[100px]">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <input type="checkbox" checked={manualOrderForm.tempItem.activeName || false} onChange={(e) => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, activeName: e.target.checked}})} disabled={!modifiable.name} className="rounded text-emerald-600 cursor-pointer" />
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Nombre {modifiable.name && manualOrderForm.tempItem.activeName !== defaults.name && <span className="ml-1 text-orange-500">{defaults.name ? `(-${fee}€)` : `(+${fee}€)`}</span>}</label>
                                                        </div>
                                                        <input className={`w-full border rounded p-1.5 text-sm transition-colors ${!manualOrderForm.tempItem.activeName ? 'bg-gray-100 text-gray-400' : ''}`} placeholder="Nombre" value={manualOrderForm.tempItem.name} onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, name: e.target.value}})} disabled={!manualOrderForm.tempItem.activeName} />
                                                    </div>
                                                )}
                                                {features.number && (
                                                    <div className="w-20">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <input type="checkbox" checked={manualOrderForm.tempItem.activeNumber || false} onChange={(e) => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, activeNumber: e.target.checked}})} disabled={!modifiable.number} className="rounded text-emerald-600 cursor-pointer" />
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Dorsal {modifiable.number && manualOrderForm.tempItem.activeNumber !== defaults.number && <span className="ml-1 text-orange-500">{defaults.number ? `(-${fee}€)` : `(+${fee}€)`}</span>}</label>
                                                        </div>
                                                        <input className={`w-full border rounded p-1.5 text-sm transition-colors ${!manualOrderForm.tempItem.activeNumber ? 'bg-gray-100 text-gray-400' : ''}`} placeholder="#" value={manualOrderForm.tempItem.number} onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, number: e.target.value}})} disabled={!manualOrderForm.tempItem.activeNumber} />
                                                    </div>
                                                )}
                                                {features.shield && (
                                                    <div className="w-16 flex flex-col items-center">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Escudo</label>
                                                        <div className="relative">
                                                            <input type="checkbox" checked={manualOrderForm.tempItem.activeShield || false} onChange={(e) => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, activeShield: e.target.checked}})} disabled={!modifiable.shield} className="w-6 h-6 rounded text-emerald-600 cursor-pointer focus:ring-emerald-500" />
                                                            {modifiable.shield && manualOrderForm.tempItem.activeShield !== defaults.shield && <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-orange-500 whitespace-nowrap">{defaults.shield ? `-${fee}€` : `+${fee}€`}</span>}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="w-20">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Precio/Ud</label>
                                                    <div className="relative">
                                                        <input type="text" readOnly className="w-full border rounded p-1.5 text-sm bg-gray-100 text-gray-600 font-bold cursor-not-allowed" value={currentPrice.toFixed(2)} />
                                                        <span className="absolute right-1 top-1.5 text-xs text-gray-400">€</span>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    <button onClick={addManualItemToOrder} className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 shadow-sm"><Plus className="w-4 h-4"/></button>
                                </div>

                                {manualOrderForm.items.length > 0 && (
                                    <div className="space-y-2 mt-4">
                                        {manualOrderForm.items.map((it, idx) => {
                                            const colorLabel = AVAILABLE_COLORS.find(c => c.id === it.color)?.label || it.color;
                                            return (
                                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 text-sm shadow-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2"><span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">{it.quantity}x</span><span className="font-bold text-gray-800">{it.name}</span></div>
                                                        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 pl-8">
                                                            {it.size && <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">T: <b>{it.size}</b></span>}
                                                            {it.color && <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-gray-300" style={{background: AVAILABLE_COLORS.find(c=>c.id===it.color)?.hex || it.color}}></span>{colorLabel}</span>}
                                                            {it.playerName && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">N: <b>{it.playerName}</b></span>}
                                                            {it.playerNumber && <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">#: <b>{it.playerNumber}</b></span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-bold text-gray-900">{it.price.toFixed(2)}€</span>
                                                        <button onClick={() => { const newItems = [...manualOrderForm.items]; newItems.splice(idx, 1); setManualOrderForm({...manualOrderForm, items: newItems}); }} className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded"><X className="w-4 h-4"/></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                                            <span className="text-xs font-bold text-gray-500 uppercase">Total Estimado</span>
                                            <span className="text-xl font-black text-emerald-700">{manualOrderForm.items.reduce((acc, i) => acc + (i.price*i.quantity), 0).toFixed(2)}€</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button onClick={() => { setManualOrderModal(false); setManualOrderForm(INITIAL_MANUAL_FORM_STATE); }} className="px-4 py-2 text-gray-500 hover:text-gray-800 font-bold text-sm">Cancelar</button>
                            <button onClick={submitManualOrder} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold shadow-lg hover:bg-black transition-transform active:scale-95 flex items-center gap-2"><Check className="w-4 h-4"/> Confirmar Pedido</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};