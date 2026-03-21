import React, { useState, useMemo, useEffect } from 'react';
import { Search, ShoppingBag, ChevronLeft, Clock, Gift, Check, AlertTriangle, X, ArrowRight, RefreshCw } from 'lucide-react';

import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { storage, db } from '../config/firebase';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// --- NUEVAS IMPORTACIONES PARA LA BÚSQUEDA DE FOTOS ---
import { ProtectedWatermarkImage, normalizeText } from './PhotoSearchView';
import { LOGO_URL } from '../config/constants';

/* * ============================================================================
 * 🛍️ VISTA: TIENDA Y PERSONALIZADOR
 * ============================================================================
 */

export function ShopView({ products, addToCart, clubs, modificationFee, storeConfig, setConfirmation, campaignConfig }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  const [activeClub, setActiveClub] = useState(null);
  const [clubSearchQuery, setClubSearchQuery] = useState('');

  // --- Estados para Códigos de Regalo ---
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [isLoadingGift, setIsLoadingGift] = useState(false);
  const [activeGiftCode, setActiveGiftCode] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // --- LÓGICA DE TIEMPO REAL PARA LA CAMPAÑA ---
  const [isCampaignActive, setIsCampaignActive] = useState(false);

  useEffect(() => {
      if (!campaignConfig?.active) {
          setIsCampaignActive(false);
          return;
      }
      
      const checkStatus = () => {
          const now = new Date().getTime();
          const hasStart = campaignConfig.scheduleStartActive && campaignConfig.startDate;
          const hasEnd = campaignConfig.scheduleEndActive && campaignConfig.endDate;
          const startTime = hasStart ? new Date(campaignConfig.startDate).getTime() : 0;
          const endTime = hasEnd ? new Date(campaignConfig.endDate).getTime() : Infinity;

          // La campaña es "efectivamente activa" si ya pasó el inicio Y no ha pasado el fin
          const isActiveNow = !(hasStart && now < startTime) && !(hasEnd && now > endTime);
          
          // Solo actualizamos el estado si ha habido un cambio (para no saturar React)
          setIsCampaignActive(prev => prev !== isActiveNow ? isActiveNow : prev);
      };

      checkStatus(); // Comprobación inicial
      const interval = setInterval(checkStatus, 1000); // Comprobación cada segundo
      
      return () => clearInterval(interval);
  }, [campaignConfig]);

  const showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const categories = useMemo(() => {
    const validSections = products.map(p => p.shopSection).filter(sec => sec && sec.trim() !== '');
    return ['Todos', ...new Set(validSections)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const now = new Date(); 
    return products.filter(p => {
      if (!p.shopSection || p.shopSection.trim() === '') return false;
      const vis = p.visibility || {};
      if (vis.status === 'hidden') return false; 
      if (vis.status === 'limited' && vis.availableUntil) {
          if (now > new Date(vis.availableUntil)) return false; 
      }
      if (p.exclusiveClubs && p.exclusiveClubs.length > 0) {
          if (!activeClub || !p.exclusiveClubs.includes(activeClub.id)) return false;
      }
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.shopSection === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, activeClub]);

  // --- Función para canjear código ---
  const handleRedeemGift = async () => {
      if(!giftCodeInput.trim()) return;
      setIsLoadingGift(true);
      try {
          const q = query(collection(db, 'giftCodes'), where('code', '==', giftCodeInput.trim().toUpperCase()));
          const snap = await getDocs(q);
          
          if(snap.empty) {
              showToast("Código no válido o no existe.", "error");
          } else {
              const codeData = snap.docs[0].data();

              // --- NUEVA COMPROBACIÓN DE CLUB AQUÍ ---
              if (codeData.allowedClub && codeData.allowedClub !== 'all' && codeData.allowedClub !== activeClub?.id) {
                  showToast("Este código no es válido para los productos de este club.", "error");
                  setIsLoadingGift(false);
                  return;
              }

              if(codeData.status === 'redeemed') {
                  showToast("Este código ya ha sido canjeado.", "error");
              } else if (codeData.applyTo === 'all') {
                  // Si el código es para toda la cesta, le indicamos que vaya al carrito
                  showToast("¡Código válido! Es un descuento para toda la compra. Aplícalo en la pantalla del Carrito de la Compra.", "success");
                  setGiftCodeInput('');
              } else {
                  const prod = products.find(p => p.id === codeData.productId);
                  if(prod) {
                      setActiveGiftCode({ ...codeData, docId: snap.docs[0].id });
                      setSelectedProduct(prod);
                      setGiftCodeInput('');
                      
                      // Mensaje dinámico según el tipo
                      let msg = "¡Código aplicado! ";
                      if (codeData.codeType === 'product') msg += "Personaliza tu regalo gratis.";
                      else if (codeData.codeType === 'percent') msg += `Tienes un ${codeData.discountValue}% de descuento.`;
                      else if (codeData.codeType === 'fixed') msg += `Tienes ${codeData.discountValue}€ de descuento.`;
                      
                      showToast(msg);
                  } else {
                      showToast("El producto de este descuento ya no está disponible en el catálogo.", "error");
                  }
              }
          }
      } catch(e) {
          console.error(e);
          showToast("Error al validar el código.", "error");
      }
      setIsLoadingGift(false);
  };

  // Buscador de Club (Pantalla inicial)
  if (!activeClub) {
    const suggestedClubs = clubSearchQuery.trim().length > 0 
        ? clubs.filter(c => !c.blocked && c.name.toLowerCase().includes(clubSearchQuery.toLowerCase()))
        : [];

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in relative">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                <h2 className="text-3xl font-black text-gray-900 mb-2 relative z-10">¡Bienvenido!</h2>
                <p className="text-gray-500 text-sm mb-8 relative z-10">Busca tu club para acceder al catálogo y ofertas exclusivas de tu equipo.</p>
                
                <div className="relative z-10 mb-2">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                        type="text" autoFocus placeholder="Escribe el nombre de tu club..."
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-gray-700 shadow-inner"
                        value={clubSearchQuery} onChange={(e) => setClubSearchQuery(e.target.value)}
                    />
                </div>

                <div className="relative z-10 text-left">
                    {clubSearchQuery.trim().length > 0 ? (
                        <div className="bg-white border border-gray-100 rounded-2xl shadow-lg mt-2 max-h-64 overflow-y-auto custom-scrollbar p-2">
                            {suggestedClubs.length > 0 ? (
                                suggestedClubs.map(club => (
                                    <button 
                                        key={club.id}
                                        onClick={() => { setActiveClub(club); setClubSearchQuery(''); }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 transition-colors group text-left"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {club.logoUrl ? <img src={club.logoUrl} alt={club.name} className="w-8 h-8 object-contain"/> : <span className="font-bold text-gray-300 text-xs">?</span>}
                                        </div>
                                        <span className="font-bold text-gray-700 group-hover:text-emerald-700 flex-1">{club.name}</span>
                                        <ChevronLeft className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 rotate-180 transition-transform opacity-0 group-hover:opacity-100 group-hover:translate-x-1" />
                                    </button>
                                ))
                            ) : (
                                <div className="py-8 text-center">
                                    <p className="text-sm font-bold text-gray-700">No hay resultados</p>
                                    <p className="text-xs text-gray-400 mt-1">Comprueba si lo has escrito bien.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 mt-4 italic text-center">Empieza a escribir para ver las sugerencias.</p>
                    )}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-screen pb-12 relative">
      
      {/* Toast Notificaciones */}
      {toast.show && (
          <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
              {toast.type === 'success' ? <Check className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
              <span className="font-bold text-sm">{toast.message}</span>
              <button onClick={() => setToast({...toast, show: false})} className="ml-2 opacity-70 hover:opacity-100">
                  <X className="w-4 h-4" />
              </button>
          </div>
      )}

      {!selectedProduct ? (
        <>
          <div className="mb-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                    {activeClub.logoUrl && <img src={activeClub.logoUrl} className="w-8 h-8 object-contain drop-shadow-sm" alt="Logo"/>}
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wide border border-emerald-200">
                        Tienda Oficial: {activeClub.name}
                    </span>
                    <button onClick={() => { setActiveClub(null); setSelectedProduct(null); }} className="text-xs text-gray-400 hover:text-red-500 underline transition-colors">
                        Cambiar club
                    </button>
                </div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">Catálogo Oficial</h2>
                <p className="text-gray-500 mt-1">Personaliza tus productos para hacerlos aún más únicos.</p>
              </div>
              
              {/* Buscador de Productos y Buscador de Códigos (DISEÑO NEUTRO UNIFICADO) */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  {/* Buscador Normal */}
                  <div className="relative w-full sm:w-64 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                      placeholder="Buscar producto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Canjeo de Códigos Neutro */}
                  <div className="relative w-full sm:w-56 group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Gift className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      </div>
                      <input 
                          type="text" 
                          placeholder="Código Regalo..." 
                          className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase transition-all shadow-sm"
                          value={giftCodeInput}
                          onChange={(e) => setGiftCodeInput(e.target.value.toUpperCase())}
                      />
                      <button 
                          onClick={handleRedeemGift} 
                          disabled={isLoadingGift || !giftCodeInput} 
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-gray-800 text-white p-1.5 rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
                          title="Canjear"
                      >
                          <ArrowRight className="w-4 h-4"/>
                      </button>
                  </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all transform active:scale-95 ${
                    selectedCategory === cat
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map(product => {
                const vis = product.visibility || {};
                const isScheduled = vis.status === 'scheduled' && vis.availableFrom && new Date() < new Date(vis.availableFrom);

                return (
                <div 
                  key={product.id} 
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 flex flex-col h-full ${isScheduled ? 'border-gray-100 opacity-90' : 'hover:shadow-xl hover:border-emerald-100 cursor-pointer hover:-translate-y-1 group'}`}
                  onClick={() => { if (!isScheduled) setSelectedProduct(product); }}
                >
                  <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden flex items-center justify-center">
                    <img src={product.image} alt={product.name} loading="lazy" className={`absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-700 ease-out z-10 ${!isScheduled && 'group-hover:scale-110'}`} />
                    
                    {isScheduled && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
                            <span className="bg-orange-600 text-white font-black px-4 py-2 rounded-lg shadow-lg -rotate-6 uppercase tracking-wider text-sm border-2 border-white">
                                Próximamente
                            </span>
                        </div>
                    )}
                    
                    <div className="absolute top-3 left-3 z-20">
                      <span className="bg-white/90 backdrop-blur-sm text-xs font-bold px-2 py-1 rounded-md text-gray-700 shadow-sm border border-white/50 uppercase tracking-wider">
                          {product.shopSection}
                      </span>
                    </div>

                    {vis.status === 'limited' && vis.availableUntil && !isScheduled && (
                        <div className="absolute top-3 right-3 z-20">
                            <span className="bg-red-500/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md text-white shadow-sm border border-red-400 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3"/> Hasta el {new Date(vis.availableUntil).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex-1">
                      <h3 className={`font-bold text-lg leading-tight mb-2 transition-colors ${isScheduled ? 'text-gray-500' : 'text-gray-900 group-hover:text-emerald-700'}`}>
                          {product.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.features?.name && <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Nombre</span>}
                        {product.features?.number && <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Dorsal</span>}
                        {product.sizes?.length > 0 && <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{product.sizes.length} Tallas</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                    {(() => {
                        let finalPrice = product.price;
                        let crossedOutPrice = null;
                        let hasDiscount = false;
                        let remainingDiscountUnits = null; 
                        let isPackTag = product.isPack || product.category === 'Packs' || product.category === 'Ofertas';

                        // 🟢 1. LÓGICA DE PACKS NATIVOS (Mayor prioridad)
                        if (product.isPack && product.bundledProducts?.length > 0) {
                            hasDiscount = true;
                            // Calculamos la suma original buscando los productos reales
                            crossedOutPrice = product.bundledProducts.reduce((sum, bId) => {
                                const bp = products.find(p => p.id === bId);
                                return sum + (bp ? bp.price : 0);
                            }, 0);
                            finalPrice = product.price; // El precio de venta que le pusiste
                        } 
                        // 2. LÓGICA DE DESCUENTOS INDIVIDUALES
                        else {
                            const prodDiscount = product.discount || {};
                            let isProdDiscountValid = false;
                            if (prodDiscount.active) {
                                const notExpired = !prodDiscount.expiresAt || new Date() < new Date(prodDiscount.expiresAt);
                                const limitNotReached = !prodDiscount.maxUnits || (prodDiscount.unitsSold || 0) < prodDiscount.maxUnits;
                                if (notExpired && limitNotReached) {
                                    isProdDiscountValid = true;
                                    if (prodDiscount.maxUnits) {
                                        remainingDiscountUnits = prodDiscount.maxUnits - (prodDiscount.unitsSold || 0);
                                    }
                                }
                            }

                            if (isProdDiscountValid) {
                                hasDiscount = true;
                                crossedOutPrice = product.price;
                                finalPrice = product.price * (1 - prodDiscount.percentage / 100);
                            } else if (isCampaignActive && !isPackTag) {
                                // 3. LÓGICA DE CAMPAÑAS GLOBALES
                                if (campaignConfig.promoMode === 'global' && campaignConfig.discount > 0) {
                                    hasDiscount = true;
                                    crossedOutPrice = product.price;
                                    finalPrice = product.price * (1 - campaignConfig.discount / 100);
                                } else if (campaignConfig.promoMode === 'specific' && campaignConfig.discount > 0) {
                                    if (campaignConfig.targetProducts?.includes(product.id)) {
                                        hasDiscount = true;
                                        crossedOutPrice = product.price;
                                        finalPrice = product.price * (1 - campaignConfig.discount / 100);
                                    }
                                }
                            }
                        }

                        // Calcular porcentaje de ahorro si existe un precio tachado mayor al final
                        let savingPercentage = 0;
                        if (hasDiscount && crossedOutPrice > finalPrice) {
                            savingPercentage = Math.round(((crossedOutPrice - finalPrice) / crossedOutPrice) * 100);
                        }

                        return (
                            <div className="flex flex-col justify-center">
                                {hasDiscount && crossedOutPrice > finalPrice && (
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-xs text-gray-400 line-through font-bold">
                                            {crossedOutPrice.toFixed(2)}€
                                        </span>
                                        {isPackTag && savingPercentage > 0 && (
                                            <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black border border-red-200">
                                                -{savingPercentage}% DTO
                                            </span>
                                        )}
                                    </div>
                                )}
                                <span className={`text-2xl font-black ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`}>
                                    {finalPrice.toFixed(2)}<span className="text-sm align-top">€</span>
                                </span>
                                {remainingDiscountUnits !== null && remainingDiscountUnits > 0 && (
                                    <span className="text-[10px] text-red-500 font-bold leading-tight mt-0.5 bg-red-50 px-1 py-0.5 rounded border border-red-100 inline-block w-fit">
                                        ¡Solo {remainingDiscountUnits} uds. con dto!
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                      
                      {isScheduled ? (
                          <div className="bg-orange-50 text-orange-600 text-[10px] font-bold py-2 px-3 rounded-lg border border-orange-100 flex items-center gap-1">
                              <Clock className="w-3 h-3"/> El {new Date(vis.availableFrom).toLocaleDateString()}
                          </div>
                      ) : (
                          <button className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                              <ShoppingBag className="w-5 h-5" />
                          </button>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4"><Search className="w-8 h-8 text-gray-400" /></div>
              <h3 className="text-lg font-bold text-gray-900">No encontramos productos</h3>
              <button onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); }} className="mt-6 text-emerald-600 font-bold text-sm hover:underline">Limpiar filtros</button>
            </div>
          )}
        </>
      ) : (
        <div className="animate-fade-in-up">
          <ProductCustomizer 
              key={selectedProduct.id} // 🟢 AÑADE ESTA LÍNEA AQUÍ
              product={selectedProduct} 
              allProducts={products}
              activeClub={activeClub}
              activeGiftCode={activeGiftCode}
              isCampaignActive={isCampaignActive}
              onBack={() => { setSelectedProduct(null); setActiveGiftCode(null); }}
              onAdd={addToCart} 
              clubs={clubs} 
              modificationFee={modificationFee} 
              storeConfig={storeConfig} 
              setConfirmation={setConfirmation} 
              campaignConfig={campaignConfig}
              showToast={showToast}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE SECUNDARIO: PERSONALIZADOR
// ============================================================================
export function ProductCustomizer({ product, allProducts, activeClub, activeGiftCode, onBack, onAdd, clubs, modificationFee, storeConfig, setConfirmation, campaignConfig, showToast, isCampaignActive }) {
    const isPackCard = product.isPack && product.bundledProducts?.length > 0;
    const bundledProductsData = isPackCard ? product.bundledProducts.map(id => allProducts?.find(p => p.id === id)).filter(Boolean) : [];
  
    const defaults = product.defaults || {};
    const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };
    const features = product.features || {};
    const variants = product.variants || []; 
    const sizeOptions = product.sizes && product.sizes.length > 0 ? product.sizes : null;
  
    const [clubInput] = useState(activeClub ? activeClub.name : '');
    const [categoryInput, setCategoryInput] = useState('');
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
    const [availableCategories, setAvailableCategories] = useState([]);
  
    const [categoryInput2, setCategoryInput2] = useState('');
    const [showCategorySuggestions2, setShowCategorySuggestions2] = useState(false);
    const [categoryInput3, setCategoryInput3] = useState('');
    const [showCategorySuggestions3, setShowCategorySuggestions3] = useState(false);
  
    const [customization, setCustomization] = useState({ 
        clubId: activeClub ? activeClub.id : '',
        category: '', category2: '', category3: '', 
        playerName: '', playerNumber: '', playerName2: '', playerNumber2: '', playerName3: '', playerNumber3: '',
        color: 'white', size: sizeOptions ? sizeOptions[0] : '', selectedPhoto: '',
        includeName: defaults.name ?? false, includeNumber: defaults.number ?? false, includePhoto: defaults.photo ?? false, includeShield: defaults.shield ?? true,
        selectedVariantId: null 
    });
  
    // 🟢 ESTADO PARA LOS PACKS (Datos individuales por ID de producto)
    const [packData, setPackData] = useState({});
    const [activePackCategoryFocus, setActivePackCategoryFocus] = useState(null);

    const [searchPhotoName, setSearchPhotoName] = useState('');
    const [searchPhotoNumber, setSearchPhotoNumber] = useState('');
    const [photoSearchResult, setPhotoSearchResult] = useState(null);
    const [isSearchingPhoto, setIsSearchingPhoto] = useState(false);
    const [photoSearchError, setPhotoSearchError] = useState('');
  
    useEffect(() => { setPhotoSearchResult(null); setPhotoSearchError(''); }, [customization.category, packData, searchPhotoName, searchPhotoNumber]);
  
    // Inicializar datos del pack
    useEffect(() => {
        if (isPackCard) {
            const initial = {};
            bundledProductsData.forEach(bp => {
                const conf = product.bundleConfigs?.[bp.id];
                initial[bp.id] = {
                    category: '',
                    size: bp.sizes && bp.sizes.length > 0 ? bp.sizes[0] : '',
                    playerName: '', playerNumber: '', selectedPhoto: '',
                    playerName2: '', playerNumber2: '', selectedPhoto2: '',
                    playerName3: '', playerNumber3: '', selectedPhoto3: '',
                    includeName: bp.defaults?.name ?? false,
                    includeNumber: bp.defaults?.number ?? false,
                    includePhoto: bp.defaults?.photo ?? false,
                    includeShield: bp.defaults?.shield ?? true,
                    // 🟢 ACTUALIZADO: Si el admin marcó 'none', no selecciona ninguna variante (Estándar)
                    selectedVariantId: (conf && conf !== 'all' && conf !== 'none') ? conf : null
                };
            });
            setPackData(initial);
        }
    }, [product]);
  
    const updatePackItem = (id, field, value) => {
        setPackData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };
  
    const isTeamPhoto = !isPackCard && product.name.toLowerCase().includes('foto') && variants.find(v => v.id === customization.selectedVariantId)?.name.toLowerCase().includes('equipo');
  
    const handleSearchPhoto = async () => {
        let categoriesToSearch = [];
        if (isPackCard) {
            categoriesToSearch = [...new Set(Object.values(packData).map(p => p.category).filter(Boolean))];
        } else {
            categoriesToSearch = [...new Set([customization.category, customization.category2, customization.category3].filter(Boolean))];
        }
        
        if (categoriesToSearch.length === 0) { 
            setPhotoSearchError("Debes seleccionar al menos una categoría en los datos de arriba."); return; 
        }
        if (!isTeamPhoto && !searchPhotoName && !searchPhotoNumber) { 
            setPhotoSearchError("Escribe el nombre o dorsal del jugador para buscar su foto."); return; 
        }
  
        setIsSearchingPhoto(true); setPhotoSearchError(''); setPhotoSearchResult(null);
  
        try {
            const normSearchName = normalizeText(searchPhotoName || '');
            const normSearchDorsal = normalizeText(searchPhotoNumber || '');
            let foundPhotoUrl = null; let foundFileName = null;
  
            for (const cat of categoriesToSearch) {
                const folderRef = ref(storage, `${activeClub.name}/${cat}`);
                try {
                    const res = await listAll(folderRef);
                    for (const item of res.items) {
                        const normFileName = normalizeText(item.name);
                        if (isTeamPhoto) { foundPhotoUrl = await getDownloadURL(item); foundFileName = item.name; break; }
                        let nameMatch = true; let dorsalMatch = true;
                        if (normSearchName) {
                            const cleanName = normFileName.replace(/_/g, ' ');
                            nameMatch = cleanName.includes(normSearchName) || normFileName.includes(normSearchName);
                        }
                        if (normSearchDorsal) {
                            const dorsalRegex = new RegExp(`[a-z0-9]_${normSearchDorsal}\\.|_${normSearchDorsal}$|_${normSearchDorsal}_`);
                            dorsalMatch = dorsalRegex.test(normFileName) || normFileName.includes(`_${normSearchDorsal}`);
                        }
                        if (nameMatch && dorsalMatch) { foundPhotoUrl = await getDownloadURL(item); foundFileName = item.name; break; }
                    }
                } catch(e) { }
                if (foundPhotoUrl) break;
            }
  
            if (foundPhotoUrl) setPhotoSearchResult({ url: foundPhotoUrl, name: foundFileName });
            else setPhotoSearchError(`No se encontró ninguna foto con esos datos en las categorías seleccionadas.`);
        } catch (err) { setPhotoSearchError("Error al conectar con la base de datos de fotos."); }
        setIsSearchingPhoto(false);
    };
  
    const isGift = !!activeGiftCode;
    const [quantity, setQuantity] = useState(1); 
    const isPhotoProduct = product.name.toLowerCase().includes('foto');
    const isCalendarProduct = product.name.toLowerCase().includes('calendario');
    const activeVariant = variants.find(v => v.id === customization.selectedVariantId);
    const isDouble = activeVariant && activeVariant.name.toLowerCase().includes('doble');
    const isTriple = activeVariant && activeVariant.name.toLowerCase().includes('triple');
  
    const categorySuggestions2 = useMemo(() => { if (categoryInput2.length < 2) return []; return availableCategories.filter(c => c.toLowerCase().includes(categoryInput2.toLowerCase())); }, [categoryInput2, availableCategories]);
    const categorySuggestions3 = useMemo(() => { if (categoryInput3.length < 2) return []; return availableCategories.filter(c => c.toLowerCase().includes(categoryInput3.toLowerCase())); }, [categoryInput3, availableCategories]);
  
    useEffect(() => {
          const fetchCategories = async () => {
              if (customization.clubId) {
                  try {
                      const club = clubs.find(c => c.id === customization.clubId);
                      if (club) {
                          const clubRef = ref(storage, club.name);
                          const res = await listAll(clubRef);
                          setAvailableCategories(res.prefixes.map(p => p.name));
                      }
                  } catch (error) { setAvailableCategories([]); }
              } else { setAvailableCategories([]); }
          };
          fetchCategories();
      }, [customization.clubId, clubs]);
  
    const basePrice = useMemo(() => {
        let price = product.price;
        if (activeGiftCode && activeGiftCode.applyTo === 'specific') {
            if (activeGiftCode.codeType === 'product') return 0;
            if (activeGiftCode.codeType === 'percent') price = price * (1 - (activeGiftCode.discountValue / 100));
            if (activeGiftCode.codeType === 'fixed') price = Math.max(0, price - activeGiftCode.discountValue);
            return price; 
        }
        if (isPackCard) return price;
  
        const isPack = product.category === 'Packs' || product.category === 'Ofertas';
        const prodDiscount = product.discount || {};
        if (prodDiscount.active) {
            const notExpired = !prodDiscount.expiresAt || new Date() < new Date(prodDiscount.expiresAt);
            const limitNotReached = !prodDiscount.maxUnits || (prodDiscount.unitsSold || 0) < prodDiscount.maxUnits;
            if (notExpired && limitNotReached) return price * (1 - prodDiscount.percentage / 100);
        }
        if (isCampaignActive && !isPack) {
            if (campaignConfig.promoMode === 'global' && campaignConfig.discount > 0) return price * (1 - campaignConfig.discount / 100);
            if (campaignConfig.promoMode === 'specific' && campaignConfig.discount > 0) {
                if (campaignConfig.targetProducts?.includes(product.id)) return price * (1 - campaignConfig.discount / 100);
            }
        }
        return price;
    }, [product, campaignConfig, activeGiftCode, isPackCard]);
  
    const categorySuggestions = useMemo(() => { if (categoryInput.length < 2) return []; return availableCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase())); }, [categoryInput, availableCategories]);
  
    const modificationCount = useMemo(() => {
        if (isGift || isPackCard) return 0; 
        let count = 0;
        const playersCount = isTriple ? 3 : isDouble ? 2 : 1;
        const checkExtra = (key) => {
            if (!features[key]) return false;
            if (!modifiable[key]) return false;
            const isSelected = customization[`include${key.charAt(0).toUpperCase() + key.slice(1)}`];
            const isDefault = !!defaults[key];
            return isSelected !== isDefault;
        };
        if (checkExtra('name')) count += playersCount;
        if (checkExtra('number')) count += playersCount;
        if (checkExtra('shield')) count += playersCount; 
        return count;
    }, [customization, defaults, features, modifiable, isDouble, isTriple, isGift, isPackCard]);
  
     const variantPrice = activeVariant ? (activeVariant.priceMod || 0) : 0;
     const isTotalGift = activeGiftCode && activeGiftCode.codeType === 'product';
     const areModsFree = isCampaignActive && campaignConfig?.promoMode === 'free_mods';
     const currentModFee = areModsFree ? 0 : (modificationFee || 0);
     
     const unitPrice = isTotalGift ? 0 : (basePrice + variantPrice + (modificationCount * currentModFee));
     const totalPrice = unitPrice * quantity;
    
      const handleSubmit = (e) => { 
        e.preventDefault(); 
        if (!storeConfig.isOpen) return; 
        if (!customization.clubId) { showToast("Debes seleccionar un club.", "error"); return; }
        
        let confirmMsg = "";
        let finalItem = { ...product };
  
        if (isPackCard) {
            // Validación Modo Pack
            let hasError = false;
            for (const bp of bundledProductsData) {
                const pData = packData[bp.id] || {};
                if (bp.features?.size && !pData.size) { showToast(`Falta la talla en: ${bp.name}`, "error"); hasError = true; break; }
                if (bp.features?.name && pData.includeName && !pData.playerName) { showToast(`Falta el nombre en: ${bp.name}`, "error"); hasError = true; break; }
                if (bp.features?.number && pData.includeNumber && !pData.playerNumber) { showToast(`Falta el dorsal en: ${bp.name}`, "error"); hasError = true; break; }
                if (bp.features?.photo && pData.includePhoto && !pData.selectedPhoto) { showToast(`Falta foto asignada a: ${bp.name}`, "error"); hasError = true; break; }
            }
            if(hasError) return;
  
            const packItemsArr = bundledProductsData.map(bp => {
                const pData = packData[bp.id] || {};
                const activeVar = bp.variants?.find(v => v.id === pData.selectedVariantId);
                return {
                    productId: bp.id,
                    productName: bp.name + (activeVar ? ` (${activeVar.name})` : ''),
                    size: bp.features?.size ? pData.size : null,
                    playerName: bp.features?.name && pData.includeName ? pData.playerName : null,
                    playerNumber: bp.features?.number && pData.includeNumber ? pData.playerNumber : null,
                    photoFileName: bp.features?.photo && pData.includePhoto ? pData.selectedPhoto : null,
                    category: pData.category || '',
                    details: {
                         player2: (activeVar && (activeVar.name.toLowerCase().includes('doble') || activeVar.name.toLowerCase().includes('triple'))) ? { name: pData.playerName2, number: pData.playerNumber2, photo: pData.selectedPhoto2 } : null,
                         player3: (activeVar && activeVar.name.toLowerCase().includes('triple')) ? { name: pData.playerName3, number: pData.playerNumber3, photo: pData.selectedPhoto3 } : null,
                         variant: activeVar ? activeVar.name : 'Standard'
                    }
                };
            });
  
            finalItem = {
                ...product,
                clubName: clubs.find(c => c.id === customization.clubId)?.name || 'Club',
                quantity: isGift ? 1 : quantity,
                price: isGift ? 0 : product.price,
                isGift: isGift,
                packItems: packItemsArr
            };
            confirmMsg = `Pack: ${product.name}\nCantidad: ${isGift ? 1 : quantity}\nClub: ${clubInput}\n(Incluye ${packItemsArr.length} artículos personalizados producto por producto)`;
        } else {
            // Validación Modo Normal
            if (!isTeamPhoto) {
                if (features.name && customization.includeName && !customization.playerName) { showToast("El nombre a imprimir es obligatorio.", "error"); return; }
                if (features.number && customization.includeNumber && !customization.playerNumber) { showToast("El dorsal a imprimir es obligatorio.", "error"); return; }
            }
            if (features.size && !customization.size) { showToast("Debes seleccionar una talla.", "error"); return; }
            if ((isDouble || isTriple) && (!customization.playerName2 || !customization.playerNumber2)) { showToast("Datos del J2 obligatorios.", "error"); return; }
            if (isTriple && (!customization.playerName3 || !customization.playerNumber3)) { showToast("Datos del J3 obligatorios.", "error"); return; }
            if (features.photo && customization.includePhoto) { 
                if (!customization.selectedPhoto) { showToast("Falta foto del Jugador 1.", "error"); return; }
                if ((isDouble || isTriple) && !customization.selectedPhoto2) { showToast("Falta foto del Jugador 2.", "error"); return; }
                if (isTriple && !customization.selectedPhoto3) { showToast("Falta foto del Jugador 3.", "error"); return; }
            }
  
            let extendedName = product.name;
            if (activeVariant) extendedName += ` (${activeVariant.name})`;
            
            finalItem = {
                ...product,
                clubName: clubs.find(c => c.id === customization.clubId)?.name || 'Club', 
                category: customization.category, 
                name: extendedName,
                playerName: isTeamPhoto ? '' : customization.playerName,
                playerNumber: isTeamPhoto ? '' : customization.playerNumber,
                photoFileName: (features.photo && customization.includePhoto) ? customization.selectedPhoto : null,
                photoFileName2: (features.photo && (isDouble || isTriple) && customization.includePhoto) ? customization.selectedPhoto2 : null,
                photoFileName3: (features.photo && isTriple && customization.includePhoto) ? customization.selectedPhoto3 : null,
                quantity: isGift ? 1 : quantity, 
                size: features.size ? customization.size : null,
                price: isGift ? 0 : product.price,
                isGift: isGift,
                details: {
                    player2: (isDouble || isTriple) ? { name: customization.playerName2, number: customization.playerNumber2, category: customization.category2 } : null,
                    player3: (isTriple) ? { name: customization.playerName3, number: customization.playerNumber3, category: customization.category3 } : null,
                    variant: activeVariant ? activeVariant.name : 'Standard'
                }
            };
            confirmMsg = `Producto: ${extendedName}\nCantidad: ${isGift ? 1 : quantity}\nClub: ${clubInput}`;
        }
  
        setConfirmation({
            msg: confirmMsg,
            onConfirm: () => {
                onAdd(finalItem, customization, unitPrice); 
                onBack(); 
            }
        });
    };
  
    const displayImage = (activeVariant && activeVariant.image) ? activeVariant.image : product.image;
  
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-1/2 bg-gray-100 p-8 flex items-center justify-center relative">
            <img src={displayImage} className="max-w-full h-auto rounded-lg shadow-md" />
        </div>
        <div className="md:w-1/2 p-8 overflow-y-auto max-h-[90vh]">
          <button onClick={onBack} className="text-gray-500 mb-4 hover:text-gray-700 flex items-center gap-1">
              <ChevronLeft className="rotate-180 w-4 h-4" /> Volver
          </button>
            {/* Título y Precio con letra más grande */}
          <h2 className="text-3xl font-black mb-1 text-gray-900 leading-tight">
              {product.name}
          </h2>
          
          <div className="flex items-baseline gap-2 mb-6">
              <p className={`font-black text-4xl ${isGift ? 'text-gray-800' : 'text-emerald-600'}`}>
                  {isGift ? 'GRATIS' : `${unitPrice.toFixed(2)}€`}
              </p>
              {!isGift && <span className="text-gray-400 font-bold text-base">/ unidad</span>}
          </div>

            {/* 🟢 ETIQUETAS DE CARACTERÍSTICAS MÁS GRANDES Y VISIBLES */}
          {product.characteristics && product.characteristics.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
                  {product.characteristics.map((char, idx) => (
                      <div key={idx} className="bg-emerald-50/50 text-emerald-800 text-sm font-bold px-4 py-2.5 rounded-xl border border-emerald-100 flex items-center gap-3 shadow-sm">
                          <div className="bg-emerald-500 rounded-full p-1 shadow-sm shadow-emerald-200">
                             <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                          </div>
                          {char}
                      </div>
                  ))}
              </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Club Seleccionado</label>
                <div className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 flex items-center gap-3 opacity-90">
                    {activeClub.logoUrl && <img src={activeClub.logoUrl} className="w-6 h-6 object-contain" />}
                    <span className="font-bold text-gray-700">{activeClub.name}</span>
                </div>
            </div>
  
            {/* 🟢 RENDERIZADO DINÁMICO: PACKS VS NORMAL */}
            {isPackCard ? (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                    <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 text-sm font-medium">
                        Rellena los datos de cada artículo del pack individualmente.
                    </div>
                    {bundledProductsData.map((bp, index) => {
                        const pData = packData[bp.id] || {};
                        const bpFeatures = bp.features || {};
                        const bpModifiable = bp.modifiable || {};
                        const bpDefaults = bp.defaults || {};
                        
                        // 🟢 LÓGICA DE VARIANTES POR PRODUCTO
                        const bpConfig = product.bundleConfigs?.[bp.id] || 'all';
                        const bpVariants = bp.variants || [];
                        const bpActiveVariant = bpVariants.find(v => v.id === pData.selectedVariantId);
                        const bpIsDouble = bpActiveVariant && bpActiveVariant.name.toLowerCase().includes('doble');
                        const bpIsTriple = bpActiveVariant && bpActiveVariant.name.toLowerCase().includes('triple');
                        const bpIsTeamPhoto = bp.name.toLowerCase().includes('foto') && bpActiveVariant?.name.toLowerCase().includes('equipo');
                        
                        return (
                            <div key={bp.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                <h4 className="font-bold text-gray-800 text-sm mb-3 ml-2 border-b pb-2 text-emerald-700">{index + 1}. {bp.name}</h4>
                                <div className="space-y-4 ml-2">
                                    {/* 🟢 SELECTOR DE VARIANTE (Si el admin le dejó elegir) */}
                                    {bpConfig === 'all' && bpVariants.length > 0 && (
                                        <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                                            <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-2">Selecciona Tipo de {bp.name} <span className="text-red-500">*</span></label>
                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" onClick={() => updatePackItem(bp.id, 'selectedVariantId', null)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${!pData.selectedVariantId ? 'bg-emerald-600 text-white shadow-sm border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}>Estándar</button>
                                                {bpVariants.map(v => (
                                                    <button key={v.id} type="button" onClick={() => updatePackItem(bp.id, 'selectedVariantId', v.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${pData.selectedVariantId === v.id ? 'bg-emerald-600 text-white shadow-sm border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}>{v.name}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Etiqueta si está forzado por el admin */}
                                    {bpConfig !== 'all' && (
                                        <div className="mb-2">
                                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1.5 rounded font-black border border-emerald-200 uppercase tracking-wide">
                                                Incluye: {bpConfig === 'none' ? 'Estándar' : bpActiveVariant?.name}
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                                            <Input 
                                                placeholder="Buscar categoría..." 
                                                value={pData.category || ''} 
                                                onChange={e => updatePackItem(bp.id, 'category', e.target.value)}
                                                onFocus={() => setActivePackCategoryFocus(bp.id)}
                                                onBlur={() => setTimeout(() => setActivePackCategoryFocus(null), 200)}
                                            />
                                            {activePackCategoryFocus === bp.id && pData.category?.length >= 2 && availableCategories.filter(c => c.toLowerCase().includes(pData.category.toLowerCase())).length > 0 && (
                                                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-b-lg shadow-xl z-50 max-h-48 overflow-y-auto mt-1">
                                                    {availableCategories.filter(c => c.toLowerCase().includes(pData.category.toLowerCase())).map(cat => (
                                                        <div key={cat} onMouseDown={() => { updatePackItem(bp.id, 'category', cat); setActivePackCategoryFocus(null); }} className="px-4 py-2 hover:bg-emerald-50 cursor-pointer text-sm font-medium border-b border-gray-50 last:border-0">{cat}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {bpFeatures.size && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Talla <span className="text-red-500">*</span></label>
                                                {bp.sizes && bp.sizes.length > 0 ? (
                                                    <select className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={pData.size || ''} onChange={(e) => updatePackItem(bp.id, 'size', e.target.value)}>
                                                        <option value="">-- Selecciona --</option>
                                                        {bp.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                ) : (
                                                    <Input placeholder="Tu talla..." value={pData.size || ''} onChange={e => updatePackItem(bp.id, 'size', e.target.value)}/>
                                                )}
                                            </div>
                                        )}
                                    </div>
  
                                    <div className="flex gap-2 flex-wrap pt-2">
                                        {bpFeatures.name && bpModifiable.name && (
                                            <label className="flex items-center gap-1.5 border px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input type="checkbox" className="accent-emerald-600 w-3 h-3" checked={pData.includeName ?? bpDefaults.name} onChange={e => updatePackItem(bp.id, 'includeName', e.target.checked)}/> <span className="text-xs font-medium">Nombre</span>
                                            </label>
                                        )}
                                        {bpFeatures.number && bpModifiable.number && (
                                            <label className="flex items-center gap-1.5 border px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input type="checkbox" className="accent-emerald-600 w-3 h-3" checked={pData.includeNumber ?? bpDefaults.number} onChange={e => updatePackItem(bp.id, 'includeNumber', e.target.checked)}/> <span className="text-xs font-medium">Dorsal</span>
                                            </label>
                                        )}
                                        {bpFeatures.photo && bpModifiable.photo && (
                                            <label className="flex items-center gap-1.5 border px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input type="checkbox" className="accent-emerald-600 w-3 h-3" checked={pData.includePhoto ?? bpDefaults.photo} onChange={e => updatePackItem(bp.id, 'includePhoto', e.target.checked)}/> <span className="text-xs font-medium">Foto</span>
                                            </label>
                                        )}
                                    </div>
  
                                    {/* 🟢 CAMPOS JUGADOR 1, 2 Y 3 (Dinámicos) */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        {bpFeatures.name && (
                                            <div className={(pData.includeName ?? bpDefaults.name) === false ? 'opacity-30 pointer-events-none' : ''}>
                                                <label className="text-xs font-medium mb-1 block text-emerald-700">Nombre {bpIsDouble||bpIsTriple?'(J1)':''}</label>
                                                <Input value={pData.playerName || ''} onChange={e => updatePackItem(bp.id, 'playerName', e.target.value)}/>
                                            </div>
                                        )}
                                        {bpFeatures.number && (
                                            <div className={(pData.includeNumber ?? bpDefaults.number) === false ? 'opacity-30 pointer-events-none' : ''}>
                                                <label className="text-xs font-medium mb-1 block text-emerald-700">Dorsal {bpIsDouble||bpIsTriple?'(J1)':''}</label>
                                                <Input type="number" value={pData.playerNumber || ''} onChange={e => updatePackItem(bp.id, 'playerNumber', e.target.value)}/>
                                            </div>
                                        )}
                                    </div>

                                    {(bpIsDouble || bpIsTriple) && (
                                        <div className="grid grid-cols-2 gap-3 mt-2 border-t border-emerald-100 pt-2 animate-fade-in">
                                            <div className={(pData.includeName ?? bpDefaults.name) === false ? 'opacity-30 pointer-events-none' : ''}>
                                                <label className="text-xs font-medium mb-1 block text-blue-700">Nombre (J2)</label>
                                                <Input value={pData.playerName2 || ''} onChange={e => updatePackItem(bp.id, 'playerName2', e.target.value)}/>
                                            </div>
                                            <div className={(pData.includeNumber ?? bpDefaults.number) === false ? 'opacity-30 pointer-events-none' : ''}>
                                                <label className="text-xs font-medium mb-1 block text-blue-700">Dorsal (J2)</label>
                                                <Input type="number" value={pData.playerNumber2 || ''} onChange={e => updatePackItem(bp.id, 'playerNumber2', e.target.value)}/>
                                            </div>
                                        </div>
                                    )}
                                    {bpIsTriple && (
                                        <div className="grid grid-cols-2 gap-3 mt-2 border-t border-emerald-100 pt-2 animate-fade-in">
                                            <div className={(pData.includeName ?? bpDefaults.name) === false ? 'opacity-30 pointer-events-none' : ''}>
                                                <label className="text-xs font-medium mb-1 block text-purple-700">Nombre (J3)</label>
                                                <Input value={pData.playerName3 || ''} onChange={e => updatePackItem(bp.id, 'playerName3', e.target.value)}/>
                                            </div>
                                            <div className={(pData.includeNumber ?? bpDefaults.number) === false ? 'opacity-30 pointer-events-none' : ''}>
                                                <label className="text-xs font-medium mb-1 block text-purple-700">Dorsal (J3)</label>
                                                <Input type="number" value={pData.playerNumber3 || ''} onChange={e => updatePackItem(bp.id, 'playerNumber3', e.target.value)}/>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* 🟢 MODO NORMAL (Mantenemos tu código original para no packs) */
                <>
                    {customization.clubId && (
                        <div className="relative animate-fade-in border-t border-gray-100 pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                            <Input placeholder="Buscar categoría..." value={categoryInput} onChange={e => { setCategoryInput(e.target.value); setCustomization({...customization, category: e.target.value}); setShowCategorySuggestions(true); }} onFocus={() => setShowCategorySuggestions(true)} onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)} />
                            {showCategorySuggestions && categorySuggestions.length > 0 && (
                                <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                    {categorySuggestions.map(cat => (
                                        <div key={cat} onMouseDown={() => { setCustomization({ ...customization, category: cat }); setCategoryInput(cat); setShowCategorySuggestions(false); }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer">{cat}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {features.size && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Talla <span className="text-red-500">*</span></label>
                            {sizeOptions ? (
                                <select className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none" value={customization.size} onChange={(e) => setCustomization({...customization, size: e.target.value})}>
                                    <option value="">-- Selecciona Talla --</option>
                                    {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            ) : (
                                <Input placeholder="Tu talla..." value={customization.size} onChange={e => setCustomization({...customization, size: e.target.value})}/>
                            )}
                        </div>
                    )}
                    {!isTeamPhoto && (
                        <div className="space-y-4 border-t pt-4 border-gray-100">
                            <h4 className="font-bold text-gray-600 text-xs uppercase">Datos Personalización</h4>
                            <div className="flex gap-4 flex-wrap">
                                {features.name && modifiable.name && ( <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50"><input type="checkbox" className="accent-emerald-600" checked={customization.includeName} onChange={e => setCustomization({...customization, includeName: e.target.checked})}/><span className="text-sm">Incluir Nombre</span></label> )}
                                {features.number && modifiable.number && ( <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50"><input type="checkbox" className="accent-emerald-600" checked={customization.includeNumber} onChange={e => setCustomization({...customization, includeNumber: e.target.checked})}/><span className="text-sm">Incluir Dorsal</span></label> )}
                                {features.photo && modifiable.photo && ( <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50"><input type="checkbox" className="accent-emerald-600" checked={customization.includePhoto} onChange={e => setCustomization({...customization, includePhoto: e.target.checked})}/><span className="text-sm">Incluir Foto</span></label> )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {features.name && ( <div className={!customization.includeName ? 'opacity-30 pointer-events-none' : ''}><label className="text-sm font-medium mb-1 block">Nombre</label><Input value={customization.playerName} onChange={e => setCustomization({...customization, playerName: e.target.value})}/></div> )}
                                {features.number && ( <div className={!customization.includeNumber ? 'opacity-30 pointer-events-none' : ''}><label className="text-sm font-medium mb-1 block">Dorsal</label><Input type="number" value={customization.playerNumber} onChange={e => setCustomization({...customization, playerNumber: e.target.value})}/></div> )}
                            </div>
                        </div>
                    )}
                </>
            )}
  
            {/* SECCIÓN INDEPENDIENTE: BÚSQUEDA DE FOTOGRAFÍA (Hereda la lógica de ambos) */}
            {((isPackCard && bundledProductsData.some(bp => bp.features?.photo && (packData[bp.id]?.includePhoto ?? bp.defaults?.photo))) || (!isPackCard && features.photo && customization.includePhoto)) && (
                <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 mt-6 relative overflow-hidden shadow-inner">
                    <h4 className="font-bold text-emerald-800 text-sm uppercase mb-2">Buscador de Fotografía <span className="text-red-500">*</span></h4>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">Independientemente de si has pedido imprimir tu nombre o no, necesitamos que busques tu foto usando tu nombre o dorsal:</p>
                    
                    {!isTeamPhoto && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                            <div><label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Nombre</label><Input placeholder="Ej: Marc" value={searchPhotoName} onChange={e => setSearchPhotoName(e.target.value)}/></div>
                            <div><label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Dorsal</label><Input type="number" placeholder="Ej: 10" value={searchPhotoNumber} onChange={e => setSearchPhotoNumber(e.target.value)}/></div>
                        </div>
                    )}
                    
                    <Button type="button" onClick={handleSearchPhoto} disabled={isSearchingPhoto} className="w-full flex items-center justify-center gap-2 mb-3 bg-emerald-600 py-3">
                        {isSearchingPhoto ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5"/>} {isSearchingPhoto ? 'Buscando foto...' : 'Buscar y Confirmar Fotografía'}
                    </Button>
  
                    {photoSearchError && <div className="text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2 mt-2 font-medium shadow-sm"><AlertTriangle className="w-5 h-5 shrink-0"/> {photoSearchError}</div>}
  
                    {photoSearchResult && (
                        <div className="mt-5 animate-fade-in-up">
                            <div className="pointer-events-none rounded-xl overflow-hidden border-[3px] border-emerald-300 shadow-xl bg-white p-1 mb-3">
                                <ProtectedWatermarkImage imageUrl={photoSearchResult.url} fileName={photoSearchResult.name} logoUrl={LOGO_URL} />
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <p className="text-xs font-bold text-emerald-800 text-center uppercase tracking-wide">¿A dónde asignamos esta foto?</p>
                                
                                {isPackCard ? (
                                    bundledProductsData.filter(bp => bp.features?.photo && (packData[bp.id]?.includePhoto ?? bp.defaults?.photo)).map(bp => {
                                        const pData = packData[bp.id] || {};
                                        const bpActiveVariant = bp.variants?.find(v => v.id === pData.selectedVariantId);
                                        const bpIsDouble = bpActiveVariant && bpActiveVariant.name.toLowerCase().includes('doble');
                                        const bpIsTriple = bpActiveVariant && bpActiveVariant.name.toLowerCase().includes('triple');

                                        return (
                                            <div key={bp.id} className="mb-3 bg-white p-2 rounded border border-emerald-100 shadow-sm">
                                                <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1.5">{bp.name}</p>
                                                <div className="flex flex-col gap-1.5">
                                                    <button type="button" onClick={() => { updatePackItem(bp.id, 'selectedPhoto', photoSearchResult.name); showToast(`📸 Foto asignada a ${bp.name} (J1)`); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg w-full shadow-sm text-left pl-3">Asignar a Jugador 1</button>
                                                    {(bpIsDouble || bpIsTriple) && (
                                                        <button type="button" onClick={() => { updatePackItem(bp.id, 'selectedPhoto2', photoSearchResult.name); showToast(`📸 Foto asignada a ${bp.name} (J2)`); }} className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg w-full shadow-sm text-left pl-3">Asignar a Jugador 2</button>
                                                    )}
                                                    {bpIsTriple && (
                                                        <button type="button" onClick={() => { updatePackItem(bp.id, 'selectedPhoto3', photoSearchResult.name); showToast(`📸 Foto asignada a ${bp.name} (J3)`); }} className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg w-full shadow-sm text-left pl-3">Asignar a Jugador 3</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <>
                                        <button type="button" onClick={() => { setCustomization({...customization, selectedPhoto: photoSearchResult.name}); showToast("📸 Foto asignada al Jugador 1"); }} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg w-full">Asignar a Jugador 1</button>
                                        {(isDouble || isTriple) && <button type="button" onClick={() => { setCustomization({...customization, selectedPhoto2: photoSearchResult.name}); showToast("📸 Foto asignada al Jugador 2"); }} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg w-full">Asignar a Jugador 2</button>}
                                        {isTriple && <button type="button" onClick={() => { setCustomization({...customization, selectedPhoto3: photoSearchResult.name}); showToast("📸 Foto asignada al Jugador 3"); }} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg w-full">Asignar a Jugador 3</button>}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    
                  <div className="mt-5 bg-white p-3 rounded-lg border border-emerald-200">
                      <p className="text-sm font-bold text-emerald-800 mb-2 border-b border-emerald-50 pb-1">📸 Fotos asignadas en este producto:</p>
                      <div className="space-y-1">
                            {isPackCard ? (
                              bundledProductsData.filter(bp => bp.features?.photo && (packData[bp.id]?.includePhoto ?? bp.defaults?.photo)).map(bp => {
                                  const pData = packData[bp.id] || {};
                                  const bpActiveVariant = bp.variants?.find(v => v.id === pData.selectedVariantId);
                                  const bpIsDouble = bpActiveVariant && bpActiveVariant.name.toLowerCase().includes('doble');
                                  const bpIsTriple = bpActiveVariant && bpActiveVariant.name.toLowerCase().includes('triple');

                                  return (
                                      <div key={bp.id} className="text-xs border-b border-gray-50 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
                                          <strong className="block text-gray-800 mb-0.5">{bp.name}:</strong>
                                          <div className="ml-2 space-y-0.5">
                                              <p>• J1: {pData.selectedPhoto ? <span className="text-emerald-600 font-bold">{pData.selectedPhoto}</span> : <span className="text-red-500 font-medium">Pendiente</span>}</p>
                                              {(bpIsDouble || bpIsTriple) && <p>• J2: {pData.selectedPhoto2 ? <span className="text-blue-600 font-bold">{pData.selectedPhoto2}</span> : <span className="text-red-500 font-medium">Pendiente</span>}</p>}
                                              {bpIsTriple && <p>• J3: {pData.selectedPhoto3 ? <span className="text-purple-600 font-bold">{pData.selectedPhoto3}</span> : <span className="text-red-500 font-medium">Pendiente</span>}</p>}
                                          </div>
                                      </div>
                                  )
                              })
                          ) : (
                              <>
                                  <p className="text-xs"><strong>Jugador 1:</strong> {customization.selectedPhoto ? <span className="text-emerald-600 font-bold">{customization.selectedPhoto}</span> : <span className="text-red-500 font-medium">Pendiente</span>}</p>
                                  {(isDouble || isTriple) && <p className="text-xs"><strong>Jugador 2:</strong> {customization.selectedPhoto2 ? <span className="text-blue-600 font-bold">{customization.selectedPhoto2}</span> : <span className="text-red-500 font-medium">Pendiente</span>}</p>}
                              </>
                          )}
                      </div>
                  </div>
                </div>
            )}
            
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border mt-6">
                <label className="font-bold text-gray-700 text-sm">CANTIDAD:</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className={`w-10 h-10 rounded-full border font-bold bg-white`}>-</button>
                    <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                      <button type="button" onClick={() => { setQuantity(quantity + 1); }} className={`w-10 h-10 rounded-full border font-bold bg-white`}>+</button>
                </div>
            </div>
  
            <div className="pt-2 border-t">
                <Button type="submit" disabled={!storeConfig.isOpen} className={`w-full py-4 text-lg ${isGift ? 'bg-gray-800 hover:bg-gray-900' : ''}`}>
                    {storeConfig.isOpen ? `Añadir al Carrito (${isGift ? 'GRATIS' : totalPrice.toFixed(2)+'€'})` : 'TIENDA CERRADA'}
                </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }