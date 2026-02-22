import React from 'react';
import { Mail, BellOff, ArrowRight, Package } from 'lucide-react';
import { Button } from '../../ui/Button';

// Función para traducir los estados
const formatStatus = (status) => {
    switch(status) {
        case 'recopilando': return 'Recopilando';
        case 'en_produccion': return 'En Producción';
        case 'entregado_club': return 'Entregado al Club';
        case 'pendiente_validacion': return 'Pendiente';
        case 'pagado': return 'Pagado';
        default: return status || '-';
    }
};

export const StatusChangeModal = ({ statusChangeModal, setStatusChangeModal, executeBatchStatusUpdate }) => {
    if (!statusChangeModal.active) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Package className="w-5 h-5"/> Cambio de Estado Masivo</h3>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <p className="text-gray-600 mb-2">Vas a cambiar el estado de <strong>{statusChangeModal.affectedOrders} pedidos</strong> del lote:</p>
                        <div className="flex items-center justify-center gap-3 text-lg font-black">
                            <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded">{formatStatus(statusChangeModal.oldStatus || 'recopilando')}</span>
                            <ArrowRight className="w-5 h-5 text-gray-400"/>
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded">{formatStatus(statusChangeModal.newStatus)}</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><Mail className="w-4 h-4"/> ¿Notificar a los clientes?</h4>
                        <p className="text-sm text-blue-700 mb-4">Puedes enviar un correo automático a todos los clientes de este lote informando del nuevo estado.</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => executeBatchStatusUpdate(true)}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                            >
                                <Mail className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform"/>
                                <span className="font-bold text-sm text-blue-900">Sí, enviar emails</span>
                            </button>
                            
                            <button 
                                onClick={() => executeBatchStatusUpdate(false)}
                                className="flex flex-col items-center justify-center gap-2 p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-500 hover:bg-gray-50 transition-all group"
                            >
                                <BellOff className="w-6 h-6 text-gray-400 group-hover:scale-110 transition-transform"/>
                                <span className="font-bold text-sm text-gray-700">No, solo cambiar estado</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
                    <Button variant="secondary" onClick={() => setStatusChangeModal({ active: false })}>Cancelar Operación</Button>
                </div>
            </div>
        </div>
    );
};