import React, { useState, useMemo, useEffect } from 'react';
// Importamos los iconos necesarios para el panel de estadísticas y listas
import { Calendar, Package, Euro, Banknote, Ban, AlertTriangle, Layers, User, ChevronRight, Folder, Image, Download, RefreshCw, X } from 'lucide-react';

// Añade las importaciones de Firebase Storage
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

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

    // --- NUEVOS ESTADOS PARA LA GALERÍA DE FOTOS ---
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

    // Efecto para cargar las carpetas (categorías) del club desde Storage
    useEffect(() => {
        const fetchFolders = async () => {
            try {
                const clubRef = ref(storage, club.name);
                const res = await listAll(clubRef);
                setFolders(res.prefixes.map(p => p.name));
            } catch (error) {
                console.error("Error al cargar carpetas del club:", error);
            }
        };
        fetchFolders();
    }, [club.name]);

    // Función para cargar las fotos cuando hacen clic en una carpeta
    const handleSelectFolder = async (folderName) => {
        setSelectedFolder(folderName);
        setLoadingPhotos(true);
        try {
            const folderRef = ref(storage, `${club.name}/${folderName}`);
            const res = await listAll(folderRef);
            
            const loadedPhotos = [];
            for (const item of res.items) {
                const url = await getDownloadURL(item);
                loadedPhotos.push({ name: item.name, url });
            }
            setPhotos(loadedPhotos);
        } catch (error) {
            console.error("Error al cargar fotos:", error);
        }
        setLoadingPhotos(false);
    };
    // -----------------------------------------------

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

            {/* ==========================================
                3.5. MÓDULO DE SINERGIA B2B: SOONER (PREPARADO PARA EL FUTURO)
                Para activarlo, solo tienes que quitar el "{ /*" de la línea de abajo 
                y el "* / }" de la última línea de este bloque.
                ========================================== */}
            
            {/* <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 md:p-8 shadow-xl border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
                
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 z-10 w-full">
                    
                    <div className="bg-white px-2 py-2 md:px-4 md:py-2 rounded-2xl shadow-inner w-48 h-24 md:w-64 md:h-28 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        <img 
                            src="/sooner-logo.png" 
                            alt="Sooner Logo" 
                            className="w-full h-full object-contain scale-[1.15] md:scale-[1.25] transition-transform duration-300 group-hover:scale-[1.20] md:group-hover:scale-[1.30]"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                        <Layers className="w-12 h-12 text-emerald-600 hidden" />
                    </div>
                    
                    <div className="text-center md:text-left flex-1 flex flex-col justify-center h-full pt-1 md:pt-2">
                        <div className="flex flex-col md:flex-row items-center gap-3 mb-3 justify-center md:justify-start">
                            <span className="text-emerald-400 font-bold text-xs md:text-sm tracking-wider uppercase">Grupo Avantia</span>
                            <span className="hidden md:inline text-gray-500">•</span>
                            <span className="bg-emerald-500/20 text-emerald-300 text-xs md:text-sm font-medium px-3 py-1 rounded-full border border-emerald-500/30">
                                Ventaja exclusiva para clientes
                            </span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            Revoluciona la gestión con <span className="text-emerald-400">Sooner</span>
                        </h3>
                        <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed">
                            El software definitivo para automatizar la gestión de fichas, cuotas y la administración general de tu club deportivo. 
                            Por confiar en nuestro servicio de merchandising, accede a una <strong>prueba gratuita y condiciones especiales</strong> en tu suscripción.
                        </p>
                    </div>
                </div>
                
                <div className="z-10 w-full md:w-auto flex-shrink-0 mt-4 md:mt-0">
                    <a 
                        href="https://sooner.es" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-center gap-2 w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-6 md:px-8 md:py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 text-base md:text-lg"
                    >
                        Solicitar Demo Gratuita
                        <ChevronRight className="w-5 h-5" />
                    </a>
                </div>
            </div>
            */}

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
                                                            <p className="text-[12px] text-gray-400 font-mono">ID: {order.id.slice(0,8)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-[12px] font-bold px-2 py-1 rounded uppercase ${order.paymentMethod === 'cash' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {order.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* LISTA DE ITEMS CORREGIDA CON TODOS LOS DATOS */}
                                                    <div className="space-y-2 mt-3">
                                                        {order.items.map((item, idx) => {
                                                            // Extraemos la información de los jugadores extra de forma segura
                                                            const p2 = item.details?.player2;
                                                            const p3 = item.details?.player3;
                                                            const hasP2 = p2 && (p2.name || p2.number || p2.category);
                                                            const hasP3 = p3 && (p3.name || p3.number || p3.category);

                                                            return (
                                                                <div key={idx} className="flex items-start gap-3 text-sm bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
                                                                    <div className="bg-white border border-gray-200 w-8 h-8 rounded flex items-center justify-center font-bold text-gray-700 text-xs shrink-0 mt-0.5 shadow-sm">
                                                                        {item.quantity || 1}x
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 space-y-1">
                                                                        <p className="font-bold text-gray-800 leading-tight">{item.name}</p>
                                                                        
                                                                        {/* Datos del Jugador 1: Solo muestra lo que realmente existe */}
                                                                        <p className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                                                                            {item.category && <span><strong className="text-gray-400 font-medium">Cat:</strong> {item.category}</span>}
                                                                            {item.size && <span><strong className="text-gray-400 font-medium">T:</strong> {item.size}</span>}
                                                                            {item.playerName && <span><strong className="text-gray-400 font-medium">N:</strong> {item.playerName}</span>}
                                                                            {item.playerNumber && <span><strong className="text-gray-400 font-medium">#:</strong> {item.playerNumber}</span>}
                                                                            {item.photoFileName && <span><strong className="text-gray-400 font-medium">📸 Foto:</strong> {item.photoFileName}</span>}
                                                                        </p>

                                                                        {/* Datos del Jugador 2 */}
                                                                        {hasP2 && (
                                                                            <p className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-100 pt-1 mt-1">
                                                                                <span className="font-bold text-blue-600">J2:</span>
                                                                                {p2.category && <span><strong className="text-gray-400 font-medium">Cat:</strong> {p2.category}</span>}
                                                                                {p2.name && <span><strong className="text-gray-400 font-medium">N:</strong> {p2.name}</span>}
                                                                                {p2.number && <span><strong className="text-gray-400 font-medium">#:</strong> {p2.number}</span>}
                                                                                {item.photoFileName2 && <span className="ml-1"><strong className="text-gray-400 font-medium">📸 Foto:</strong> {item.photoFileName2}</span>}
                                                                            </p>
                                                                        )}

                                                                        {/* Datos del Jugador 3 */}
                                                                        {hasP3 && (
                                                                            <p className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1 border-t border-gray-100 pt-1 mt-1">
                                                                                <span className="font-bold text-purple-600">J3:</span>
                                                                                {p3.category && <span><strong className="text-gray-400 font-medium">Cat:</strong> {p3.category}</span>}
                                                                                {p3.name && <span><strong className="text-gray-400 font-medium">N:</strong> {p3.name}</span>}
                                                                                {p3.number && <span><strong className="text-gray-400 font-medium">#:</strong> {p3.number}</span>}
                                                                                {item.photoFileName3 && <span className="ml-1"><strong className="text-gray-400 font-medium">📸 Foto:</strong> {item.photoFileName3}</span>}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
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
            {/* 5. SECCIÓN NUEVA: GALERÍA DE FOTOS */}
            <div className="space-y-6 mt-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-2 gap-4">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                        <Image className="w-6 h-6 text-indigo-600"/> 
                        Galería Fotográfica Oficial
                    </h3>
                    
                    {/* BOTÓN DE DESCARGA DROPBOX */}
                    {club.dropboxLink ? (
                        <a 
                            href={club.dropboxLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md hover:shadow-lg"
                        >
                            <Download className="w-4 h-4"/> Descargar Todas las Fotos
                        </a>
                    ) : (
                        <button disabled className="flex items-center gap-2 bg-gray-50 text-gray-400 px-4 py-2.5 rounded-xl font-bold text-sm border border-gray-200 cursor-not-allowed">
                            <Download className="w-4 h-4"/> Enlace de descarga pendiente de generar
                        </button>
                    )}
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    {/* Botones de Categorías */}
                    <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                        {folders.length === 0 && <p className="text-gray-500 text-sm">No hay carpetas de fotos disponibles en el servidor.</p>}
                        {folders.map(folder => (
                            <button
                                key={folder}
                                onClick={() => handleSelectFolder(folder)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold whitespace-nowrap transition-all shadow-sm ${selectedFolder === folder ? 'bg-indigo-50 border-indigo-200 text-indigo-700 scale-105' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}
                            >
                                <Folder className={`w-4 h-4 ${selectedFolder === folder ? 'text-indigo-500 fill-indigo-100' : 'text-gray-400 fill-gray-50'}`}/>
                                {folder}
                            </button>
                        ))}
                    </div>

                    {/* Visor de Fotos de la Categoría Seleccionada */}
                    {selectedFolder && (
                    <div className="mt-6 pt-6 border-t border-gray-100 animate-fade-in">
                        
                        {/* NUEVO ENCABEZADO CON BOTÓN DE CERRAR */}
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                Fotografías de {selectedFolder}
                                <span className="bg-gray-100 border border-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full text-xs shadow-sm">{photos.length} imágenes</span>
                            </h4>
                            
                            <button 
                                onClick={() => { 
                                    setSelectedFolder(null); // Quita la selección de carpeta
                                    setPhotos([]); // Limpia las fotos
                                }}
                                className="flex items-center justify-center p-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-full transition-all shadow-sm"
                                title="Cerrar carpeta"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* FIN NUEVO ENCABEZADO */}

                            {loadingPhotos ? (
                                <div className="flex flex-col justify-center items-center py-16 gap-3">
                                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin"/>
                                    <p className="text-gray-500 font-medium text-sm">Cargando fotografías seguras...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {photos.length === 0 && <p className="text-gray-500 text-sm col-span-full text-center py-8">No hay fotos en esta carpeta.</p>}
                                    {photos.map(photo => (
                                        // AÑADIDO: onClick, cursor-pointer
                                        <div 
                                            key={photo.name} 
                                            onClick={() => setFullscreenPhoto(photo)}
                                            className="group relative aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <img 
                                                src={photo.url} 
                                                alt={photo.name} 
                                                // MANTENEMOS EL DISEÑO ORIGINAL: object-cover
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                loading="lazy" 
                                            />
                                            {/* Capa oscura on-hover con nombre - AÑADIDO: pointer-events-none */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 pointer-events-none">
                                                <p className="text-white text-xs font-medium truncate w-full shadow-sm">{photo.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* FIN SECCIÓN GALERÍA DE FOTOS */}

            {/* 6. NUEVA SECCIÓN: VISOR DE FOTO A PANTALLA COMPLETA */}
            {fullscreenPhoto && (
                <div 
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 animate-fade-in"
                    onClick={() => setFullscreenPhoto(null)} // Cierra al hacer clic en el fondo
                >
                    <button 
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                        onClick={() => setFullscreenPhoto(null)} // Cierra al hacer clic en el botón
                    >
                        {/* Botón X simple con SVG para no tener que importar iconos nuevos */}
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                    
                    <img 
                        src={fullscreenPhoto.url} 
                        alt={fullscreenPhoto.name} 
                        className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
                        onClick={(e) => e.stopPropagation()} // Evita que al hacer clic en la foto se cierre
                    />
                    
                    <p className="text-white mt-4 font-bold text-lg tracking-wide shadow-sm">{fullscreenPhoto.name}</p>
                </div>
            )}
        </div>
    );
}