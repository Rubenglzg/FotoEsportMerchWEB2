import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AVAILABLE_COLORS } from '../../../config/constants'; // Ajusta esta ruta según la ubicación de constants.js

export const ColorPicker = ({ selectedColor, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Buscamos el color actual o ponemos blanco por defecto
    const current = AVAILABLE_COLORS.find(c => c.id === selectedColor) || AVAILABLE_COLORS[0];

    return (
        <div className="relative">
            {/* Botón Principal */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 border rounded px-3 py-2 bg-white hover:bg-gray-50 transition-colors w-32 justify-between"
                title="Seleccionar color oficial"
            >
                <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border ${current.border} shadow-sm`} style={{ backgroundColor: current.hex }}></div>
                    <span className="text-sm text-gray-700 font-medium truncate">{current.label}</span>
                </div>
                <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {/* Dropdown Visual */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-3 w-48 grid grid-cols-5 gap-2 animate-fade-in-down">
                        {AVAILABLE_COLORS.map(c => (
                            <button
                                key={c.id}
                                onClick={() => { onChange(c.id); setIsOpen(false); }}
                                className={`w-6 h-6 rounded-full border ${c.border} hover:scale-110 transition-transform relative group shadow-sm`}
                                style={{ backgroundColor: c.hex }}
                                title={c.label}
                            >
                                {selectedColor === c.id && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className={`w-1.5 h-1.5 rounded-full ${['white', 'yellow'].includes(c.id) ? 'bg-black' : 'bg-white'}`}></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};