import React, { useState, useMemo, useEffect } from 'react';
// Importamos los iconos necesarios para el panel de estadísticas y listas
import { Calendar, Package, Euro, Banknote, Ban, AlertTriangle, Layers, User, ChevronRight } from 'lucide-react';

// Importamos los componentes genéricos
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

/* * ============================================================================
 * 🏟️ VISTA: PANEL DE CONTROL DEL CLUB
 * ============================================================================
 * Vista privada para que los clubes vean sus estadísticas de ventas, 
 * dinero recaudado y el estado de sus lotes de pedidos.
 */


export function ClubDashboard({ club, orders, updateOrderStatus, config, seasons }) {
    const [selectedSeasonId, setSelectedSeasonId] = useState(seasons[seasons.length - 1]?.id || 'all');
    // Estado para controlar qué lotes están desplegados (vacío = todos plegados)
    const [expandedBatchIds, setExpandedBatchIds] = useState([]);

    // 1. Filtrado por Temporada
    const filteredHistory = useMemo(() => { 
        let result = orders.filter(o => o.clubId === club.id); 
        if (selectedSeasonId !== 'all') { 
            const season = seasons.find(s => s.id === selectedSeasonId); 
            if (season) { 
                const start = new Date(season.startDate).getTime(); 
                const end = new Date(season.endDate).getTime(); 
                result = result.filter(o => { 
                    const orderDate = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now(); 
                    return orderDate >= start && orderDate <= end; 
                }); 
            } 
        } 
        // Filtramos solo los que NO están pendientes de validación para estadísticas
        return result.filter(o => o.status !== 'pendiente_validacion'); 
    }, [orders, club.id, selectedSeasonId, seasons]);

    // 2. Agrupación de Lotes (Globales, Individuales, Errores)
    const batches = useMemo(() => { 
        const groups = {}; 
        
        filteredHistory.forEach(order => { 
            let batchId = order.globalBatch || 1;
            // Normalizar IDs
            if (order.type === 'special') batchId = 'SPECIAL';
            else if (String(batchId) === 'INDIVIDUAL') batchId = 'INDIVIDUAL';
            
            if (!groups[batchId]) groups[batchId] = []; 
            groups[batchId].push(order); 
        }); 

        return Object.entries(groups).map(([id, orders]) => {
            const isError = String(id).startsWith('ERR');
            const isIndividual = String(id) === 'INDIVIDUAL';
            const isSpecial = String(id) === 'SPECIAL';
            const numericId = (!isError && !isIndividual && !isSpecial) ? parseInt(id) : id;
            
            return { 
                id: numericId,
                displayId: id,
                orders, 
                type: isError ? 'error' : isIndividual ? 'individual' : isSpecial ? 'special' : 'global'
            };
        }).sort((a, b) => {
            // Orden: Errores, luego Lotes numéricos descendentes, luego Individuales
            if (a.type === 'error' && b.type !== 'error') return -1;
            if (a.type !== 'error' && b.type === 'error') return 1;
            if (a.type === 'global' && b.type === 'global') return b.id - a.id;
            return 0;
        }); 
    }, [filteredHistory]);

    // 3. Cálculos Estadísticos
    // A) Total Productos Vendidos (Número de artículos)
    const totalProducts = filteredHistory.reduce((sum, o) => sum + o.items.reduce((is, i) => is + (i.quantity || 1), 0), 0);

    // B) Total Comisión Ganada por el Club (Su beneficio)
    const totalSales = filteredHistory.reduce((sum, o) => sum + o.total, 0);
    const totalCommission = totalSales * (club.commission || config.clubCommissionPct || 0.12);

    // C) Lógica de Efectivo (Dinero en mano del club pendiente de que FotoEsport lo recoja)
    // Se calcula sumando los pedidos en efectivo de lotes que NO han sido marcados como "cashCollected" por el admin
    const cashHeldByClub = batches.reduce((sum, batch) => {
        const batchLog = club.accountingLog?.[batch.displayId];
        // Si el admin YA lo marcó como recogido (cashCollected == true), entonces el club ya no tiene ese dinero.
        if (batchLog?.cashCollected) return sum;

        // Si no está recogido, sumamos el efectivo de ese lote
        const batchCash = batch.orders
            .filter(o => o.paymentMethod === 'cash')
            .reduce((s, o) => s + o.total, 0);
        
        return sum + batchCash;
    }, 0);

    // D) Pedidos pendientes de validación (El cliente dice que pagó, el club debe confirmar)
    const pendingCashOrders = orders.filter(o => o.clubId === club.id && o.status === 'pendiente_validacion');

    const toggleBatch = (batchId) => {
        if (expandedBatchIds.includes(batchId)) {
            setExpandedBatchIds(expandedBatchIds.filter(id => id !== batchId));
        } else {
            setExpandedBatchIds([...expandedBatchIds, batchId]);
        }
    };

    const isCashEnabled = club.cashPaymentEnabled !== false;

    return (
        <div className="space-y-8 animate-fade-in">
            
            {/* 1. CABECERA Y SELECTOR */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Hola, {club.name}</h1>
                    <p className="text-gray-500 text-sm mt-1">Resumen de actividad y estado financiero.</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                    <Calendar className="w-5 h-5 text-emerald-600"/>
                    <select 
                        className="bg-transparent border-none font-bold text-gray-700 focus:ring-0 cursor-pointer text-sm outline-none" 
                        value={selectedSeasonId} 
                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                    >
                        <option value="all">Todas las Temporadas</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. TARJETAS DE ESTADÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total Merchandising */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Package className="w-24 h-24"/>
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-100 font-bold text-xs uppercase tracking-wider mb-2">Merchandising Vendido</p>
                        <p className="text-4xl font-extrabold">{totalProducts}</p>
                        <p className="text-sm text-blue-100 mt-1">Productos totales</p>
                    </div>
                </div>

                {/* Total Ganado (Comisión) */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Euro className="w-24 h-24"/>
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-bold text-xs uppercase tracking-wider mb-2">Beneficio del Club</p>
                        <p className="text-4xl font-extrabold">{totalCommission.toFixed(2)}€</p>
                        <p className="text-sm text-emerald-100 mt-1">Total ganado esta temporada</p>
                    </div>
                </div>

                {/* Panel Efectivo */}
                {isCashEnabled ? (
                    <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Banknote className="w-24 h-24"/>
                        </div>
                        <div className="relative z-10">
                            <p className="text-orange-100 font-bold text-xs uppercase tracking-wider mb-2">Efectivo en Caja</p>
                            <p className="text-4xl font-extrabold">{cashHeldByClub.toFixed(2)}€</p>
                            <div className="mt-2 bg-black/10 p-2 rounded text-[10px] text-orange-50 backdrop-blur-sm">
                                Pendiente de entregar a FotoEsport.
                                <br/>(Se descuenta al liquidar lotes)
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-100 rounded-2xl p-6 border-2 border-gray-200 border-dashed relative overflow-hidden flex flex-col justify-center items-center text-center opacity-70">
                        <Ban className="w-12 h-12 text-gray-400 mb-2"/>
                        <p className="text-gray-500 font-bold text-lg">Efectivo No Activado</p>
                        <p className="text-gray-400 text-xs">Gestión desactivada por FotoEsport Merch</p>
                    </div>
                )}
            </div>

            {/* 3. ALERTA DE PAGOS EN EFECTIVO PENDIENTES */}
            {isCashEnabled && pendingCashOrders.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm animate-pulse-slow">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-100 p-3 rounded-full text-red-600">
                            <AlertTriangle className="w-6 h-6"/>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-red-800 text-lg">Acción Requerida: Validar Cobros</h3>
                            <p className="text-red-600 text-sm mb-4">
                                Tienes <strong>{pendingCashOrders.length} pedidos</strong> marcados como "Pago en Efectivo" que los clientes dicen haber pagado. 
                                Confirma que has recibido el dinero para que pasen a producción.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {pendingCashOrders.map(order => (
                                    <div key={order.id} className="bg-white p-3 rounded-lg border border-red-200 shadow-sm flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">#{order.id.slice(0,6)}</p>
                                            <p className="text-xs text-gray-500">{order.customer.name}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-bold text-gray-800">{order.total.toFixed(2)}€</span>
                                            <Button 
                                                size="xs" 
                                                onClick={() => updateOrderStatus(order.id, 'recopilando', 'Pago validado', order)} 
                                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] py-1 px-2 h-auto"
                                            >
                                                Confirmar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. LISTADO DE LOTES Y PEDIDOS */}
            <div className="space-y-6">
                <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2 border-b pb-2">
                    <Layers className="w-6 h-6 text-indigo-600"/> 
                    Historial de Lotes y Pedidos
                </h3>
                
                {batches.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                        <p className="text-gray-500 font-medium">No hay pedidos registrados en este periodo.</p>
                    </div>
                ) : (
                    batches.map(batch => {
                        const isExpanded = expandedBatchIds.includes(batch.displayId);
                        const status = batch.orders[0]?.status || 'recopilando';
                        const itemCount = batch.orders.reduce((acc, o) => acc + o.items.reduce((iAcc, i) => iAcc + (i.quantity || 1), 0), 0);
                        
                        // Estilos según tipo
                        let headerClass = "bg-white border-gray-200 hover:border-gray-300";
                        let titleColor = "text-gray-800";
                        let icon = <Package className="w-5 h-5 text-indigo-600"/>;

                        if (batch.type === 'error') {
                            headerClass = "bg-red-50 border-red-200 hover:border-red-300";
                            titleColor = "text-red-700";
                            icon = <AlertTriangle className="w-5 h-5 text-red-600"/>;
                        } else if (batch.type === 'individual') {
                            headerClass = "bg-orange-50 border-orange-200 hover:border-orange-300";
                            titleColor = "text-orange-800";
                            icon = <User className="w-5 h-5 text-orange-600"/>;
                        }

                        return (
                            <div key={batch.displayId} className={`border rounded-xl overflow-hidden transition-all shadow-sm ${headerClass}`}>
                                {/* CABECERA DEL ACORDEÓN */}
                                <div 
                                    onClick={() => toggleBatch(batch.displayId)}
                                    className="p-5 flex flex-col md:flex-row justify-between items-center cursor-pointer select-none gap-4"
                                >
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`p-3 rounded-full ${batch.type === 'error' ? 'bg-red-100' : 'bg-gray-100'}`}>
                                            {icon}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${titleColor}`}>
                                                {batch.type === 'global' ? `Pedido Global #${batch.id}` : 
                                                 batch.type === 'error' ? `Lote de Incidencias #${batch.displayId.split('-')[1]}` : 
                                                 batch.type === 'special' ? 'Pedidos Especiales' :
                                                 'Pedidos Individuales'}
                                            </h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <span className="bg-white px-2 py-0.5 rounded border shadow-sm font-medium text-xs">
                                                    {batch.orders.length} pedidos
                                                </span>
                                                <span>•</span>
                                                <span className="font-medium">{itemCount} productos</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                        <Badge status={status} />
                                        <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-gray-200 rotate-180' : 'bg-gray-100'}`}>
                                            <ChevronRight className="w-5 h-5 text-gray-600 rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                {/* CONTENIDO DESPLEGABLE */}
                                {isExpanded && (
                                    <div className="border-t border-gray-200 bg-gray-50/50 p-4 animate-fade-in">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {batch.orders.map(order => (
                                                <div key={order.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-50">
                                                        <div>
                                                            <p className="font-bold text-gray-800">{order.customer.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono">ID: {order.id.slice(0,8)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${order.paymentMethod === 'cash' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {order.paymentMethod === 'cash' ? 'Efectivo' : 'Online'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* LISTA DE ITEMS (SIN PRECIO, COMO PEDISTE) */}
                                                    <div className="space-y-2">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 text-sm">
                                                                <div className="bg-gray-100 w-8 h-8 rounded flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">
                                                                    {item.quantity || 1}x
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-700 truncate">{item.name}</p>
                                                                    <p className="text-xs text-gray-400 truncate">
                                                                        {[
                                                                            item.size ? `T: ${item.size}` : null,
                                                                            item.playerName ? `N: ${item.playerName}` : null,
                                                                            item.playerNumber ? `#: ${item.playerNumber}` : null
                                                                        ].filter(Boolean).join(' | ')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}