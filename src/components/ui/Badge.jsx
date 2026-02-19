/* * ============================================================================
 * 🏷️ COMPONENTE: ETIQUETA (BADGE)
 * ============================================================================
 * Pequeña pastilla de color que usamos para mostrar el estado de los pedidos
 * (ej: "Entregado", "Pendiente") o destacar información pequeña.
 */

export const Badge = ({ status }) => {
  const styles = {
    'recopilando': 'bg-blue-100 text-blue-800',
    'pendiente_validacion': 'bg-yellow-100 text-yellow-800',
    'en_produccion': 'bg-purple-100 text-purple-800',
    'entregado_club': 'bg-green-100 text-green-800',
    'special_order': 'bg-indigo-100 text-indigo-800',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100'}`}>{status.replace(/_/g, ' ').toUpperCase()}</span>;
};