import DOMPurify from 'dompurify';

// ⌨️ COMPONENTE: CAJA DE TEXTO (INPUT) SANITIZADO.

export const Input = ({ label, onChange, onBlur, ...props }) => {
  
  const handleBlur = (e) => {
    // 1. Comprobamos que el valor sea texto
    if (typeof e.target.value === 'string') {
      // Sanitizamos el HTML/JS malicioso y quitamos espacios al inicio/final
      const sanitizedValue = DOMPurify.sanitize(e.target.value).trim();
      
      // Actualizamos el valor del input con la versión limpia
      e.target.value = sanitizedValue;
      
      // Si el componente padre nos pasó una función onChange, la actualizamos con el dato limpio
      if (onChange) {
        onChange(e);
      }
    }

    // 2. Si el componente padre nos pasó un onBlur, lo ejecutamos
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <div className="mb-3 w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input 
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100" 
        onChange={onChange}
        onBlur={handleBlur}
        {...props} 
      />
    </div>
  );
};