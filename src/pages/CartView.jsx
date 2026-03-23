import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, CreditCard, Banknote, Gift, Check, AlertTriangle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function CartView({ cart, removeFromCart, createOrder, total, clubs, storeConfig, addToCart, products }) {
  const [formData, setFormData] = useState({ 
      name: '', email: '', phone: '', notification: 'email', rgpd: false, marketingConsent: false, emailUpdates: false
  });
  const [paymentMethod, setPaymentMethod] = useState('card');

  // --- NUEVOS ESTADOS DEL CARRITO ---
  const [cartDiscountInput, setCartDiscountInput] = useState('');
  const [activeCartCode, setActiveCartCode] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState('');

  const currentClubId = cart.length > 0 ? cart[0].clubId : null;
  const currentClub = clubs.find(c => c.id === currentClubId);
  const isCashEnabled = currentClub ? (currentClub.cashPaymentEnabled !== false) : true;

  useEffect(() => {
      if (!isCashEnabled && paymentMethod === 'cash') {
          setPaymentMethod('card');
      }
  }, [isCashEnabled, paymentMethod]);

  // --- LÓGICA DE UPSELL DINÁMICO CON PRODUCTOS REALES ---
  const [upsellOffer, setUpsellOffer] = useState(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);

  useEffect(() => {
      // Si no han cargado los productos de Firebase, no hacemos nada
      if (!products || products.length === 0) return;

      // Palabras clave para saber si un producto de tu BD real requiere foto
      const photoKeywords = ['taza', 'llavero', 'foto', 'cromo', 'calendario'];
      
      // 1. Crear nuestro catálogo de impulso basado en TUS PRODUCTOS REALES
      // Excluimos packs, elegimos productos baratos (< 15€) y detectamos si necesitan foto
      const realImpulseCatalog = products
          .filter(p => !p.name.toLowerCase().includes('pack') && p.price < 15)
          .map(p => ({
              ...p,
              requiresPhoto: photoKeywords.some(kw => p.name.toLowerCase().includes(kw))
          }));

      // 2. Agrupar productos por jugador en el carrito
      const playersMap = {}; 
      
      cart.forEach(item => {
          if (!item.playerName || item.isUpsell) return;
          
          if (!playersMap[item.playerName]) {
              playersMap[item.playerName] = { 
                  playerName: item.playerName,
                  triggerItem: item, 
                  hasPhoto: false, 
                  existingProducts: new Set() 
              };
          }

          const nameLower = item.name.toLowerCase();
          
          // Si este producto es de foto, nos sirve de molde perfecto
          if (photoKeywords.some(p => nameLower.includes(p)) || nameLower.includes('pack')) {
              playersMap[item.playerName].hasPhoto = true;
              playersMap[item.playerName].triggerItem = item; 
          }

          // Registrar lo que ya tiene para no ofrecérselo de nuevo
          playersMap[item.playerName].existingProducts.add(nameLower);
          
          // Intentar adivinar el contenido de los packs
          if (nameLower.includes('pack')) {
              if (item.details?.packItems) {
                  item.details.packItems.forEach(p => playersMap[item.playerName].existingProducts.add(p.name.toLowerCase()));
              } else {
                  ['taza', 'llavero', 'foto', 'botella'].forEach(p => playersMap[item.playerName].existingProducts.add(p));
              }
          }
      });

      const playersData = Object.values(playersMap);
      if (playersData.length === 0 || realImpulseCatalog.length === 0) {
          setUpsellOffer(null);
          setShowPlayerSelector(false);
          return;
      }

      // 3. Buscar una oferta válida en TU catálogo real
      const shuffledCatalog = [...realImpulseCatalog].sort(() => 0.5 - Math.random());
      let selectedOffer = null;

      for (const catalogItem of shuffledCatalog) {
          // Extraemos la palabra principal (ej: "Llavero" de "Llavero Personalizado") para comparar
          const keyword = catalogItem.name.split(' ')[0].toLowerCase(); 
          
          const eligiblePlayers = playersData.filter(p => {
              const meetsPhotoReq = catalogItem.requiresPhoto ? p.hasPhoto : true;
              // Comprobamos si el jugador YA tiene este producto
              const doesntHaveIt = !Array.from(p.existingProducts).some(existing => existing.includes(keyword));
              return meetsPhotoReq && doesntHaveIt;
          });

          if (eligiblePlayers.length > 0) {
              selectedOffer = { product: catalogItem, eligiblePlayers };
              break; // Encontramos un producto válido, paramos la búsqueda
          }
      }

      setUpsellOffer(selectedOffer);
      setShowPlayerSelector(false);
  }, [cart, products]); // Se recalcula si cambia el carrito o los productos

  // 4. Función para añadir el Upsell a los jugadores seleccionados
  const handleConfirmUpsell = (playersToProcess) => {
      if (!upsellOffer || !addToCart) return;

      playersToProcess.forEach(playerData => {
          const { triggerItem } = playerData;
          
          const upsellProduct = {
              id: upsellOffer.product.id,
              name: upsellOffer.product.name,
              
              // 🟢 SOLUCIÓN: Heredamos la categoría del equipo (ej: Alevín A) del producto de referencia
              category: triggerItem.category || '',
              
              image: upsellOffer.product.image || upsellOffer.product.imageUrl || '', 
              clubId: triggerItem.clubId,
              clubName: triggerItem.clubName,
              isUpsell: true
          };

          const upsellCustomization = {
              playerName: triggerItem.playerName,
              playerNumber: triggerItem.playerNumber,
              quantity: 1,
              details: triggerItem.details 
          };

          addToCart(upsellProduct, upsellCustomization, upsellOffer.product.price);
      });
      
      setShowPlayerSelector(false);
  };
  // ------------------------------------------

  // Cálculos de descuento
  let discountAmount = 0;
  if (activeCartCode) {
      if (activeCartCode.codeType === 'percent') discountAmount = total * (activeCartCode.discountValue / 100);
      if (activeCartCode.codeType === 'fixed') discountAmount = activeCartCode.discountValue;
  }
  const finalTotal = Math.max(0, total - discountAmount);

  // Validar código
  const handleApplyCartCode = async () => {
      if(!cartDiscountInput.trim()) return;
      setDiscountLoading(true);
      setDiscountError(''); // Limpiamos errores anteriores
      
      try {
          const q = query(collection(db, 'giftCodes'), where('code', '==', cartDiscountInput.trim().toUpperCase()));
          const snap = await getDocs(q);
          if(snap.empty) {
              setDiscountError("Código no válido o no existe.");
          } else {
              const codeData = snap.docs[0].data();

              // 1. Validar el club si tiene restricción
              const currentCartClubId = cart[0]?.clubId;
              if (codeData.allowedClub && codeData.allowedClub !== 'all' && codeData.allowedClub !== currentCartClubId) {
                  setDiscountError("Este cupón es exclusivo para otro club y no puede aplicarse a esta compra.");
                  setDiscountLoading(false);
                  return;
              }

              // 2. LÓGICA DE TIEMPO (Fechas y uso único)
              if (codeData.isTimeLimited) {
                  const now = new Date().toISOString();
                  
                  // Comprueba si aún no ha empezado
                  if (codeData.validFrom && now < codeData.validFrom) {
                      setDiscountError("Este cupón aún no está activo. Revisa la fecha de validez.");
                      setDiscountLoading(false);
                      return;
                  }
                  
                  // Comprueba si ya caducó
                  if (codeData.expiresAt && now > codeData.expiresAt) {
                      setDiscountError("Este cupón ha caducado por tiempo limitado.");
                      setDiscountLoading(false);
                      return;
                  }
              } else {
                  // Si no es por tiempo, es clásico: Comprobamos si ya fue canjeado (1 solo uso)
                  if (codeData.status === 'redeemed') {
                      setDiscountError("Este código ya ha sido canjeado.");
                      setDiscountLoading(false);
                      return;
                  }
              }

              // 3. Comprobar a qué aplica
              if (codeData.applyTo !== 'all') {
                  setDiscountError("Este código es para un producto específico. Vuelve a la Tienda y ponlo en el buscador superior.");
              } else {
                  setActiveCartCode({ ...codeData, docId: snap.docs[0].id });
                  setCartDiscountInput('');
              }
          }
      } catch(e) {
          console.error(e);
          setDiscountError("Error al validar el código.");
      }
      setDiscountLoading(false);
  };

  const handleSubmit = (e) => { 
      e.preventDefault(); 
      createOrder({ 
          items: cart, 
          customer: formData, 
          total: finalTotal, // Usamos el precio final rebajado
          subtotal: total, // Guardamos el precio original por si acaso
          cartDiscountCode: activeCartCode ? activeCartCode.code : null, // Enviamos el cupón
          cartDiscountId: activeCartCode ? activeCartCode.docId : null,
          paymentMethod, 
          clubId: cart[0]?.clubId || 'generic', 
          clubName: clubs.find(c => c.id === (cart[0]?.clubId))?.name || 'Club Generico' 
      }); 
  };

  if (cart.length === 0) return <div className="text-center py-20 text-gray-500 font-bold text-xl flex flex-col items-center"><ShoppingCart className="w-16 h-16 mb-4 text-gray-300"/>Tu carrito está vacío</div>;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold mb-4">Resumen</h2>

          {/* --- BANNER DE UPSELL DINÁMICO MULTIJUGADOR --- */}
          {upsellOffer && (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl mb-6 shadow-sm animate-fade-in relative z-10">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="bg-emerald-100 p-2 rounded-full shrink-0">
                              <Gift className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div>
                              <h4 className="font-bold text-emerald-900 text-sm">¡Completa tu pedido!</h4>
                              <p className="text-emerald-800 text-xs mt-0.5 leading-tight">
                                  Añade un/a <strong>{upsellOffer.product.name}</strong> 
                                  {upsellOffer.product.requiresPhoto 
                                      ? <span className="text-emerald-700"> usando la <strong>misma foto</strong></span> 
                                      : <span className="text-emerald-700"> con este mismo <strong>nombre y dorsal</strong></span>
                                  } por solo <strong className="text-emerald-600 text-sm">{upsellOffer.product.price.toFixed(2)}€/ud</strong>.
                              </p>
                          </div>
                      </div>
                      
                      <div className="w-full sm:w-auto shrink-0 relative">
                          <button 
                              type="button"
                              onClick={(e) => {
                                  e.preventDefault();
                                  // Si solo hay 1 jugador, lo añadimos directo. Si hay varios, abrimos el menú.
                                  if (upsellOffer.eligiblePlayers.length === 1) {
                                      handleConfirmUpsell(upsellOffer.eligiblePlayers);
                                  } else {
                                      setShowPlayerSelector(!showPlayerSelector);
                                  }
                              }} 
                              className="w-full text-sm py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                          >
                              {upsellOffer.eligiblePlayers.length === 1 
                                  ? `+ Añadir para ${upsellOffer.eligiblePlayers[0].playerName.split(' ')[0]}`
                                  : '+ Elegir Jugador...'
                              }
                          </button>

                          {/* Menú Desplegable si hay varios niños en el carrito */}
                          {showPlayerSelector && upsellOffer.eligiblePlayers.length > 1 && (
                              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-50 w-56 animate-fade-in flex flex-col gap-1">
                                  <div className="text-[10px] uppercase font-bold text-gray-400 px-2 pb-1 border-b mb-1">¿Para quién lo añadimos?</div>
                                  
                                  {upsellOffer.eligiblePlayers.map((player, idx) => (
                                      <button 
                                          key={idx}
                                          type="button"
                                          onClick={() => handleConfirmUpsell([player])}
                                          className="text-left text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 py-2 px-2 rounded transition-colors"
                                      >
                                          Solo para {player.playerName}
                                      </button>
                                  ))}
                                  
                                  <button 
                                      type="button"
                                      onClick={() => handleConfirmUpsell(upsellOffer.eligiblePlayers)}
                                      className="text-left text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-2 px-2 rounded mt-1 transition-colors flex justify-between items-center"
                                  >
                                      <span>¡Añadir para todos!</span>
                                      <span className="text-[10px] bg-emerald-800 px-1.5 py-0.5 rounded opacity-80">
                                          {(upsellOffer.product.price * upsellOffer.eligiblePlayers.length).toFixed(2)}€
                                      </span>
                                  </button>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}
          {/* ------------------------ */}

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
                                {/* NUEVO: Etiqueta de REGALO en el título */}
                                {item.isGift && (
                                    <span className="ml-2 bg-pink-100 text-pink-700 text-[10px] px-2 py-0.5 rounded font-bold border border-pink-200 align-middle">
                                        🎁 CÓDIGO: {item.giftCode}
                                    </span>
                                )}
                            </h4>
                            
                            {/* NUEVO: Mostrar GRATIS si es un regalo */}
                            <p className={`font-bold text-sm whitespace-nowrap ${item.isGift ? 'text-pink-600' : 'text-emerald-600'}`}>
                                {item.isGift ? 'GRATIS' : `${(item.price * (item.quantity || 1)).toFixed(2)}€`}
                            </p>
                        </div>

                        <div className="text-xs text-gray-600 mb-1 flex flex-col gap-0.5">
                            <span className="font-bold text-emerald-700">Club: {clubs.find(c => c.id === item.clubId)?.name || item.clubName || 'Club'}</span>
                            {item.category && <span className="text-gray-600"><strong>Categoría:</strong> {item.category}</span>}
                            {item.playerName && (
                                <div className="text-gray-600 mt-0.5">
                                    <strong>J1:</strong> {item.playerName} 
                                    {item.playerNumber && <> <strong className="ml-1">#</strong>{item.playerNumber}</>}
                                </div>
                            )}
                        </div>
                        {item.details && (item.details.player2 || item.details.player3 || item.details.variant !== 'Standard') && (
                            <div className="bg-slate-50 border border-slate-100 rounded p-2 text-[10px] space-y-1 mt-1.5">
                                {item.details.variant && item.details.variant !== 'Standard' && (
                                    <div className="font-bold text-blue-600 uppercase tracking-wide mb-1 border-b border-slate-200 pb-0.5">Opción: {item.details.variant}</div>
                                )}
                                {item.details.player2 && (
                                    <div className="flex flex-col gap-1 text-slate-600 text-xs mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">J2</span>
                                            <span>{item.details.player2.name} <strong className="ml-0.5">#{item.details.player2.number}</strong></span>
                                        </div>
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
              <Input label="Email (Obligatorio para factura)" type="email" required={true} placeholder="ejemplo@correo.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <Input label="Teléfono Contacto (Opcional)" type="tel" required={false} placeholder="Opcional" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              
              <div className="mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100">             
                  <div className="flex items-start gap-2">
                      <input type="checkbox" id="emailUpdates" checked={formData.emailUpdates} onChange={e => setFormData({...formData, emailUpdates: e.target.checked})} className="mt-1 accent-blue-600 w-4 h-4 cursor-pointer shrink-0" />
                      <label htmlFor="emailUpdates" className="text-xs text-blue-800 cursor-pointer">
                          <strong className="block mb-1">Avisos de Pedido</strong>
                          <span className="text-blue-600">Marca esta casilla si quieres que te avisemos de las actualizaciones del estado de tu pedido.</span>
                      </label>
                  </div>
              </div>

              <div className="flex items-start gap-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <input type="checkbox" id="marketing" checked={formData.marketingConsent} onChange={e => setFormData({...formData, marketingConsent: e.target.checked})} className="mt-1 accent-emerald-600" />
                  <label htmlFor="marketing" className="text-xs text-gray-600 cursor-pointer">
                      (Opcional) Deseo recibir información sobre ofertas, campañas y novedades de mi club.
                  </label>
              </div>

              {/* --- NUEVO: CAJÓN DE CÓDIGOS PARA EL CARRITO --- */}
              <div className="border-t pt-4 mb-4">
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                      <Gift className="w-4 h-4 text-emerald-600"/> ¿Tienes un cupón para toda la cesta?
                  </label>
                  
                  {activeCartCode ? (
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center animate-fade-in">
                          <div className="flex items-center gap-2">
                              <Check className="w-5 h-5 text-emerald-600 shrink-0"/>
                              <div>
                                  <p className="text-emerald-900 font-bold text-sm leading-tight">Cupón {activeCartCode.code}</p>
                                  <p className="text-emerald-700 text-xs font-medium mt-0.5">
                                      Se han descontado {activeCartCode.codeType === 'percent' ? `${activeCartCode.discountValue}%` : `${activeCartCode.discountValue}€`} del total.
                                  </p>
                              </div>
                          </div>
                          <button type="button" onClick={() => setActiveCartCode(null)} className="text-red-500 hover:text-red-700 text-xs font-bold underline px-2">Quitar</button>
                      </div>
                  ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                              <input 
                                  type="text"
                                  placeholder="Introduce tu código..." 
                                  value={cartDiscountInput} 
                                  onChange={e => setCartDiscountInput(e.target.value.toUpperCase())}
                                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-bold text-gray-700 shadow-sm"
                              />
                              <button 
                                  type="button" 
                                  onClick={handleApplyCartCode} 
                                  disabled={discountLoading || !cartDiscountInput} 
                                  className="bg-gray-800 hover:bg-gray-900 text-white px-6 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors shadow-sm shrink-0"
                              >
                                  {discountLoading ? '...' : 'Aplicar'}
                              </button>
                          </div>
                          {discountError && (
                              <div className="text-red-600 text-xs bg-red-50 p-2 rounded-lg border border-red-200 flex items-center gap-2 font-medium animate-fade-in">
                                  <AlertTriangle className="w-4 h-4 shrink-0"/> {discountError}
                              </div>
                          )}
                      </div>
                  )}
              </div>

              {/* Si todo el pedido es a coste 0€ (ej: solo hay regalos), no forzamos pago */}
              {total > 0 && (
                  <div className="border-t pt-4">
                      <label className="block text-sm font-medium mb-2">Pago</label>
                      <div className={`grid gap-2 mb-4 ${isCashEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          <div className={`p-3 border rounded-lg cursor-pointer text-center flex flex-col items-center gap-1 transition-all ${paymentMethod === 'card' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setPaymentMethod('card')}>
                              <CreditCard className="w-5 h-5"/> Tarjeta
                          </div>
                          {isCashEnabled && (
                              <div className={`p-3 border rounded-lg cursor-pointer text-center flex flex-col items-center gap-1 transition-all ${paymentMethod === 'cash' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setPaymentMethod('cash')}>
                                  <Banknote className="w-5 h-5"/> Efectivo
                              </div>
                          )}
                      </div>
                      {paymentMethod === 'cash' && isCashEnabled && (
                          <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mb-4 border border-yellow-200 animate-fade-in">El pedido quedará marcado como "Pendiente" hasta que abones el importe en tu club.</p>
                      )}
                      {paymentMethod === 'card' && (
                          <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mb-4 border border-blue-200 animate-fade-in">Pago seguro con tarjeta. El pedido se procesará inmediatamente.</p>
                      )}
                  </div>
              )}

              <div className="flex items-start gap-2 mb-4">
                  <input type="checkbox" required checked={formData.rgpd} onChange={e => setFormData({...formData, rgpd: e.target.checked})} className="mt-1 accent-emerald-600" />
                  <span className="text-xs text-gray-500">He leído y acepto la Política de Privacidad y el tratamiento de datos.</span>
              </div>
              
              <Button type="submit" disabled={!storeConfig.isOpen} className="w-full py-3 text-lg mt-4">
                  {storeConfig.isOpen ? `Pagar ${finalTotal.toFixed(2)}€` : 'TIENDA CERRADA'}
              </Button>
          </form>
      </div>
    </div>
  );
}