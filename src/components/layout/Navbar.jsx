import React from 'react';
import { ShoppingCart, LogOut, User } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

export function Navbar({ setView, role, currentClub, cart, storeConfig, setRole, setCurrentClub }) {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200" style={{top: !storeConfig.isOpen ? '48px' : '0'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-32">
          
          <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
            <CompanyLogo className="h-40" src="/logonegro.png" />
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {role === 'public' && (
              <>
                <button onClick={() => setView('home')} className="hover:text-emerald-600 font-medium">Inicio</button>
                <button onClick={() => setView('shop')} className="hover:text-emerald-600 font-medium">Tienda</button>
                <button onClick={() => setView('photo-search')} className="hover:text-emerald-600 font-medium">Fotos</button>
                <button onClick={() => setView('tracking')} className="hover:text-emerald-600 font-medium">Seguimiento</button>
              </>
            )}
            {role === 'club' && <button className="text-emerald-600 font-bold">Portal Club: {currentClub?.name}</button>}
            {role === 'admin' && <button className="text-emerald-600 font-bold">Panel de Administración</button>}
          </nav>

          <div className="flex items-center gap-4">
            {role === 'public' && (
              <div className="relative cursor-pointer" onClick={() => setView('cart')}>
                <ShoppingCart className="w-6 h-6 text-gray-600 hover:text-emerald-600" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </div>
            )}
            
            {role !== 'public' ? (
              <button onClick={() => { setRole('public'); setView('home'); setCurrentClub(null); }} className="text-gray-500 hover:text-red-500">
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setView('login')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-emerald-600">
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">Acceso</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}