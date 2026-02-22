import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../../ui/Button';

export function MoveSeasonModal({ active, target, seasons, onClose, onSubmit }) {
    if (!active) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                    <Calendar className="w-5 h-5 text-blue-600"/> Mover Lote de Temporada
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    Estás moviendo el <strong>Lote Global #{target?.batchId}</strong> completo. Todos los pedidos incluidos pasarán a la temporada seleccionada.
                </p>
                <div className="space-y-2 mb-6">
                    {seasons.map(s => (
                        <button key={s.id} onClick={() => onSubmit(s.id)} className="w-full text-left p-3 rounded border text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors">
                            {s.name}
                        </button>
                    ))}
                    <button onClick={() => onSubmit(null)} className="w-full text-left p-3 rounded border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 text-center">
                        Restaurar a Fecha Original
                    </button>
                </div>
                <div className="flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                </div>
            </div>
        </div>
    );
}