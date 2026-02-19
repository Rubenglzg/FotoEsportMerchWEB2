// ⌨️ COMPONENTE: CAJA DE TEXTO (INPUT).

export const Input = ({ label, ...props }) => (
  <div className="mb-3 w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100" {...props} />
  </div>
);