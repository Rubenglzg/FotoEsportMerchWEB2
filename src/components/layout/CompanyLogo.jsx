import React from 'react';
import { LOGO_URL } from '../../config/constants';

/* * ============================================================================
 * 🖼️ COMPONENTE: LOGO DE LA EMPRESA
 * ============================================================================
 */

export const CompanyLogo = ({ className = "h-10", src }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        {/* Si pasamos una imagen específica (src) la usamos, si no usamos la global (LOGO_URL) */}
        {(src || LOGO_URL) ? (
            <img src={src || LOGO_URL} alt="FotoEsport Merch" className="h-full w-auto object-contain" />
        ) : (
            <div className="flex items-center">
                <div className="relative flex items-center justify-center bg-white border-4 border-emerald-700 rounded-lg w-12 h-10 mr-2 shadow-sm">
                    <div className="absolute -top-1.5 right-2 w-3 h-1.5 bg-emerald-700 rounded-t-sm"></div>
                    <div className="w-8 h-8 bg-gray-100 rounded-full border-2 border-emerald-700 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full relative bg-white">
                            <div className="absolute inset-0 border border-gray-900 rounded-full"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-900"></div>
                            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-gray-900"></div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col leading-none">
                    <span className="font-black text-xl tracking-tighter text-gray-900">FOTOESPORT</span>
                    <span className="font-black text-xl tracking-tighter text-emerald-600">MERCH</span>
                </div>
            </div>
        )}
    </div>
);