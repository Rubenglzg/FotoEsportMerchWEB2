import React, { useState } from 'react';
// Importamos solo los iconos que usa esta vista
import { Package, FileText, Settings, Check } from 'lucide-react'; 

// Importamos nuestros componentes visuales
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

/* * ============================================================================
 * 📍 VISTA: SEGUIMIENTO DE PEDIDOS
 * ============================================================================
 * Esta es la pantalla donde los usuarios introducen el ID de su pedido 
 * para ver en qué estado se encuentra (Recopilando, En producción, Entregado...).
 */

export function TrackingView({ orders }) {
  const [searchId, setSearchId] = useState('');
  const [foundOrder, setFoundOrder] = useState(null);
  
  const handleTrack = (e) => { 
      e.preventDefault(); 
      const order = orders.find(o => o.id === searchId || o.id.startsWith(searchId)); 
      if (order) setFoundOrder(order); 
      else alert("Pedido no encontrado. Intenta con un ID válido."); 
  };
  
  return (
    <div className="max-w-xl mx-auto text-center py-12">
        <Package className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-6">Seguimiento de Pedido</h2>
        <form onSubmit={handleTrack} className="flex gap-2 mb-12">
            <input type="text" placeholder="ID de Pedido (ej. 7A2B...)" className="flex-1 px-4 py-3 border rounded-lg" value={searchId} onChange={e => setSearchId(e.target.value)} />
            <Button type="submit">Consultar</Button>
        </form>
        {foundOrder && (
            <div className="bg-white p-8 rounded-xl shadow-lg text-left animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <p className="text-sm text-gray-500">Pedido #{foundOrder.id.slice(0,6)}</p>
                        <p className="font-bold text-xl">{foundOrder.visibleStatus}</p>
                    </div>
                    <Badge status={foundOrder.status} />
                </div>
                <div className="space-y-6">
                    <div className={`flex gap-4 ${foundOrder.status === 'recopilando' ? 'opacity-100' : 'opacity-50'}`}>
                        <div className="bg-blue-100 p-2 rounded-full h-fit"><FileText className="w-5 h-5 text-blue-600"/></div>
                        <div><h4 className="font-bold">Recopilando</h4><p className="text-sm text-gray-500">Tu pedido está siendo procesado por el club.</p></div>
                    </div>
                    <div className={`flex gap-4 ${foundOrder.status === 'en_produccion' ? 'opacity-100' : 'opacity-50'}`}>
                        <div className="bg-purple-100 p-2 rounded-full h-fit"><Settings className="w-5 h-5 text-purple-600"/></div>
                        <div><h4 className="font-bold">En Producción</h4><p className="text-sm text-gray-500">Fabricando tus productos personalizados.</p></div>
                    </div>
                    <div className={`flex gap-4 ${foundOrder.status === 'entregado_club' ? 'opacity-100' : 'opacity-50'}`}>
                        <div className="bg-green-100 p-2 rounded-full h-fit"><Check className="w-5 h-5 text-green-600"/></div>
                        <div><h4 className="font-bold">Listo para Recoger</h4><p className="text-sm text-gray-500">Ya está disponible en las oficinas de {foundOrder.clubName || 'tu club'}.</p></div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}