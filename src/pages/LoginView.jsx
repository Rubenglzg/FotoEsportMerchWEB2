import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginView({ handleLogin, handleResetPassword, verify2FA, clubs, authStep }) {
  const [user, setUser] = useState(''); 
  const [pass, setPass] = useState('');
  const [code2fa, setCode2fa] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // VISTA: RECUPERAR CONTRASEÑA
  if (isResetting) {
      return (
        <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Recuperar Contraseña</h2>
                <p className="text-gray-400 text-sm mt-2">Introduce tu email de administrador para recibir el enlace de cambio.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(user); }} className="space-y-4">
                <Input label="Correo Electrónico" value={user} onChange={e => setUser(e.target.value)} placeholder="fotoesportmerch@gmail.com" />
                <Button type="submit" className="w-full">Enviar correo de recuperación</Button>
                <button type="button" onClick={() => setIsResetting(false)} className="w-full text-sm text-gray-500 hover:text-indigo-600 mt-4 font-medium transition-colors">
                    Volver al Login
                </button>
            </form>
        </div>
      );
  }

  // VISTA: DOBLE AUTENTICADOR (2FA)
  if (authStep === '2fa') {
      return (
        <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Verificación de Seguridad</h2>
                <p className="text-gray-400 text-sm mt-2">Hemos enviado un código a tu correo. Introdúcelo para continuar.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); verify2FA(code2fa, rememberMe); }} className="space-y-6">
                
                {/* CAMPO DE CÓDIGO 2FA MEJORADO */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700 text-center">Código de 6 dígitos</label>
                    <input 
                        type="text" 
                        maxLength={6}
                        value={code2fa} 
                        onChange={e => setCode2fa(e.target.value.replace(/[^0-9]/g, ''))} // Solo permite números
                        className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-xl border-2 border-indigo-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-none transition-all bg-indigo-50/30 text-indigo-900 placeholder-indigo-200"
                        placeholder="000000"
                        autoFocus
                    />
                </div>

                <Button type="submit" className="w-full py-3 text-lg">Verificar y Entrar</Button>
            </form>
        </div>
      );
  }

  // VISTA: LOGIN NORMAL
  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Acceso Privado</h2>
            <p className="text-gray-400 text-sm mt-1">Gestión para Clubes y Administración</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(user, pass, rememberMe); }} className="space-y-4">
            <Input label="Usuario o Email" value={user} onChange={e => setUser(e.target.value)} />
            <Input label="Contraseña" type="password" value={pass} onChange={e => setPass(e.target.value)} />
            
            <div className="flex items-center justify-between text-sm mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-800 transition-colors">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"/>
                    Mantener sesión iniciada
                </label>
                <button type="button" onClick={() => setIsResetting(true)} className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                    ¿Olvidaste tu contraseña?
                </button>
            </div>

            <Button type="submit" className="w-full mt-6 py-2.5">Entrar al Portal</Button>
        </form>
    </div>
  );
}