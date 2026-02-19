import React from 'react';
import { UserX } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/* * ============================================================================
 * 🗑️ VISTA: DERECHO AL OLVIDO (RGPD)
 * ============================================================================
 * Formulario legal para que los usuarios soliciten el borrado de sus datos.
 */

export function RightToForgetView({ setView }) {
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        alert("Solicitud enviada. Procederemos al borrado de tus datos en 24-48h conforme al RGPD."); 
        setView('home'); 
    }
    
    return (
        <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow mt-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-600">
                <UserX className="w-6 h-6"/> Derecho al Olvido (RGPD)
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
                De acuerdo con el Reglamento General de Protección de Datos, utiliza este formulario para solicitar la eliminación completa de tus fotografías y datos personales de nuestra base de datos.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Email asociado al pedido" type="email" required />
                <Input label="DNI / Identificación del Tutor" required />
                <Input label="Motivo (Opcional)" placeholder="Solicito la baja de mis fotos..." />
                <Button type="submit" variant="danger" className="w-full">Solicitar Borrado Definitivo</Button>
            </form>
            <button onClick={() => setView('home')} className="mt-4 text-sm text-gray-500 underline text-center w-full">
                Cancelar
            </button>
        </div>
    );
}