import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button'; // Reutilizamos tu botón

export function ConfirmModal({ confirmation, setConfirmation }) {
  if (!confirmation) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] backdrop-blur-sm animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-gray-100">
        <div className="flex items-center gap-2 mb-4 text-emerald-700">
          <AlertCircle className="w-6 h-6"/>
          <h3 className="font-bold text-lg text-gray-900">{confirmation.title || 'Confirmar Acción'}</h3>
        </div>
        <p className="text-gray-600 mb-6 whitespace-pre-line text-sm leading-relaxed">{confirmation.msg}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmation(null)}>Cancelar</Button>
          <Button variant="primary" onClick={() => { confirmation.onConfirm(); setConfirmation(null); }}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}