import React from 'react';
import { Ban } from 'lucide-react';

export function TopBanners({ campaignConfig, storeConfig }) {
  return (
    <>
      {/* --- BANNER DE CAMPAÑA PRO --- */}
      {campaignConfig?.active && campaignConfig?.bannerMessage && (
        <div 
            className={`
                w-full py-3 px-4 text-center font-bold text-sm sticky z-[70] shadow-lg backdrop-blur-md
                flex justify-center items-center gap-3 overflow-hidden
                transition-all duration-500 ease-in-out border-b
                ${campaignConfig.type === 'black_friday' ? 'bg-gradient-to-r from-gray-900 via-black to-gray-900 text-yellow-400 border-yellow-900/50' : ''}
                ${campaignConfig.type === 'christmas' ? 'bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white border-red-900 shadow-red-900/20' : ''}
                ${campaignConfig.type === 'summer' ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white border-orange-400' : ''}
                ${campaignConfig.type === 'none' || !campaignConfig.type ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-emerald-800' : ''}
            `} 
            style={{top: !storeConfig?.isOpen ? '48px' : '0'}}
        >
            {campaignConfig.type === 'christmas' && <span className="text-lg animate-bounce">🎄</span>}
            {campaignConfig.type === 'black_friday' && <span className="text-lg animate-pulse">🖤</span>}
            {campaignConfig.type === 'summer' && <span className="text-lg animate-spin-slow">☀️</span>}

            <span className="tracking-wide drop-shadow-md uppercase text-xs md:text-sm">
                {campaignConfig.bannerMessage}
            </span>

            {campaignConfig.type === 'christmas' && <span className="text-lg animate-bounce" style={{animationDelay: '0.1s'}}>🎄</span>}
            {campaignConfig.type === 'black_friday' && <span className="text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded font-black transform -rotate-3 shadow-sm">OFICIAL</span>}
            {campaignConfig.type === 'summer' && <span className="text-lg">🏖️</span>}
        </div>
      )}

      {/* --- BANNER DE TIENDA CERRADA --- */}
      {!storeConfig?.isOpen && (
        <div className="bg-red-600 text-white p-3 text-center font-bold sticky top-0 z-[60] shadow-md flex items-center justify-center gap-2">
          <Ban className="w-5 h-5"/>
          {storeConfig.closedMessage}
        </div>
      )}
    </>
  );
}