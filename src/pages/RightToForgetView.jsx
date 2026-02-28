import React, { useState } from 'react';
import { UserX, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export function RightToForgetView({ setView }) {
    // AÑADIDO: playerName al estado inicial
    const [formData, setFormData] = useState({ email: '', dni: '', playerName: '', reason: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => { 
        e.preventDefault(); 
        setIsSubmitting(true);
        setErrorMsg('');
        try {
            await addDoc(collection(db, 'right_to_forget'), {
                ...formData,
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            setSuccess(true); 
        } catch (error) {
            console.error("Error al enviar solicitud:", error);
            setErrorMsg("Error de conexión. Es posible que falten permisos en Firebase.");
        }
        setIsSubmitting(false);
    }

    if (success) {
        return (
            <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow mt-8 text-center animate-fade-in border border-emerald-100">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4"/>
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Solicitud Registrada</h2>
                <p className="text-gray-600 mb-6 text-sm">
                    Hemos recibido tu solicitud. Procederemos a la eliminación total de tus fotografías y datos personales en un plazo de 24-48 horas hábiles. Recibirás un email de confirmación cuando el proceso haya finalizado.
                </p>
                <Button onClick={() => setView('home')} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Volver a la tienda
                </Button>
            </div>
        );
    }
    
    return (
        <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow mt-8 animate-fade-in">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-600">
                <UserX className="w-6 h-6"/> Derecho al Olvido (RGPD)
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
                De acuerdo con el Reglamento General de Protección de Datos, utiliza este formulario para solicitar la eliminación completa de tus fotografías y datos personales de nuestra base de datos.
            </p>
            
            {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-200">
                    <AlertCircle className="w-5 h-5 shrink-0"/> {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                    label="Email asociado al pedido" 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <Input 
                    label="DNI / Identificación del Tutor" 
                    required 
                    value={formData.dni}
                    onChange={(e) => setFormData({...formData, dni: e.target.value})}
                />
                {/* AÑADIDO: Nuevo campo para el nombre del jugador */}
                <Input 
                    label="Nombre completo del jugador" 
                    required 
                    placeholder="Ej: Marc García López"
                    value={formData.playerName}
                    onChange={(e) => setFormData({...formData, playerName: e.target.value})}
                />
                <Input 
                    label="Motivo (Opcional)" 
                    placeholder="Ej: Solicito la baja de mis fotos..." 
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
                <Button type="submit" variant="danger" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Procesando solicitud...' : 'Solicitar Borrado Definitivo'}
                </Button>
            </form>
            <button onClick={() => setView('home')} className="mt-4 text-sm text-gray-500 hover:text-gray-800 underline text-center w-full transition-colors">
                Cancelar
            </button>
        </div>
    );
}