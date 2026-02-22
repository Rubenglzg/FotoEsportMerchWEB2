import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../../ui/Button';

export const IncidentModal = ({ incidentForm, setIncidentForm, submitIncident, orders, clubs }) => {
    if (!incidentForm.active) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-orange-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Gestión de Incidencia</h3>
                    <button onClick={() => setIncidentForm({...incidentForm, active: false})}><X className="w-5 h-5 text-orange-400"/></button>
                </div>
                
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="font-bold text-gray-800 text-base">{incidentForm.item.name}</p>
                                <p className="text-xs text-gray-500">Pedido: {incidentForm.order.customer.name} | Lote Global #{incidentForm.order.globalBatch}</p>
                            </div>
                            <div className="text-right bg-white px-2 py-1 rounded border border-gray-200">
                                <span className="block text-[10px] text-gray-400 uppercase font-bold">Cant. Solicitada</span>
                                <span className="font-mono font-bold text-lg text-gray-800">{incidentForm.item.quantity || 1} ud.</span>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-700 grid grid-cols-2 gap-y-2 gap-x-4">
                            {incidentForm.item.playerName && <div className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[10px]">Nombre:</span> <span className="font-medium">{incidentForm.item.playerName}</span></div>}
                            {incidentForm.item.playerNumber && <div className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[10px]">Dorsal:</span> <span className="font-medium">{incidentForm.item.playerNumber}</span></div>}
                            {incidentForm.item.color && <div className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[10px]">Color:</span> <span className="font-medium capitalize">{incidentForm.item.color}</span></div>}
                            {incidentForm.item.size && <div className="flex justify-between"><span className="font-bold text-gray-400 uppercase text-[10px]">Talla:</span> <span className="font-medium">{incidentForm.item.size}</span></div>}
                            {!incidentForm.item.playerName && !incidentForm.item.playerNumber && !incidentForm.item.color && !incidentForm.item.size && <span className="text-gray-400 italic col-span-2">Producto estándar sin personalización</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Cantidad a Reponer</label>
                            <input type="number" min="1" max={incidentForm.item.quantity} className="w-full border border-gray-300 rounded-lg p-2 font-bold text-gray-800" value={incidentForm.qty} onChange={(e) => { const newQty = parseInt(e.target.value) || 1; const unitCost = incidentForm.item.cost || 0; setIncidentForm({...incidentForm, qty: newQty, cost: parseFloat((newQty * unitCost).toFixed(2)) }); }} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Coste Producción</label>
                            <div className="relative">
                                <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg p-2 font-bold text-gray-600 bg-gray-100 cursor-not-allowed" value={incidentForm.cost} readOnly />
                                <span className="absolute right-3 top-2 text-gray-500 font-bold">€</span>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-1">Calculado: {incidentForm.qty} u. x {incidentForm.item.cost?.toFixed(2)}€/ud</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Origen del Fallo</label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <button type="button" onClick={() => setIncidentForm({...incidentForm, responsibility: 'internal'})} className={`p-2 rounded text-sm border flex flex-col items-center gap-1 transition-all ${incidentForm.responsibility === 'internal' ? 'bg-red-50 border-red-300 text-red-700 ring-2 ring-red-100 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Interno / Fabrica</button>
                            <button type="button" onClick={() => setIncidentForm({...incidentForm, responsibility: 'club'})} className={`p-2 rounded text-sm border flex flex-col items-center gap-1 transition-all ${incidentForm.responsibility === 'club' ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-100 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Error del Club</button>
                        </div>
                        {incidentForm.responsibility === 'internal' && (
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100 animate-fade-in mb-3">
                                <p className="text-[10px] uppercase font-bold text-red-400 mb-2">¿Quién asume el coste de reposición?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setIncidentForm({...incidentForm, internalOrigin: 'us'})} className={`px-2 py-2 text-xs rounded border transition-colors flex flex-col items-center ${incidentForm.internalOrigin === 'us' ? 'bg-white border-red-300 text-red-700 shadow-sm font-bold' : 'bg-red-100/50 border-transparent text-red-400 hover:bg-red-100'}`}><span>Nosotros (F.Esport)</span><span className="text-[12px] mt-0.5 opacity-80">Pagamos coste ({incidentForm.cost}€)</span></button>
                                    <button type="button" onClick={() => setIncidentForm({...incidentForm, internalOrigin: 'supplier'})} className={`px-2 py-2 text-xs rounded border transition-colors flex flex-col items-center ${incidentForm.internalOrigin === 'supplier' ? 'bg-white border-red-300 text-red-700 shadow-sm font-bold' : 'bg-red-100/50 border-transparent text-red-400 hover:bg-red-100'}`}><span>El Proveedor</span><span className="text-[12px] mt-0.5 opacity-80">Garantía (Coste 0€)</span></button>
                                </div>
                            </div>
                        )}
                        {incidentForm.responsibility === 'club' && (
                            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in mb-3">
                                <input type="checkbox" id="recharge" className="w-4 h-4 text-blue-600 rounded cursor-pointer" checked={incidentForm.recharge} onChange={e => setIncidentForm({...incidentForm, recharge: e.target.checked})} />
                                <label htmlFor="recharge" className="text-sm text-blue-800 font-medium cursor-pointer select-none">¿Cobrar de nuevo al club? <span className="font-bold">({incidentForm.item.price.toFixed(2)}€)</span></label>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Añadir a Lote de Entrega</label>
                        <select className="w-full border rounded p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none" value={incidentForm.targetBatch} onChange={e => setIncidentForm({...incidentForm, targetBatch: e.target.value})}>
                            <option value="INDIVIDUAL">📦 Entrega Individual (Excepcional)</option>
                            <option value="ERRORS" className="font-bold text-red-600">
                                {(() => {
                                    const c = clubs.find(cl => cl.id === incidentForm.order.clubId);
                                    const errId = c ? (c.activeErrorBatchId || 1) : 1;
                                    const batchKey = `ERR-${errId}`;
                                    const hasOrders = orders.some(o => o.clubId === incidentForm.order.clubId && o.globalBatch === batchKey);
                                    return hasOrders ? `🚨 Pedido Errores #${errId} (En Curso)` : `🚨 Pedido Errores #${errId} (Lote Futuro)`;
                                })()}
                            </option>
                            {(() => {
                                const cId = incidentForm.order.clubId;
                                const activeBatchesMap = {};
                                orders.filter(o => o.clubId === cId && !['SPECIAL', 'INDIVIDUAL'].includes(o.globalBatch)).forEach(o => {
                                    if(['recopilando', 'en_produccion'].includes(o.status)) activeBatchesMap[o.globalBatch] = o.status;
                                });
                                const club = clubs.find(c => c.id === cId);
                                const currentActive = club ? club.activeGlobalOrderId : 1;
                                if (!activeBatchesMap[currentActive]) activeBatchesMap[currentActive] = 'recopilando';
                                return Object.entries(activeBatchesMap).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([id, status]) => (
                                    <option key={id} value={id}>Lote Global #{id} ({status === 'recopilando' ? 'Abierto' : 'En Producción'})</option>
                                ));
                            })()}
                            {(() => {
                                const club = clubs.find(c => c.id === incidentForm.order.clubId);
                                const nextId = (club ? club.activeGlobalOrderId : 0) + 1;
                                return <option value={nextId}>✨ Nuevo Lote Futuro #{nextId}</option>
                            })()}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Motivo / Nota Interna</label>
                        <textarea className="w-full border rounded p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej. Camiseta manchada, dorsal incorrecto..." value={incidentForm.reason} onChange={e => setIncidentForm({...incidentForm, reason: e.target.value})}></textarea>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                    <Button variant="secondary" onClick={() => setIncidentForm({...incidentForm, active: false})}>Cancelar</Button>
                    <Button variant="warning" onClick={submitIncident}>Generar Reposición</Button>
                </div>
            </div>
        </div>
    );
};