import React, { useState, useEffect } from 'react';

export const DelayedInput = ({ value, onSave, className, placeholder, type = "text" }) => {
    const [localValue, setLocalValue] = useState(value || '');

    // Sincronizar estado local si el valor externo cambia (ej. al cargar)
    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    return (
        <input 
            type={type}
            placeholder={placeholder}
            className={className}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => onSave(localValue)} // Guarda solo al perder el foco (salir del input)
        />
    );
};