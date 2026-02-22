import React from 'react';
import { History, X } from 'lucide-react';
import { Button } from '../../ui/Button';

export const BatchHistoryModal = ({ batchHistoryModal, setBatchHistoryModal }) => {
    if (!batchHistoryModal.active) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-blue-800 flex items-center gap-2">
                            <History className="w-5 h-5"/> Historial del Lote #{batchHistoryModal.batchId}
                        </h3>
                        <p className="text-xs text-blue-600">{batchHistoryModal.clubName}</p>
                    </div>
                    <button onClick={() => setBatchHistoryModal({ active: false, history: [], batchId: null, clubName: '' })}>
                        <X className="w-5 h-5 text-blue-400"/>
                    </button>
                </div>
                
                <div className="p-0 max-h-[60vh] overflow-y-auto">
                    {batchHistoryModal.history.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No hay registros de cambios para este lote.</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Fecha y Hora</th>
                                    <th className="px-6 py-3">Acción / Cambio</th>
                                    <th className="px-6 py-3 text-right">Usuario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {batchHistoryModal.history.map((record, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-gray-600">
                                            {new Date(record.date).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                                                {record.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-500 text-xs">Admin</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                    <Button variant="secondary" onClick={() => setBatchHistoryModal({ active: false, history: [], batchId: null, clubName: '' })}>Cerrar</Button>
                </div>
            </div>
        </div>
    );
};