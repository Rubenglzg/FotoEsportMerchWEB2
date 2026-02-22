import React, { useState, useEffect } from 'react';
import { Factory, X, Mail, Check } from 'lucide-react';
// Ajusta esta ruta si tu componente Button está en otro sitio
import { Button } from '../../ui/Button'; 

export const SupplierStockModal = ({ active, onClose, batchId, orders, suppliers, products, club, onSend }) => {
    const [selectedSuppliers, setSelectedSuppliers] = useState([]);
    const [supplierData, setSupplierData] = useState([]);

    // Calcular datos al abrir
    useEffect(() => {
        if (!active || !orders || !products) return;

        const dataMap = {}; 

        orders.forEach(order => {
            if (!order.items || !Array.isArray(order.items)) return;

            order.items.forEach(item => {
                const realProductId = item.productId || item.id;
                const productDef = products.find(p => p.id === realProductId);
                const supplierId = productDef?.supplierId;

                if (supplierId) {
                    const supplier = suppliers.find(s => s.id === supplierId);
                    if (supplier) {
                        if (!dataMap[supplierId]) {
                            dataMap[supplierId] = { supplier, items: {}, totalQty: 0 };
                        }
                        const pName = productDef?.name || item.name;
                        const pSize = item.size || 'Única';
                        const key = `${pName}-${pSize}`;
                        
                        if (!dataMap[supplierId].items[key]) {
                            dataMap[supplierId].items[key] = { name: pName, size: pSize, qty: 0 };
                        }
                        const qty = parseInt(item.quantity || 1);
                        dataMap[supplierId].items[key].qty += qty;
                        dataMap[supplierId].totalQty += qty;
                    }
                }
            });
        });

        const result = Object.values(dataMap).map(d => ({
            ...d.supplier,
            stockItems: Object.values(d.items),
            totalUnits: d.totalQty
        }));

        setSupplierData(result);
        setSelectedSuppliers(result.filter(s => s.email).map(s => s.id));

    }, [active, orders, products, suppliers]);

    const handleSend = () => {
        const toSend = supplierData.filter(s => selectedSuppliers.includes(s.id));
        onSend(toSend, batchId, club);
        onClose();
    };

    const toggleSelect = (id) => {
        if (selectedSuppliers.includes(id)) setSelectedSuppliers(selectedSuppliers.filter(sid => sid !== id));
        else setSelectedSuppliers([...selectedSuppliers, id]);
    };

    // Obtener historial global del lote
    const batchLog = (club?.accountingLog && club.accountingLog[batchId]) || {};
    const emailHistoryMap = batchLog.supplierEmails || {}; 

    if (!active) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Factory className="w-5 h-5 text-emerald-400"/> Gestión de Stock y Avisos
                        </h3>
                        <p className="text-xs text-gray-400">Lote Global #{batchId} - {club?.name}</p>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 p-6">
                    {supplierData.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <p>No se han encontrado productos asociados a proveedores en este lote.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm flex gap-3 text-sm text-indigo-900">
                                <Mail className="w-5 h-5 text-indigo-500 shrink-0"/>
                                <p>Selecciona proveedores para enviar previsión. El historial muestra cuántas unidades había cuando enviaste el aviso anterior frente a las actuales.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {supplierData.map(data => {
                                    // Procesar historial (soporte para string antiguo o array nuevo)
                                    let history = emailHistoryMap[data.id];
                                    if (history && !Array.isArray(history)) history = [{ sentAt: history, qty: '?', refs: '?' }];
                                    if (!history) history = [];
                                    
                                    // Ordenar: el último primero
                                    history = [...history].reverse();

                                    const hasEmail = !!data.email;
                                    const isSelected = selectedSuppliers.includes(data.id);
                                    
                                    return (
                                        <div key={data.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-gray-200'}`}>
                                            {/* CABECERA */}
                                            <div className="p-4 flex flex-col md:flex-row md:items-start gap-4 bg-gray-50/50">
                                                <div className="flex items-center gap-3 min-w-[220px]">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={() => hasEmail && toggleSelect(data.id)}
                                                        disabled={!hasEmail}
                                                        className="w-5 h-5 accent-emerald-600 cursor-pointer mt-1"
                                                    />
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-sm">{data.name}</h4>
                                                        <p className="text-xs text-gray-500 mb-1">{data.email || <span className="text-red-500">Sin Email</span>}</p>
                                                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200">
                                                            ACTUAL: {data.totalUnits} uds
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* ZONA DE HISTORIAL */}
                                                <div className="flex-1 border-l border-gray-200 pl-4 md:pl-6">
                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                                        <Check className="w-3 h-3"/> Historial de envíos
                                                    </h5>
                                                    
                                                    {history.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">Nunca enviado</p>
                                                    ) : (
                                                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                                            {history.map((entry, idx) => {
                                                                const date = new Date(entry.sentAt);
                                                                // Calcular diferencia: Actual - Lo que había en ese envío
                                                                const diff = typeof entry.qty === 'number' ? data.totalUnits - entry.qty : 0;
                                                                
                                                                return (
                                                                    <div key={idx} className="flex items-center justify-between text-xs bg-white border border-gray-100 p-2 rounded shadow-sm">
                                                                        <div className="text-gray-600">
                                                                            <span className="font-bold">{date.toLocaleDateString()}</span> {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                                        </div>
                                                                        
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="text-right">
                                                                                <span className="block text-[9px] text-gray-400 uppercase">En el aviso</span>
                                                                                <span className="font-bold text-gray-700">{entry.qty} uds</span>
                                                                            </div>
                                                                            
                                                                            {/* Indicador de Diferencia */}
                                                                            {diff > 0 && (
                                                                                <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold text-[10px] border border-red-100" title="Han aumentado las unidades desde este correo">
                                                                                    +{diff} nuevos
                                                                                </span>
                                                                            )}
                                                                            {diff === 0 && typeof entry.qty === 'number' && (
                                                                                 <span className="text-emerald-500 font-bold text-[10px]">
                                                                                    = Igual
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* DETALLES DE PRODUCTOS (Solo si seleccionado) */}
                                            {isSelected && (
                                                <div className="border-t border-gray-100 p-4 bg-white animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Contenido a enviar ahora ({data.totalUnits} uds)</h5>
                                                        <div className="max-h-32 overflow-y-auto border rounded bg-gray-50 text-xs">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-gray-100 text-gray-500 sticky top-0"><tr><th className="p-1">Prod</th><th className="p-1">Talla</th><th className="p-1 text-right">Cant</th></tr></thead>
                                                                <tbody className="divide-y divide-gray-200">
                                                                    {data.stockItems.map((item, i) => (
                                                                        <tr key={i}><td className="p-1">{item.name}</td><td className="p-1">{item.size || '-'}</td><td className="p-1 text-right font-bold">{item.qty}</td></tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-500 space-y-2">
                                                        <p className="font-bold text-gray-700">Destinatario:</p>
                                                        <div className="flex items-center gap-2"><Mail className="w-3 h-3"/> {data.email}</div>
                                                        {data.contacts?.filter(c => c.ccDefault).length > 0 && (
                                                            <>
                                                                <p className="font-bold text-gray-700 mt-2">En Copia (CC):</p>
                                                                <ul className="list-disc pl-4 text-gray-400">
                                                                    {data.contacts.filter(c => c.ccDefault).map((c, i) => (
                                                                        <li key={i}>{c.email} ({c.name})</li>
                                                                    ))}
                                                                </ul>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t flex justify-between items-center shadow-lg z-10">
                    <div className="text-xs text-gray-500">
                        Se enviarán <strong>{selectedSuppliers.length}</strong> correos de previsión.
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button 
                            onClick={handleSend} 
                            disabled={selectedSuppliers.length === 0} 
                            className="bg-gray-900 text-white hover:bg-black"
                        >
                            <Mail className="w-4 h-4 mr-2"/> Enviar Avisos
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};