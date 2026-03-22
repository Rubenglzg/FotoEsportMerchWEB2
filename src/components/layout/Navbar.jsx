import React, { useState } from 'react';
import { ShoppingCart, LogOut, User, Home, AlertCircle, LayoutDashboard } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { CompanyLogo } from './CompanyLogo';

export function Navbar({ setView, role, currentClub, cart, storeConfig, logout, isPersistent }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const location = useLocation();

  const isDashboard = location.pathname === '/panel-admin' || location.pathname === '/panel-club';

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200" style={{top: !storeConfig.isOpen ? '48px' : '0'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-32">
          
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
            <CompanyLogo className="h-40" src="/logonegro.png" />
          </div>
          
          {/* MENÚ HABITUAL (Siempre visible si no estamos en Dashboard) */}
          <nav className="hidden md:flex space-x-8 items-center">
            {!isDashboard ? (
              <>
                <button onClick={() => setView('home')} className="hover:text-emerald-600 font-medium">Inicio</button>
                <button onClick={() => setView('shop')} className="hover:text-emerald-600 font-medium">Tienda</button>
                <button onClick={() => setView('photo-search')} className="hover:text-emerald-600 font-medium">Fotos</button>
                <button onClick={() => setView('tracking')} className="hover:text-emerald-600 font-medium">Seguimiento</button>
                
                {/* Indicador de sesión en la web normal */}
                {role !== 'public' && (
                    <div className="ml-4 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-[12px] font-bold flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        CONECTADO: {role === 'admin' ? 'ADMIN' : currentClub?.name?.toUpperCase()}
                        <button onClick={() => setView(role === 'admin' ? 'admin-dashboard' : 'club-dashboard')} className="ml-2 underline hover:text-emerald-900 flex items-center gap-1">
                            <LayoutDashboard className="w-3 h-3"/> PANEL
                        </button>
                    </div>
                )}
              </>
            ) : (
              <span className="text-gray-400 font-bold uppercase tracking-widest text-[12px]">
                {role === 'admin' ? '🛡️ Panel de Control Administrador' : `🏢 Gestión: ${currentClub?.name}`}
              </span>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {/* Carrito (Solo en tienda) */}
            {!isDashboard && (
                <div className="relative cursor-pointer" onClick={() => setView('cart')}>
                    <ShoppingCart className="w-6 h-6 text-gray-600 hover:text-emerald-600" />
                    {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{cart.length}</span>}
                </div>
            )}
            
            {role !== 'public' ? (
              <div className="flex items-center gap-2 relative">
                
                {/* BOTÓN VER TIENDA: Solo aparece dentro del panel */}
                {isDashboard && (
                    <button onClick={() => setView('home')} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-bold text-xs uppercase">
                        <Home className="w-4 h-4" /> VER TIENDA
                    </button>
                )}

                {/* BOTÓN CERRAR SESIÓN: Solo aparece si isPersistent es TRUE */}
                {isPersistent && (
                    <button onClick={() => setShowConfirm(!showConfirm)} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-all font-bold text-xs uppercase">
                        <LogOut className="w-4 h-4" /> CERRAR SESIÓN
                    </button>
                )}

                {/* Panel Confirmación */}
                {showConfirm && (
                    <div className="absolute top-14 right-0 w-64 bg-white border border-red-100 shadow-2xl rounded-xl p-5 z-[100] animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-2 mb-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-bold text-sm">¿Finalizar sesión?</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mb-4">Se borrará el acceso automático de este dispositivo.</p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 text-[10px] font-bold text-gray-400 bg-gray-50 rounded">VOLVER</button>
                            <button onClick={() => { logout(); setShowConfirm(false); }} className="flex-1 py-2 text-[10px] font-bold text-white bg-red-600 rounded">SÍ, SALIR</button>
                        </div>
                    </div>
                )}
              </div>
            ) : (
              <button onClick={() => setView('login')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-emerald-600">
                <User className="w-5 h-5" /> <span className="hidden sm:inline">Acceso</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}