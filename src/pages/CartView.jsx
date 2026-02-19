import React, { useState, useEffect } from 'react';
// Importamos los iconos que usa el carrito y los métodos de pago
import { ShoppingCart, Trash2, CreditCard, Banknote } from 'lucide-react';

// Importamos nuestros componentes visuales
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/* * ============================================================================
 * 🛒 VISTA: CARRITO DE COMPRAS Y CHECKOUT
 * ============================================================================
 * Muestra los productos añadidos, permite eliminarlos y 
 * contiene el formulario de datos del cliente y método de pago.
 */

export function CartView({ cart, removeFromCart, createOrder, total, clubs, storeConfig }) {
  const [formData, setFormData] = useState({ 
      name: '', 
      email: '', 
      phone: '', 
      notification: 'email', 
      rgpd: false,
      marketingConsent: false,
      emailUpdates: false // Nueva casilla por defecto desmarcada
  });
  const [paymentMethod, setPaymentMethod] = useState('card');

  // --- 1. LÓGICA DE DETECCIÓN DEL CLUB Y PERMISOS DE PAGO ---
  // Obtenemos el club del carrito (asumiendo que todos los items son del mismo club o usamos el primero)
  const currentClubId = cart.length > 0 ? cart[0].clubId : null;
  const currentClub = clubs.find(c => c.id === currentClubId);
  
  // Si no está definido (legacy), asumimos que sí se permite (true)
  const isCashEnabled = currentClub ? (currentClub.cashPaymentEnabled !== false) : true;

  // Si el usuario tenía seleccionado Efectivo pero el club lo prohíbe, cambiar a tarjeta automáticamente
  useEffect(() => {
      if (!isCashEnabled && paymentMethod === 'cash') {
          setPaymentMethod('card');
      }
  }, [isCashEnabled, paymentMethod]);
  // ------------------------------------------------------------

  const handleSubmit = (e) => { 
      e.preventDefault(); 
      createOrder({ 
          items: cart, 
          customer: formData, 
          total: total, 
          paymentMethod, 
          clubId: cart[0]?.clubId || 'generic', 
          clubName: clubs.find(c => c.id === (cart[0]?.clubId))?.name || 'Club Generico' 
      }); 
  };

  if (cart.length === 0) return <div className="text-center py-20 text-gray-500 font-bold text-xl flex flex-col items-center"><ShoppingCart className="w-16 h-16 mb-4 text-gray-300"/>Tu carrito está vacío</div>;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ... (La columna de items del carrito se queda igual) ... */}
      <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold mb-4">Resumen</h2>
            {cart.map((item, index) => (
                <div key={item.cartId || index} className="flex gap-4 mb-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0 relative">
                        <img src={item.image} className="w-full h-full object-cover" alt="" />
                        {item.quantity > 1 && (
                            <div className="absolute bottom-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-lg">
                                x{item.quantity}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-gray-800 text-sm truncate pr-2" title={item.name}>
                                {item.name}
                            </h4>
                            <p className="font-bold text-emerald-600 text-sm whitespace-nowrap">
                                {(item.price * (item.quantity || 1)).toFixed(2)}€
                            </p>
                        </div>
                        {/* --- CORRECCIÓN INICIO: Diseño mejorado Club / Categoría --- */}
                        <div className="text-xs text-gray-600 mb-1 flex flex-col gap-0.5">
                            {/* 1. Nombre del Club (Buscamos en la lista 'clubs' usando el ID para asegurar que siempre salga el correcto) */}
                            <span className="font-bold text-emerald-700">
                                Club: {clubs.find(c => c.id === item.clubId)?.name || item.clubName || 'Club'}
                            </span>
                            
                            {/* 2. Categoría debajo y bien etiquetada */}
                            {item.category && (
                                <span className="text-gray-600">
                                    <strong>Categoría:</strong> {item.category}
                                </span>
                            )}

                            {/* 3. Datos del Jugador 1 */}
                            {item.playerName && (
                                <div className="text-gray-600 mt-0.5">
                                    <strong>J1:</strong> {item.playerName} 
                                    {item.playerNumber && (
                                        <> <strong className="ml-1">#</strong>{item.playerNumber}</>
                                    )}
                                </div>
                            )}
                        </div>
                        {item.details && (item.details.player2 || item.details.player3 || item.details.variant !== 'Standard') && (
                            <div className="bg-slate-50 border border-slate-100 rounded p-2 text-[10px] space-y-1 mt-1.5">
                                {item.details.variant && item.details.variant !== 'Standard' && (
                                    <div className="font-bold text-blue-600 uppercase tracking-wide mb-1 border-b border-slate-200 pb-0.5">
                                        Opción: {item.details.variant}
                                    </div>
                                )}
                                {item.details.player2 && (
                                    <div className="flex flex-col gap-1 text-slate-600 text-xs mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">J2</span>
                                            <span>{item.details.player2.name} <strong className="ml-0.5">#{item.details.player2.number}</strong></span>
                                        </div>
                                        {/* Mostrar categoría J2 si existe */}
                                        {item.details.player2.category && <span className="ml-7 text-[10px] text-slate-400">Cat: {item.details.player2.category}</span>}
                                    </div>
                                )}
                                {item.details.player3 && (
                                    <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[10px] shrink-0">J3</span>
                                        <span>{item.details.player3.name} <strong className="ml-0.5">#{item.details.player3.number}</strong></span>
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={() => removeFromCart(item.cartId)} className="text-[10px] text-red-400 hover:text-red-600 underline mt-2 flex items-center gap-1">
                            <Trash2 className="w-3 h-3"/> Eliminar producto
                        </button>
                    </div>
                </div>
            ))}
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md h-fit sticky top-24">
          <h3 className="text-xl font-bold mb-4">Finalizar Compra</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nombre y Apellidos" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              
                <Input 
                  label="Email (Obligatorio para factura)" 
                  type="email" 
                  required={true}
                  placeholder="ejemplo@correo.com"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
              />
              
              <Input 
                  label="Teléfono Contacto (Opcional)" 
                  type="tel" 
                  required={false} 
                  placeholder="Opcional"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
              

                <div className="mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100">             
                  {/* 2. Checkbox y Texto agrupados en flex */}
                  <div className="flex items-start gap-2">
                      <input 
                          type="checkbox" 
                          id="emailUpdates"
                          checked={formData.emailUpdates} 
                          onChange={e => setFormData({...formData, emailUpdates: e.target.checked})} 
                          className="mt-1 accent-blue-600 w-4 h-4 cursor-pointer shrink-0" 
                      />
                      <label htmlFor="emailUpdates" className="text-xs text-blue-800 cursor-pointer">
                          <strong className="block mb-1">Avisos de Pedido</strong>
                          <span className="text-blue-600">Marca esta casilla si quieres que te avisemos de las actualizaciones del estado de tu pedido.</span>
                      </label>
                  </div>
              </div>

              <div className="flex items-start gap-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <input 
                      type="checkbox"
                      id="marketing"
                      checked={formData.marketingConsent} 
                      onChange={e => setFormData({...formData, marketingConsent: e.target.checked})} 
                      className="mt-1 accent-emerald-600" 
                  />
                  <label htmlFor="marketing" className="text-xs text-gray-600 cursor-pointer">
                      (Opcional) Deseo recibir información sobre ofertas, campañas y novedades de mi club.
                  </label>
              </div>

              {/* --- SECCIÓN PAGO MODIFICADA --- */}
              <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Pago</label>
                  <div className={`grid gap-2 mb-4 ${isCashEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      
                      {/* TARJETA (Siempre visible) */}
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer text-center flex flex-col items-center gap-1 transition-all ${paymentMethod === 'card' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 hover:bg-gray-50'}`} 
                        onClick={() => setPaymentMethod('card')}
                      >
                          <CreditCard className="w-5 h-5"/> 
                          Tarjeta
                      </div>

                      {/* EFECTIVO (Solo si el club lo permite) */}
                      {isCashEnabled && (
                          <div 
                            className={`p-3 border rounded-lg cursor-pointer text-center flex flex-col items-center gap-1 transition-all ${paymentMethod === 'cash' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 hover:bg-gray-50'}`} 
                            onClick={() => setPaymentMethod('cash')}
                          >
                              <Banknote className="w-5 h-5"/> 
                              Efectivo
                          </div>
                      )}
                  </div>

                  {/* Mensajes según método */}
                  {paymentMethod === 'cash' && isCashEnabled && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mb-4 border border-yellow-200 animate-fade-in">
                          El pedido quedará marcado como "Pendiente" hasta que abones el importe en tu club.
                      </p>
                  )}
                  {paymentMethod === 'card' && (
                      <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mb-4 border border-blue-200 animate-fade-in">
                          Pago seguro con tarjeta. El pedido se procesará inmediatamente.
                      </p>
                  )}
              </div>
              {/* ------------------------------------- */}

              <div className="flex items-start gap-2 mb-4">
                  <input type="checkbox" required checked={formData.rgpd} onChange={e => setFormData({...formData, rgpd: e.target.checked})} className="mt-1 accent-emerald-600" />
                  <span className="text-xs text-gray-500">He leído y acepto la Política de Privacidad y el tratamiento de datos.</span>
              </div>
              
              <Button type="submit" disabled={!storeConfig.isOpen} className="w-full py-3 text-lg">
                  {storeConfig.isOpen ? `Pagar ${total.toFixed(2)}€` : 'TIENDA CERRADA'}
              </Button>
          </form>
      </div>
    </div>
  );
}