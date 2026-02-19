/* * ============================================================================
 * 🔘 COMPONENTE: BOTÓN GENÉRICO
 * ============================================================================
 * Este es el botón estándar de toda la aplicación. Lo centralizamos aquí para 
 * que cualquier cambio de diseño (colores, bordes redondeados) se aplique 
 * automáticamente a todos los botones de la web.
 */

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, size = 'md' }) => {
  const baseStyle = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const sizes = { xs: "px-2 py-1 text-[10px]", sm: "px-2 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    outline: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    warning: "bg-orange-500 text-white hover:bg-orange-600",
    dark: "bg-gray-900 text-white hover:bg-gray-800",
    ghost: "text-gray-500 hover:text-emerald-600 hover:bg-gray-50"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
};