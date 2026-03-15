import React, { useState, useEffect } from 'react';
import { Ban, Clock } from 'lucide-react';

export function TopBanners({ campaignConfig, storeConfig }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [statusPrefix, setStatusPrefix] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!campaignConfig?.active) {
        setIsVisible(false);
        return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const hasStart = campaignConfig.scheduleStartActive && campaignConfig.startDate;
      const hasEnd = campaignConfig.scheduleEndActive && campaignConfig.endDate;
      const startTime = hasStart ? new Date(campaignConfig.startDate).getTime() : 0;
      const endTime = hasEnd ? new Date(campaignConfig.endDate).getTime() : Infinity;

      // Si ya pasó la fecha de fin, ocultamos el banner completamente
      if (hasEnd && now > endTime) {
          setIsVisible(false);
          clearInterval(interval);
          return;
      }

      setIsVisible(true);
      let targetDate = null;

      // Determinamos qué cuenta atrás mostrar
      if (hasStart && now < startTime) {
          targetDate = startTime;
          setStatusPrefix('Empieza en:');
      } else if (hasEnd && now <= endTime) {
          targetDate = endTime;
          setStatusPrefix('Termina en:');
      } else {
          // Está activa pero sin cuenta atrás
          setTimeLeft('');
          setStatusPrefix('');
          return; 
      }

      const distance = targetDate - now;
      if (distance > 0) {
          const d = Math.floor(distance / (1000 * 60 * 60 * 24));
          const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [campaignConfig]);

  return (
    <>
      {isVisible && (
        <div 
            className={`
                w-full py-3 px-4 text-center font-bold text-sm sticky z-[70] shadow-lg backdrop-blur-md
                flex flex-wrap justify-center items-center gap-x-4 gap-y-2 overflow-hidden
                transition-all duration-500 ease-in-out border-b
                ${campaignConfig.type === 'black_friday' ? 'bg-gradient-to-r from-gray-900 via-black to-gray-900 text-yellow-400 border-yellow-900/50' : ''}
                ${campaignConfig.type === 'christmas' ? 'bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white border-red-900 shadow-red-900/20' : ''}
                ${campaignConfig.type === 'summer' ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white border-orange-400' : ''}
                ${campaignConfig.type === 'none' || !campaignConfig.type ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-emerald-800' : ''}
            `} 
            style={{top: !storeConfig?.isOpen ? '48px' : '0'}}
        >
            <div className="flex items-center gap-2">
                {campaignConfig.type === 'christmas' && <span className="text-lg animate-bounce">🎄</span>}
                {campaignConfig.type === 'black_friday' && <span className="text-lg animate-pulse">🖤</span>}
                {campaignConfig.type === 'summer' && <span className="text-lg animate-spin-slow">☀️</span>}

                <span className="tracking-wide drop-shadow-md uppercase text-xs md:text-sm">
                    {campaignConfig.bannerMessage}
                </span>

                {campaignConfig.type === 'christmas' && <span className="text-lg animate-bounce" style={{animationDelay: '0.1s'}}>🎄</span>}
                {campaignConfig.type === 'summer' && <span className="text-lg">🏖️</span>}
            </div>

            {timeLeft && (
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30 flex items-center gap-2 shadow-inner">
                    <Clock className="w-4 h-4" />
                    <span className="font-bold text-[10px] md:text-xs uppercase opacity-90">{statusPrefix}</span>
                    <span className="font-mono tracking-wider font-black text-sm">{timeLeft}</span>
                </div>
            )}
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