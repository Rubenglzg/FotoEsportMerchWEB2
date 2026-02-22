import React from 'react';
import { AlertTriangle, MoveLeft, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';

export function RevertBatchModal({ active, currentBatchId, ordersCount, onClose, onProcess }) {
    if (!active) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-2 border-red-100">
                <div className="flex items-center gap-2 mb-4 text-red-600">
                    <AlertTriangle className="w-6 h-6"/>
                    <h3 className="font-bold text-lg">Reabrir Pedido Global Anterior</h3>
                </div>
                <p className="text-gray-600 mb-2">
                    Estás a punto de eliminar el <strong>Lote Global #{currentBatchId}</strong> y volver a activar el <strong>#{currentBatchId - 1}</strong>.
                </p>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6">
                    <p className="font-bold text-red-800 text-sm mb-2">¡Atención! El lote actual tiene {ordersCount} pedidos.</p>
                    
                    <div className="space-y-2">
                        <button onClick={() => onProcess('transfer')} className="w-full text-left p-3 rounded bg-white border border-red-200 hover:border-red-400 flex items-center gap-3 transition-colors group">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600 group-hover:bg-blue-200"><MoveLeft className="w-4 h-4"/></div>
                            <div><span className="block font-bold text-sm text-gray-800">Traspasar al Anterior</span><span className="block text-xs text-gray-500">Moverlos al Lote #{currentBatchId - 1} y borrar este lote.</span></div>
                        </button>
                        <button onClick={() => onProcess('delete')} className="w-full text-left p-3 rounded bg-white border border-red-200 hover:border-red-400 flex items-center gap-3 transition-colors group">
                            <div className="bg-red-100 p-2 rounded-full text-red-600 group-hover:bg-red-200"><Trash2 className="w-4 h-4"/></div>
                            <div><span className="block font-bold text-sm text-gray-800">Eliminar Pedidos</span><span className="block text-xs text-gray-500">Borrar estos pedidos permanentemente.</span></div>
                        </button>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                </div>
            </div>
        </div>
    );
}