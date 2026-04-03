import React from 'react';
import { UserX, AlertTriangle, ExternalLink } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

export function Footer({ setView }) {
  return (
    <footer className="bg-gray-900 text-white pt-12 mt-auto border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Columna 1: Logo y Descripción */}
        <div className="flex flex-col">
          <div className="mb-6 text-white">
            <CompanyLogo className="h-40" />
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Merchandising personalizado para clubes deportivos. Calidad profesional y gestión integral.
          </p>
        </div>

        {/* Columna 2: Legal */}
        <div className="md:pt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-100">Legal</h3>
          <ul className="space-y-3 text-sm text-gray-400">
            <li 
              onClick={() => setView('privacy')}
              className="hover:text-emerald-400 cursor-pointer transition-colors"
            >
              Política de privacidad
            </li>
            <li 
              onClick={() => setView('legal')}
              className="hover:text-emerald-400 cursor-pointer transition-colors"
            >
              Aviso legal
            </li>
            <li 
              onClick={() => setView('right-to-forget')} 
              className="hover:text-emerald-400 text-emerald-600 font-bold flex items-center gap-2 cursor-pointer transition-colors mt-4"
            >
              <UserX className="w-4 h-4"/> Derecho al olvido
            </li>
          </ul>
        </div>

        {/* Columna 3: Contacto y Soporte */}
        <div className="md:pt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-100">Contacto y soporte</h3>
          <p className="text-gray-400 text-sm mb-6">info@fotoesportmerch.es</p>
          
          <button 
            onClick={() => setView('incident-report')} 
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-semibold border border-gray-700 hover:border-red-500/50 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-red-500/10 shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Reportar incidencia
          </button>
        </div>

        {/* Columna 4: Sooner Software */}
        <div className="md:pt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-100">Software de gestión</h3>
          
          {/* Tarjeta Promocional de Sooner */}
          <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors group">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-3">
              Descubre nuestro software
            </p>
            {/* Logo adaptado para la proporción rectangular 500x104 */}
            <img 
              src="/sooner-logo.png" 
              alt="Sooner Software Logo" 
              className="h-8 w-auto mb-3 opacity-90 group-hover:opacity-100 transition-opacity" 
            />
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Gestión automatizada de fichas y control integral para clubes deportivos.
            </p>
            <a 
              href="https://sooner.es" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
            >
              Conocer Sooner <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

      </div>


      {/* Barra de Copyright inferior */}
      <div className="max-w-7xl mx-auto px-4 mt-8 pt-6 pb-6 border-t border-gray-800 text-center text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>&copy; {new Date().getFullYear()} FotoEsport Merch. Todos los derechos reservados.</p>
        <p>Innovación y tecnología aplicadas a la gestión deportiva integral.</p>
      </div>
    </footer>
  );
}