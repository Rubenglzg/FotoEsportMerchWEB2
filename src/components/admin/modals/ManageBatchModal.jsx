import React from 'react';
import { Settings, Package, X } from 'lucide-react';
import { Button } from '../../ui/Button';

export const ManageBatchModal = ({ manageBatchModal, setManageBatchModal, executeBatchManagement }) => {
    if (!manageBatchModal.active) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
                <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Settings className="w-5 h-5 text-emerald-400"/> Gestionar Lote #{manageBatchModal.batchId}
                        </h3>
                        <p className="text-xs text-gray-400">{manageBatchModal.club?.name}</p>
                    </div>
                    <button onClick={() => setManageBatchModal({...manageBatchModal, active: false})} className="text-gray-400 hover:text-white">
                        <X className="w-6 h-6"/>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="bg-white p-2 rounded shadow-sm border border-gray-100"><Package className="w-6 h-6 text-blue-600"/></div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Contenido: {manageBatchModal.orders.length} pedidos</p>
                            <p className="text-xs text-gray-500">Selecciona qué hacer con este bloque de pedidos.</p>
                        </div>
                    </div>

                    <label className={`block relative p-4 rounded-xl border-2 cursor-pointer transition-all ${manageBatchModal.action === 'move' ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 hover:border-emerald-200'}`}>
                        <div className="flex items-start gap-3">
                            <input type="radio" checked={manageBatchModal.action === 'move'} onChange={() => setManageBatchModal({...manageBatchModal, action: 'move'})} disabled={manageBatchModal.orders.length === 0} className="mt-1 w-4 h-4 accent-emerald-600"/>
                            <div className="flex-1">
                                <span className={`font-bold block ${manageBatchModal.orders.length === 0 ? 'text-gray-400' : 'text-gray-800'}`}>Traspasar Pedidos</span>
                                <p className="text-xs text-gray-500 mt-1">Mueve los pedidos a otro lote sin borrarlos.</p>
                                {manageBatchModal.action === 'move' && (
                                    <div className="mt-3 animate-fade-in">
                                        <select className="w-full border border-gray-300 rounded p-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none" value={manageBatchModal.targetBatch} onChange={(e) => setManageBatchModal({...manageBatchModal, targetBatch: e.target.value})}>
                                            <option value="">-- Seleccionar Destino --</option>
                                            <option value="INDIVIDUAL">👤 Individual (Sueltos)</option>
                                            <option value="ERR_ACTIVE">🚨 Lote de Errores (Activo)</option>
                                            <optgroup label="--- Historial de Lotes ---">
                                                {(() => {
                                                    const c = manageBatchModal.club;
                                                    if (!c) return null;
                                                    const active = c.activeGlobalOrderId || 1;
                                                    const options = [];
                                                    for(let i = active + 1; i >= 1; i--) {
                                                        let label = i === active ? `📦 Lote Global #${i} (ACTIVO ACTUAL)` : i === active + 1 ? `✨ Lote Global #${i} (FUTURO)` : `⏪ Lote Global #${i} (Anterior)`;
                                                        options.push(<option key={i} value={i}>{label}</option>);
                                                    }
                                                    return options;
                                                })()}
                                            </optgroup>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </label>

                    <label className={`block relative p-4 rounded-xl border-2 cursor-pointer transition-all ${manageBatchModal.action === 'delete' ? 'border-red-500 bg-red-50/20' : 'border-gray-200 hover:border-red-200'}`}>
                        <div className="flex items-start gap-3">
                            <input type="radio" checked={manageBatchModal.action === 'delete'} onChange={() => setManageBatchModal({...manageBatchModal, action: 'delete'})} className="mt-1 w-4 h-4 accent-red-600"/>
                            <div className="flex-1">
                                <span className="font-bold text-red-700 block">Eliminar / Vaciar</span>
                                <p className="text-xs text-red-600/80 mt-1">Acciones destructivas sobre el lote.</p>
                                {manageBatchModal.action === 'delete' && (
                                    <div className="mt-3 space-y-2 animate-fade-in pl-1">
                                        {(() => {
                                            const mBatch = manageBatchModal.batchId;
                                            const mClub = manageBatchModal.club;
                                            if(!mClub) return null;
                                            let showDeleteOption = false;
                                            if (typeof mBatch === 'number') {
                                                const activeStd = parseInt(mClub.activeGlobalOrderId || 1);
                                                showDeleteOption = (mBatch === activeStd && activeStd >= 1);
                                            }
                                            if (typeof mBatch === 'string' && mBatch.startsWith('ERR')) {
                                                const parts = mBatch.split('-');
                                                if (parts.length === 2) {
                                                    const batchNum = parseInt(parts[1]);
                                                    const activeErr = parseInt(mClub.activeErrorBatchId || 1);
                                                    showDeleteOption = (batchNum === activeErr && activeErr >= 1);
                                                }
                                            }
                                            if (showDeleteOption) {
                                                return (
                                                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-red-50 transition-colors animate-fade-in">
                                                        <input type="radio" checked={manageBatchModal.deleteType === 'full'} onChange={() => setManageBatchModal({...manageBatchModal, deleteType: 'full'})} className="w-4 h-4 accent-red-600"/>
                                                        <div><span className="text-xs font-bold text-gray-800 block">Eliminar Lote y Retroceder</span><span className="text-[10px] text-gray-500 block">Borra el lote actual y vuelve a activar el anterior.</span></div>
                                                    </label>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-red-50 transition-colors">
                                            <input type="radio" checked={manageBatchModal.deleteType === 'empty'} onChange={() => setManageBatchModal({...manageBatchModal, deleteType: 'empty'})} className="w-4 h-4 accent-red-600"/>
                                            <div><span className="text-xs font-bold text-gray-800 block">Solo Vaciar Pedidos</span><span className="text-[10px] text-gray-500 block">Borra los pedidos pero mantiene el lote visible (vacío).</span></div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </label>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                    <Button variant="secondary" onClick={() => setManageBatchModal({...manageBatchModal, active: false})}>Cancelar</Button>
                    <Button onClick={executeBatchManagement} className={`${manageBatchModal.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow-md`}>
                        {manageBatchModal.action === 'delete' ? 'Confirmar Eliminación' : 'Confirmar Traspaso'}
                    </Button>
                </div>
            </div>
        </div>
    );
};