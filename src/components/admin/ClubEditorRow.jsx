import React, { useState } from 'react';
import { Eye, EyeOff, Upload, Banknote, Save, User, Ban, Unlock, Lock, Edit3, Trash2 } from 'lucide-react';
import { AVAILABLE_COLORS } from '../../config/constants';
import { Button } from '../ui/Button';
import { ColorPicker } from './ui/ColorPicker'; // Importamos el que creaste en el Paso 1

export const ClubEditorRow = ({ club, updateClub, deleteClub, toggleClubBlock }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ 
        name: club.name, 
        pass: club.pass, 
        username: club.username || '', 
        color: club.color || 'white',
        commission: club.commission || 0.12,
        cashPaymentEnabled: club.cashPaymentEnabled !== false // true por defecto
    });
    const [showPass, setShowPass] = useState(false);
    const [newLogo, setNewLogo] = useState(null); 

    const handleSave = () => { 
        updateClub({ ...club, ...editData, commission: parseFloat(editData.commission) }, newLogo); 
        setIsEditing(false); 
        setNewLogo(null);
    };

    const colorInfo = AVAILABLE_COLORS.find(c => c.id === (isEditing ? editData.color : (club.color || 'white'))) || AVAILABLE_COLORS[0];

    if (isEditing) {
        return (
            <div className="bg-white p-5 rounded-xl border-2 border-emerald-500 shadow-lg animate-fade-in space-y-4 mb-4 relative">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">Editando Club</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Columna Izquierda: Datos Básicos */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nombre del Club</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-200 outline-none" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                        </div>
                        <div className="flex gap-2">
                             <div className="flex-1">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Usuario</label>
                                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} />
                            </div>
                            <div className="flex-1 relative">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Contraseña</label>
                                <input type={showPass ? "text" : "password"} className="w-full border rounded-lg px-3 py-2 text-sm pr-8" value={editData.pass} onChange={e => setEditData({...editData, pass: e.target.value})} />
                                <button onClick={() => setShowPass(!showPass)} className="absolute right-2 top-7 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Configuración Visual y Eco */}
                    <div className="space-y-3">
                         <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Color Oficial</label>
                            <div className="flex items-center gap-2">
                                <ColorPicker selectedColor={editData.color} onChange={(val) => setEditData({...editData, color: val})} />
                                <div className={`w-8 h-8 rounded-full border-2 ${colorInfo.border}`} style={{backgroundColor: colorInfo.hex}}></div>
                            </div>
                        </div>
                        
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cambiar Escudo (Opcional)</label>
                             <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 bg-white group transition-colors">
                                <Upload className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform"/>
                                <span className="text-sm text-gray-600 truncate flex-1">{newLogo ? newLogo.name : 'Subir nueva imagen...'}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setNewLogo(e.target.files[0])} />
                             </label>
                        </div>
                    </div>
                </div>

                {/* Pie: Comisión y Botones */}
                <div className="flex justify-between items-end border-t pt-4 mt-2">
                     <div className="flex gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Comisión Venta</label>
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded border">
                                <input type="number" step="1" className="w-12 bg-transparent text-right text-sm font-bold outline-none" value={(editData.commission * 100).toFixed(0)} onChange={e => setEditData({...editData, commission: parseFloat(e.target.value) / 100})} />
                                <span className="text-xs font-bold">%</span>
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Métodos Pago</label>
                            <label className={`flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer transition-colors ${editData.cashPaymentEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <input 
                                    type="checkbox" 
                                    className="accent-green-600 w-4 h-4"
                                    checked={editData.cashPaymentEnabled} 
                                    onChange={e => setEditData({...editData, cashPaymentEnabled: e.target.checked})} 
                                />
                                <span className="text-xs font-bold flex items-center gap-1">
                                    <Banknote className="w-3.5 h-3.5"/> Efectivo
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => setIsEditing(false)} variant="secondary">Cancelar</Button>
                        <Button size="sm" onClick={handleSave} className="bg-emerald-600 text-white shadow-md hover:bg-emerald-700">
                            <Save className="w-4 h-4 mr-1"/> Guardar Cambios
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`flex justify-between items-center p-4 rounded-xl border mb-3 transition-all group ${club.blocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md'}`}>
            <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 p-2 shadow-inner">
                    {club.logoUrl ? (
                        <img src={club.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                        <span className="font-bold text-2xl text-gray-300">{club.name.charAt(0)}</span>
                    )}
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-lg ${club.blocked ? 'text-red-700 line-through' : 'text-gray-800'}`}>{club.name}</h4>
                        <div className={`w-3 h-3 rounded-full border shadow-sm ${colorInfo.border}`} style={{ backgroundColor: colorInfo.hex }} title={`Color: ${colorInfo.label}`}></div>
                        {club.blocked && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Bloqueado</span>}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><User className="w-3 h-3 text-gray-400"/> {club.username}</span>
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded font-bold">Comisión: {(club.commission * 100).toFixed(0)}%</span>
                         <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded font-bold">Lote Activo: #{club.activeGlobalOrderId || 1}</span>
                         {club.cashPaymentEnabled === false && (
                             <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded font-bold" title="Pago en efectivo desactivado">
                                 <Ban className="w-3 h-3"/> No Efectivo
                             </span>
                         )}
                    </div>
                </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleClubBlock(club.id)} className={`p-2 rounded-lg border transition-colors ${club.blocked ? 'bg-white text-green-600 border-green-200 hover:bg-green-50' : 'bg-white text-red-400 border-red-200 hover:bg-red-50 hover:text-red-600'}`} title={club.blocked ? "Desbloquear" : "Bloquear acceso"}>
                    {club.blocked ? <Unlock className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
                </button>
                <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors shadow-sm" title="Editar Club">
                    <Edit3 className="w-4 h-4"/>
                </button>
                <button onClick={() => deleteClub(club.id)} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors shadow-sm" title="Eliminar Definitivamente">
                    <Trash2 className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );
};