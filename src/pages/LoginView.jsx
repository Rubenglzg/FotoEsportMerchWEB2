import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/* * ============================================================================
 * 🔐 VISTA: ACCESO PRIVADO (LOGIN)
 * ============================================================================
 * Pantalla para que los administradores y los clubes inicien sesión.
 */


export function LoginView({ handleLogin, clubs }) {
  const [user, setUser] = useState(''); 
  const [pass, setPass] = useState('');
  
  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Acceso Privado</h2>
            <p className="text-gray-400 text-sm">Gestión para Clubes y Administración</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(user, pass); }} className="space-y-4">
            <Input label="Usuario / ID" value={user} onChange={e => setUser(e.target.value)} />
            <Input label="Contraseña" type="password" value={pass} onChange={e => setPass(e.target.value)} />
            <Button type="submit" className="w-full">Entrar al Portal</Button>
        </form>
        <div className="mt-8 pt-6 border-t text-center space-y-3 bg-gray-50 -mx-8 -mb-8 p-6 rounded-b-xl">
            <p className="text-xs text-gray-500 font-bold uppercase">Accesos Rápidos (Demo)</p>
            <div className="flex justify-center gap-2 flex-wrap">
                <button onClick={() => handleLogin('club-demo', 'club123')} className="text-xs bg-white border border-gray-200 px-3 py-2 rounded hover:border-emerald-500 text-gray-600">Club Demo</button>
                <button onClick={() => handleLogin('admin', 'admin123')} className="text-xs bg-white border border-gray-200 px-3 py-2 rounded hover:border-purple-500 text-gray-600">Admin (Dueño)</button>
            </div>
        </div>
    </div>
  );
}