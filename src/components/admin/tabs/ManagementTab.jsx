import React, { useState } from 'react';
import { Award, Store, Ban, Banknote, Package, Plus, Users, Upload, EyeOff, Eye } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import { Button } from '../../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
import { ClubEditorRow } from '../ClubEditorRow';
import { ProductEditorRow } from '../ProductEditorRow';

export const ManagementTab = ({
    campaignConfig, setCampaignConfig,
    storeConfig, setStoreConfig,
    financialConfig, setFinancialConfig, updateFinancialConfig,
    products, addProduct, updateProduct, deleteProduct, suppliers,
    clubs, createClub, updateClub, deleteClub, toggleClubBlock,
    showNotification
}) => {
    // Estos estados solo se usan en esta pestaña, así que los sacamos del Dashboard principal
    const [showNewClubPass, setShowNewClubPass] = useState(false);
    const [newClubColor, setNewClubColor] = useState('white');

    return (
        <div className="space-y-8 animate-fade-in">
            {/* PANEL DE CAMPAÑAS */}
            <div className="md:col-span-2 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 shadow-sm mb-6">
                <h3 className="font-bold text-lg text-purple-800 flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5"/> Campañas y Ofertas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-purple-600 uppercase block mb-1">Tipo Campaña</label>
                        <select 
                            className="w-full border rounded-lg p-2 text-sm"
                            value={campaignConfig?.type || 'none'}
                            onChange={async (e) => {
                                const newConfig = { ...campaignConfig, type: e.target.value };
                                await setDoc(doc(db, 'settings', 'campaigns'), newConfig);
                            }}
                        >
                            <option value="none">Sin Campaña</option>
                            <option value="christmas">Navidad 🎄</option>
                            <option value="black_friday">Black Friday 🖤</option>
                            <option value="summer">Fin de Temporada ☀️</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-purple-600 uppercase block mb-1">% Descuento Global</label>
                        <input 
                            type="number" 
                            className="w-full border rounded-lg p-2 text-sm"
                            placeholder="0"
                            value={campaignConfig?.discount || 0}
                            onChange={async (e) => {
                                const newConfig = { ...campaignConfig, discount: parseInt(e.target.value) || 0 };
                                await setDoc(doc(db, 'settings', 'campaigns'), newConfig);
                            }}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-purple-600 uppercase block mb-1">Mensaje Banner</label>
                        <div className="flex gap-2">
                            <input 
                                className="w-full border rounded-lg p-2 text-sm"
                                placeholder="Ej: ¡Solo hoy! Precios locos."
                                value={campaignConfig?.bannerMessage || ''}
                                onChange={(e) => setCampaignConfig({ ...campaignConfig, bannerMessage: e.target.value })} 
                            />
                            <Button size="sm" onClick={async () => {
                                await setDoc(doc(db, 'settings', 'campaigns'), campaignConfig);
                                showNotification('Campaña guardada');
                            }}>Guardar</Button>
                        </div>
                    </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="campActive"
                        className="accent-purple-600"
                        checked={campaignConfig?.active || false}
                        onChange={async (e) => {
                            const newConfig = { ...campaignConfig, active: e.target.checked };
                            await setDoc(doc(db, 'settings', 'campaigns'), newConfig);
                        }}
                    />
                    <label htmlFor="campActive" className="text-sm font-bold text-purple-700 cursor-pointer">Activar Campaña en la Web</label>
                </div>
            </div>
            
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

            {/* PRODUCTOS Y CLUBES */}
            <div className="grid grid-cols-1 max-w-3xl mx-auto gap-8 items-start">
                
                {/* COLUMNA IZQUIERDA: CATÁLOGO DE PRODUCTOS */}

                {/* COLUMNA DERECHA: GESTIÓN DE CLUBES */}
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