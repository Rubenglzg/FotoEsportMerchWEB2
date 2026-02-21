import React from 'react';
import { UserX, AlertTriangle } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

export function Footer({ setView }) {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Columna 1: Logo y Descripción */}
        <div>
          <div className="mb-4 text-white">
            <CompanyLogo className="h-40" />
          </div>
          <p className="text-gray-400">Merchandising personalizado para clubes deportivos. Calidad profesional y gestión integral.</p>
        </div>

        {/* Columna 2: Legal */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Legal</h3>
          <ul className="space-y-2 text-gray-400">
            <li 
              onClick={() => setView('privacy')}
              className="hover:text-emerald-400 cursor-pointer transition-colors"
            >
              Política de Privacidad
            </li>
            <li 
              onClick={() => setView('legal')}
              className="hover:text-emerald-400 cursor-pointer transition-colors"
            >
              Aviso Legal
            </li>
            <li 
              onClick={() => setView('right-to-forget')} 
              className="hover:text-emerald-400 text-emerald-600 font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <UserX className="w-4 h-4"/> Derecho al Olvido (RGPD)
            </li>
          </ul>
        </div>

        {/* Columna 3: Contacto y Soporte */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Contacto y Soporte</h3>
          <p className="text-gray-400 mb-6">info@fotoesportmerch.es</p>
          
          <button 
            onClick={() => setView('incident-report')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700"
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Reportar Incidencia
          </button>
        </div>

      </div>
    </footer>
  );
}