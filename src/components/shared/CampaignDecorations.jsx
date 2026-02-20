import React from 'react';
// Importa los iconos que estuvieras usando en la decoración (ejemplo: Gift, Sparkles, etc.)
import { Gift, Sparkles, Snowflake, Heart } from 'lucide-react';

/* * ============================================================================
 * 🎄 COMPONENTE: DECORACIONES DE CAMPAÑA
 * ============================================================================
 * Muestra efectos visuales (como nieve o regalos) si hay una campaña activa.
 */


// --- NUEVO: COMPONENTE DE DECORACIÓN DE CAMPAÑAS (POSICIONES CORREGIDAS) ---
export const CampaignDecorations = ({ config }) => {
    if (!config?.active) return null;

    // 1. NAVIDAD: Emojis flotantes y ambiente festivo
    if (config.type === 'christmas') {
        return (
            <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden">
                {/* Elementos decorativos en las esquinas (BAJADOS para no chocar con el header) */}
                <div className="absolute top-44 left-5 text-6xl animate-bounce opacity-80 filter drop-shadow-lg">🎅</div>
                <div className="absolute top-52 right-10 text-5xl animate-pulse opacity-90 filter drop-shadow-lg">🎄</div>
                
                <div className="absolute bottom-10 left-10 text-5xl animate-bounce" style={{ animationDuration: '3s' }}>🎁</div>
                <div className="absolute bottom-20 right-5 text-6xl rotate-12 opacity-80">🦌</div>
                
                {/* Nieve sutil */}
                <div className="absolute top-1/4 left-1/4 text-2xl opacity-20 animate-pulse">❄️</div>
                <div className="absolute top-1/2 left-3/4 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>❄️</div>
            </div>
        );
    }

    // 2. BLACK FRIDAY: Cinta roja cruzada y oscurecimiento
    if (config.type === 'black_friday') {
        return (
            <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
                {/* Cinta Roja (Esta se queda arriba porque tiene z-60 y debe tapar el menú) */}
                <div className="absolute top-0 right-0 w-64 h-64 overflow-hidden">
                    <div className="absolute top-[40px] right-[-60px] w-[280px] transform rotate-45 bg-red-600 text-white font-black py-2 text-center shadow-xl border-y-4 border-black tracking-widest text-sm z-50">
                        BLACK FRIDAY
                        <span className="block text-[10px] font-medium text-yellow-300">-{config.discount}% DTO</span>
                    </div>
                </div>
                
                {/* Etiqueta flotante inferior */}
                <div className="absolute bottom-5 right-5 bg-black text-white px-4 py-2 rounded-lg font-bold border-2 border-red-600 shadow-2xl animate-bounce">
                    💣 ¡OFERTA LÍMITE!
                </div>
            </div>
        );
    }

    // 3. FIN DE TEMPORADA / VERANO
    if (config.type === 'summer') {
        return (
            <div className="fixed inset-0 pointer-events-none z-[5] overflow-hidden">
                {/* Sol (BAJADO para no chocar con el header) */}
                <div className="absolute top-48 right-10 text-7xl opacity-90 animate-spin-slow" style={{ animationDuration: '10s' }}>☀️</div>
                
                <div className="absolute bottom-5 left-5 text-5xl animate-bounce">🏖️</div>
                <div className="absolute bottom-20 right-20 text-4xl opacity-80">🍦</div>
                <div className="absolute top-60 left-10 bg-orange-500 text-white text-xs font-black px-2 py-1 rounded rotate-[-10deg] shadow-lg">
                    LIQUIDACIÓN
                </div>
            </div>
        );
    }

    return null;
};