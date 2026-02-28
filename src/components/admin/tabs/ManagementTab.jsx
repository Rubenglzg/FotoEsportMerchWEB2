import React, { useState, useEffect } from 'react';
import { Award, Store, Ban, Banknote, Package, Plus, Users, Upload, EyeOff, Eye, Gift, Trash2, Copy, Tag, Mail, Download } from 'lucide-react';

// 1. Aquí van las cosas de la base de datos (Firestore)
import { doc, setDoc, getDocs, query, collection, addDoc, deleteDoc } from 'firebase/firestore';

// 2. Tu configuración local
import { db } from '../../../config/firebase'; 
import { Button } from '../../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
import { ClubEditorRow } from '../ClubEditorRow';

export const ManagementTab = ({
    campaignConfig, setCampaignConfig,
    storeConfig, setStoreConfig,
    financialConfig, setFinancialConfig, updateFinancialConfig,
    products, addProduct, updateProduct, deleteProduct, suppliers,
    clubs, createClub, updateClub, deleteClub, toggleClubBlock,
    showNotification,
}) => {
    const [showNewClubPass, setShowNewClubPass] = useState(false);
    const [newClubColor, setNewClubColor] = useState('white');

    // --- NUEVOS ESTADOS PARA CÓDIGOS DE REGALO ---
    const [giftCodes, setGiftCodes] = useState([]);
    const [filterStatus, setFilterStatus] = useState('pending'); // 'pending' | 'redeemed'
    const [newManualProduct, setNewManualProduct] = useState('');
    const [newManualEmail, setNewManualEmail] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Cargar los códigos al abrir la pestaña
    const fetchGiftCodes = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'giftCodes')));
            const codes = snap.docs.map(d => ({id: d.id, ...d.data()}));
            // Ordenar por fecha de creación (más recientes primero)
            codes.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            setGiftCodes(codes);
        } catch (err) {
            console.error("Error cargando códigos:", err);
            showNotification("Error al cargar los códigos de regalo", "error");
        }
    };

    useEffect(() => {
        fetchGiftCodes();
    }, []);

    // Función para generar un código manualmente
    const handleGenerateManualCode = async () => {
        if (!newManualProduct) return showNotification("Debes seleccionar un producto a regalar", "error");
        setIsGenerating(true);

        const prod = products.find(p => p.id === newManualProduct);
        const codeStr = `MAN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        try {
            await addDoc(collection(db, 'giftCodes'), {
                code: codeStr,
                type: 'manual',
                productId: prod.id,
                productName: prod.name,
                userEmail: newManualEmail || 'Generado Manualmente',
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            showNotification("Código de regalo generado con éxito");
            setNewManualProduct('');
            setNewManualEmail('');
            fetchGiftCodes(); // Recargamos la lista
        } catch (e) {
            console.error(e);
            showNotification("Hubo un error al generar el código", "error");
        }
        setIsGenerating(false);
    };

    // Función para borrar un código (solo si no se ha usado)
    const handleDeleteCode = async (id) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este código? Dejará de funcionar.")) return;
        try {
            await deleteDoc(doc(db, 'giftCodes', id));
            showNotification("Código eliminado correctamente");
            fetchGiftCodes();
        } catch (e) {
            showNotification("Error al eliminar el código", "error");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        showNotification("Código copiado al portapapeles");
    };

    return (
        <div className="space-y-8 animate-fade-in">
            
            {/* CONFIGURACIONES GLOBALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ESTADO DE LA TIENDA */}
                <div className={`rounded-xl shadow-sm border p-5 flex items-center justify-between transition-all ${storeConfig.isOpen ? 'bg-white border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${storeConfig.isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {storeConfig.isOpen ? <Store className="w-6 h-6"/> : <Ban className="w-6 h-6"/>}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800">Estado de la Tienda</h4>
                            <p className={`text-xs font-medium ${storeConfig.isOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                                {storeConfig.isOpen ? 'Abierta al público' : 'Cerrada por mantenimiento'}
                            </p>
                            {!storeConfig.isOpen && (
                                <input 
                                    className="mt-2 text-xs border border-red-200 p-1.5 rounded w-full bg-white text-red-800 placeholder-red-300 focus:outline-none" 
                                    value={storeConfig.closedMessage} 
                                    onChange={e => setStoreConfig({...storeConfig, closedMessage: e.target.value})} 
                                    placeholder="Mensaje de cierre..."
                                />
                            )}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setStoreConfig({...storeConfig, isOpen: !storeConfig.isOpen})}
                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 shadow-inner ${storeConfig.isOpen ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow transition-transform duration-300 ${storeConfig.isOpen ? 'translate-x-6' : 'translate-x-0'}`}/>
                    </button>
                </div>

                {/* CONFIGURACIÓN FINANCIERA */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <Banknote className="w-5 h-5 text-blue-600"/>
                        <h4 className="font-bold text-gray-800 text-sm uppercase">Configuración Financiera</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Comisión Comercial Global</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 rounded-lg p-2 text-right pr-6 font-bold text-gray-800 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                    value={(financialConfig.commercialCommissionPct * 100).toFixed(0)}
                                    onChange={(e) => setFinancialConfig(prev => ({...prev, commercialCommissionPct: parseFloat(e.target.value)/100}))}
                                    onBlur={() => updateFinancialConfig(financialConfig)}
                                />
                                <span className="absolute right-2 top-2 text-gray-400 font-bold text-sm">%</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Extra Personalización</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    step="0.10"
                                    className="w-full border border-gray-300 rounded-lg p-2 text-right pr-6 font-bold text-gray-800 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                    value={financialConfig.modificationFee}
                                    onChange={(e) => setFinancialConfig(prev => ({...prev, modificationFee: parseFloat(e.target.value)}))}
                                    onBlur={() => updateFinancialConfig(financialConfig)}
                                />
                                <span className="absolute right-2 top-2 text-gray-400 font-bold text-sm">€</span>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-1">Coste unitario por cada modificación.</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Coste Pasarela (Var + Fijo)</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type="number" step="0.1"
                                        className="w-full border border-gray-300 rounded-lg p-2 text-right pr-5 font-bold text-gray-800 text-xs focus:border-blue-500 outline-none"
                                        value={(financialConfig.gatewayPercentFee * 100).toFixed(1)}
                                        onChange={(e) => setFinancialConfig(prev => ({...prev, gatewayPercentFee: parseFloat(e.target.value)/100}))}
                                        onBlur={() => updateFinancialConfig(financialConfig)}
                                    />
                                    <span className="absolute right-1 top-2 text-gray-400 font-bold text-[10px]">%</span>
                                </div>
                                <div className="relative flex-1">
                                    <input 
                                        type="number" step="0.01"
                                        className="w-full border border-gray-300 rounded-lg p-2 text-right pr-4 font-bold text-gray-800 text-xs focus:border-blue-500 outline-none"
                                        value={financialConfig.gatewayFixedFee}
                                        onChange={(e) => setFinancialConfig(prev => ({...prev, gatewayFixedFee: parseFloat(e.target.value)}))}
                                        onBlur={() => updateFinancialConfig(financialConfig)}
                                    />
                                    <span className="absolute right-1 top-2 text-gray-400 font-bold text-[10px]">€</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN PRINCIPAL DIVIDIDA EN DOS COLUMNAS (CÓDIGOS Y CLUBES) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 max-w-7xl mx-auto gap-8 items-start">
                
                {/* --- COLUMNA IZQUIERDA: GESTIÓN DE CÓDIGOS DE REGALO --- */}
                <div className="space-y-6">
                    {/* Generador Manual de Códigos */}
                    <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-2xl shadow-sm border border-pink-100 p-6 relative overflow-hidden">
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-pink-50 text-pink-500">
                                <Gift className="w-6 h-6"/>
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-pink-900 leading-tight">Generar Código Regalo</h3>
                                <p className="text-xs text-pink-500 font-medium">Crea un código promocional de un solo uso</p>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm relative z-10 space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">1. ¿Qué producto vas a regalar?</label>
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none transition-all"
                                    value={newManualProduct}
                                    onChange={(e) => setNewManualProduct(e.target.value)}
                                >
                                    <option value="">-- Selecciona un producto del catálogo --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">2. Email de referencia (Opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: cliente@email.com o 'Sorteo Instagram'"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none transition-all"
                                    value={newManualEmail}
                                    onChange={(e) => setNewManualEmail(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleGenerateManualCode}
                                disabled={isGenerating}
                                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-sm disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4"/> {isGenerating ? 'Generando...' : 'Crear Código Ahora'}
                            </button>
                        </div>
                    </div>

                    {/* Lista de Códigos Generados */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <Tag className="w-5 h-5 text-pink-600"/> Historial de Códigos
                            </h4>
                            <div className="flex gap-1 bg-white border rounded-lg p-1 shadow-sm">
                                <button onClick={() => setFilterStatus('pending')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${filterStatus === 'pending' ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-gray-100'}`}>Pendientes</button>
                                <button onClick={() => setFilterStatus('redeemed')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${filterStatus === 'redeemed' ? 'bg-gray-200 text-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>Canjeados</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {giftCodes.filter(c => c.status === filterStatus).length === 0 ? (
                                <p className="text-center text-gray-400 py-10">No hay códigos en esta categoría.</p>
                            ) : (
                                giftCodes.filter(c => c.status === filterStatus).map(code => (
                                    <div key={code.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-lg font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded tracking-wide border border-pink-100">
                                                        {code.code}
                                                    </span>
                                                    {filterStatus === 'pending' && (
                                                        <button onClick={() => copyToClipboard(code.code)} className="text-gray-400 hover:text-pink-600 p-1" title="Copiar código">
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-sm font-bold text-gray-800">{code.productName}</p>
                                            </div>
                                            {filterStatus === 'pending' && (
                                                <button onClick={() => handleDeleteCode(code.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Borrar código">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col gap-1 text-[11px] text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                                            <p><strong className="text-gray-600">Email/Ref:</strong> {code.userEmail}</p>
                                            <div className="flex justify-between">
                                                <p><strong className="text-gray-600">Origen:</strong> {code.type === 'incident' ? `Incidencia #${code.incidentId.slice(0,6)}` : 'Manual'}</p>
                                                <p>{new Date(code.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            {code.status === 'redeemed' && code.redeemedAt && (
                                                <p className="text-emerald-600 font-bold mt-1">✓ Canjeado el {new Date(code.redeemedAt).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* --- COLUMNA DERECHA: GESTIÓN DE CLUBES --- */}
                <div className="space-y-6">
                    {/* Alta de Nuevo Club */}
                    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl shadow-sm border border-indigo-100 p-6 relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-50 text-indigo-600">
                                <Users className="w-6 h-6"/>
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-indigo-900 leading-tight">Alta de Nuevo Club</h3>
                                <p className="text-xs text-indigo-400 font-medium">Registra una nueva entidad en el sistema</p>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                <div className="md:col-span-3 flex flex-col items-center">
                                    <label className="w-full aspect-square rounded-xl bg-indigo-50/50 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all relative overflow-hidden group">
                                        <Upload className="w-6 h-6 text-indigo-300 mb-1 group-hover:scale-110 transition-transform group-hover:text-indigo-500"/>
                                        <span id="fileNameDisplay" className="text-[9px] text-indigo-400 font-bold uppercase text-center leading-tight px-1 group-hover:text-indigo-600">Subir<br/>Escudo</span>
                                        <input 
                                            type="file" id="newClubLogo" className="hidden" accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if(file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const img = document.createElement('img');
                                                        img.src = ev.target.result;
                                                        img.className = "absolute inset-0 w-full h-full object-contain bg-white p-1 rounded-lg";
                                                        e.target.parentElement.appendChild(img);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                <div className="md:col-span-9 space-y-3">
                                    <div><input id="newClubName" placeholder="Nombre Oficial del Club" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-bold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all placeholder-gray-400" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input id="newClubUser" placeholder="Usuario" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all placeholder-gray-400" />
                                        <div className="relative">
                                            <input id="newClubPass" type={showNewClubPass ? "text" : "password"} placeholder="Contraseña" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm pr-8 text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all placeholder-gray-400" />
                                            <button type="button" onClick={() => setShowNewClubPass(!showNewClubPass)} className="absolute right-2 top-2 text-gray-400 hover:text-indigo-500">
                                                {showNewClubPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <span className="text-[10px] uppercase font-bold text-gray-400 pl-1">Color:</span>
                                        <ColorPicker selectedColor={newClubColor} onChange={setNewClubColor} />
                                    </div>
                                </div>
                            </div>
                            <button 
                                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                                onClick={() => { 
                                    const nameFn = document.getElementById('newClubName');
                                    const userFn = document.getElementById('newClubUser');
                                    const passFn = document.getElementById('newClubPass');
                                    const fileFn = document.getElementById('newClubLogo');
                                    
                                    if(nameFn.value && userFn.value && passFn.value) {
                                        createClub({
                                            name: nameFn.value, code: nameFn.value.slice(0,3).toUpperCase(), username: userFn.value, pass: passFn.value, color: newClubColor
                                        }, fileFn.files[0]);
                                        nameFn.value = ''; userFn.value = ''; passFn.value = ''; fileFn.value = ''; setNewClubColor('white');
                                        const preview = fileFn.parentElement.querySelector('img');
                                        if(preview) preview.remove();
                                    } else {
                                        alert("Por favor completa los campos.");
                                    }
                                }} 
                            >
                                <Plus className="w-4 h-4"/> Registrar Club
                            </button>
                        </div>
                    </div>

                    {/* Lista de Clubes */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600"/> Clubes Activos
                            </h4>
                            <span className="text-xs bg-white border px-2 py-1 rounded-full text-gray-500 font-medium">{clubs.length} clubes</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {clubs.length === 0 ? (
                                <p className="text-center text-gray-400 py-10">No hay clubes registrados.</p>
                            ) : (
                                clubs.map(c => (
                                    <ClubEditorRow key={c.id} club={c} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};