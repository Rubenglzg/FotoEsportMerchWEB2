import React, { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function OrderSuccessView({ setView }) {
    
    // (Opcional) Podemos mover aquí el useEffect que te redirige a los 10 segundos
    // para que App.jsx esté aún más limpio.
    useEffect(() => {
        const timer = setTimeout(() => {
            setView('home'); 
        }, 10000);
        return () => clearTimeout(timer);
    }, [setView]);

    return (
      <div className="min-h-[60vh] bg-gray-50 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-green-100">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Pedido Realizado!</h2>
          
          <p className="text-gray-600 mb-6">
            Hemos recibido tu pedido correctamente.
            <br/><br/>
            <span className="font-semibold text-gray-800">Te acabamos de enviar un email con la factura y el recibo de tu compra.</span>
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 overflow-hidden">
            <div className="bg-green-500 h-1.5 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{width: '100%'}}></div>
          </div>

          <p className="text-sm text-gray-400 mb-6">
            Volviendo al inicio en unos segundos...
          </p>

          <div className="flex justify-center gap-4">
            <Button onClick={() => setView('home')}>Volver ahora</Button>
            <Button variant="outline" onClick={() => setView('tracking')}>Ver Seguimiento</Button>
          </div>
        </div>
      </div>
    );
}