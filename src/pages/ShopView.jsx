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
                        const isPack = product.category === 'Packs' || product.category === 'Ofertas';
                        let finalPrice = product.price;
                        let hasDiscount = false;
                        let remainingDiscountUnits = null; 

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
                            finalPrice = product.price * (1 - prodDiscount.percentage / 100);
                        } else if (campaignConfig?.active && campaignConfig?.discount > 0 && !isPack) {
                            hasDiscount = true;
                            finalPrice = product.price * (1 - campaignConfig.discount / 100);
                        }

                        return (
                            <div className="flex flex-col justify-center">
                                {hasDiscount && (
                                    <span className="text-xs text-red-400 line-through font-bold">
                                        {product.price.toFixed(2)}€
                                    </span>
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
              product={selectedProduct} 
              activeClub={activeClub}
              activeGiftCode={activeGiftCode}
              onBack={() => { setSelectedProduct(null); setActiveGiftCode(null); }}
              onAdd={addToCart} 
              clubs={clubs} 
              modificationFee={modificationFee} 
              storeConfig={storeConfig} 
              setConfirmation={setConfirmation} 
              campaignConfig={campaignConfig}
              showToast={showToast}  // <--- AÑADE ESTA LÍNEA
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE SECUNDARIO: PERSONALIZADOR
// ============================================================================
export function ProductCustomizer({ product, activeClub, activeGiftCode, onBack, onAdd, clubs, modificationFee, storeConfig, setConfirmation, campaignConfig, showToast }) {
  const defaults = product.defaults || {};
  const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };
  const features = product.features || {};
  const variants = product.variants || []; 
  const sizeOptions = product.sizes && product.sizes.length > 0 ? product.sizes : null;

  const [clubInput, setClubInput] = useState(activeClub ? activeClub.name : '');
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);

  const [categoryInput2, setCategoryInput2] = useState('');
  const [showCategorySuggestions2, setShowCategorySuggestions2] = useState(false);
  const [categoryInput3, setCategoryInput3] = useState('');
  const [showCategorySuggestions3, setShowCategorySuggestions3] = useState(false);

  const [customization, setCustomization] = useState({ 
      clubId: activeClub ? activeClub.id : '',
      category: '', 
      category2: '', 
      category3: '', 
      playerName: '', 
      playerNumber: '', 
      playerName2: '', 
      playerNumber2: '', 
      playerName3: '', 
      playerNumber3: '',
      color: 'white',
      size: sizeOptions ? sizeOptions[0] : '', 
      selectedPhoto: '',
      includeName: defaults.name ?? false, 
      includeNumber: defaults.number ?? false, 
      includePhoto: defaults.photo ?? false, 
      includeShield: defaults.shield ?? true,
      selectedVariantId: null 
  });

// --- ESTADOS INDEPENDIENTES PARA LA BÚSQUEDA DE FOTO ---
  const [searchPhotoName, setSearchPhotoName] = useState('');
  const [searchPhotoNumber, setSearchPhotoNumber] = useState('');
  const [photoSearchResult, setPhotoSearchResult] = useState(null);
  const [isSearchingPhoto, setIsSearchingPhoto] = useState(false);
  const [photoSearchError, setPhotoSearchError] = useState('');

  // Si cambia la categoría o los campos de búsqueda, borramos la foto encontrada para obligar a buscar de nuevo
  useEffect(() => {
      setPhotoSearchResult(null);
      setCustomization(prev => ({ ...prev, selectedPhoto: '' }));
      setPhotoSearchError('');
  }, [customization.category, searchPhotoName, searchPhotoNumber]);

  // Función de búsqueda (Usa las variables independientes)
  const handleSearchPhoto = async () => {
      if (!customization.category) { setPhotoSearchError("Debes seleccionar una categoría primero."); return; }
      if (!isTeamPhoto && !searchPhotoName && !searchPhotoNumber) { 
          setPhotoSearchError("Escribe el nombre o dorsal del jugador para buscar su foto."); 
          return; 
      }

      setIsSearchingPhoto(true);
      setPhotoSearchError('');
      setPhotoSearchResult(null);

      try {
          const normSearchName = normalizeText(searchPhotoName || '');
          const normSearchDorsal = normalizeText(searchPhotoNumber || '');
          const folderRef = ref(storage, `${activeClub.name}/${customization.category}`);
          const res = await listAll(folderRef);

          let foundPhotoUrl = null;
          let foundFileName = null;

          for (const item of res.items) {
              const normFileName = normalizeText(item.name);
              
              if (isTeamPhoto) {
                  foundPhotoUrl = await getDownloadURL(item);
                  foundFileName = item.name;
                  break;
              }

              let nameMatch = true;
              let dorsalMatch = true;

              if (normSearchName) {
                  const cleanName = normFileName.replace(/_/g, ' ');
                  nameMatch = cleanName.includes(normSearchName) || normFileName.includes(normSearchName);
              }
              if (normSearchDorsal) {
                  const dorsalRegex = new RegExp(`[a-z0-9]_${normSearchDorsal}\\.|_${normSearchDorsal}$|_${normSearchDorsal}_`);
                  dorsalMatch = dorsalRegex.test(normFileName) || normFileName.includes(`_${normSearchDorsal}`);
              }

              if (nameMatch && dorsalMatch) {
                  foundPhotoUrl = await getDownloadURL(item);
                  foundFileName = item.name;
                  break;
              }
          }

          if (foundPhotoUrl) {
              setPhotoSearchResult({ url: foundPhotoUrl, name: foundFileName });
              setCustomization(prev => ({ ...prev, selectedPhoto: foundFileName }));
          } else {
              setPhotoSearchError(`No se encontró ninguna foto en "${customization.category}" con esos datos.`);
              setCustomization(prev => ({ ...prev, selectedPhoto: '' }));
          }
      } catch (err) {
          console.error("Error buscando foto:", err);
          setPhotoSearchError("Error al conectar con la base de datos de fotos.");
      }
      setIsSearchingPhoto(false);
  };

  const isGift = !!activeGiftCode;
  const [quantity, setQuantity] = useState(1); 

  const isPhotoProduct = product.name.toLowerCase().includes('foto');
  const isCalendarProduct = product.name.toLowerCase().includes('calendario');
  const activeVariant = variants.find(v => v.id === customization.selectedVariantId);
  const isDouble = activeVariant && activeVariant.name.toLowerCase().includes('doble');
  const isTriple = activeVariant && activeVariant.name.toLowerCase().includes('triple');
  const isTeamPhoto = isPhotoProduct && activeVariant && activeVariant.name.toLowerCase().includes('equipo');

  const categorySuggestions2 = useMemo(() => {
      if (categoryInput2.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput2.toLowerCase()));
  }, [categoryInput2, availableCategories]);

  const categorySuggestions3 = useMemo(() => {
      if (categoryInput3.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput3.toLowerCase()));
  }, [categoryInput3, availableCategories]);

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
      
      // 1. Si hay un código de descuento introducido para este producto
      if (activeGiftCode && activeGiftCode.applyTo === 'specific') {
          if (activeGiftCode.codeType === 'product') return 0; // Regalo total
          if (activeGiftCode.codeType === 'percent') price = price * (1 - (activeGiftCode.discountValue / 100));
          if (activeGiftCode.codeType === 'fixed') price = Math.max(0, price - activeGiftCode.discountValue);
          return price; // Si hay código manual, tiene prioridad y salimos
      }

      // 2. Si no hay código, aplicamos los descuentos normales o campañas
      const isPack = product.category === 'Packs' || product.category === 'Ofertas';
      const prodDiscount = product.discount || {};
      if (prodDiscount.active) {
          const notExpired = !prodDiscount.expiresAt || new Date() < new Date(prodDiscount.expiresAt);
          const limitNotReached = !prodDiscount.maxUnits || (prodDiscount.unitsSold || 0) < prodDiscount.maxUnits;
          if (notExpired && limitNotReached) {
              return price * (1 - prodDiscount.percentage / 100);
          }
      }
      if (campaignConfig?.active && campaignConfig?.discount > 0 && !isPack) {
          return price * (1 - campaignConfig.discount / 100);
      }
      return price;
  }, [product, campaignConfig, activeGiftCode]);

  const categorySuggestions = useMemo(() => {
      if (categoryInput.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()));
  }, [categoryInput, availableCategories]);

  const modificationCount = useMemo(() => {
      if (isGift) return 0; 
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
  }, [customization, defaults, features, modifiable, isDouble, isTriple, isGift]);

   const variantPrice = activeVariant ? (activeVariant.priceMod || 0) : 0;
   // Si el tipo es 'product' es gratis total. Si es descuento, sí se pagan los extras de personalización
   const isTotalGift = activeGiftCode && activeGiftCode.codeType === 'product';
   const unitPrice = isTotalGift ? 0 : (basePrice + variantPrice + (modificationCount * (modificationFee || 0)));
   const totalPrice = unitPrice * quantity;
  
    const handleSubmit = (e) => { 
      e.preventDefault(); 
      if (!storeConfig.isOpen) return; 
      if (!customization.clubId) { showToast("Debes seleccionar un club.", "error"); return; }
      
      // Validaciones del texto impreso (independiente de la foto)
      if (!isTeamPhoto) {
          if (features.name && customization.includeName && !customization.playerName) { 
              showToast("El nombre a imprimir es obligatorio. Si no quieres nombre, desmarca la casilla.", "error"); 
              return; 
          }
          if (features.number && customization.includeNumber && !customization.playerNumber) { 
              showToast("El dorsal a imprimir es obligatorio. Si no quieres dorsal, desmarca la casilla.", "error"); 
              return; 
          }
      }
      
      if (features.size && !customization.size) { showToast("Debes seleccionar una talla.", "error"); return; }
      if ((isDouble || isTriple) && (!customization.playerName2 || !customization.playerNumber2)) { showToast("Datos del J2 obligatorios.", "error"); return; }
      if (isTriple && (!customization.playerName3 || !customization.playerNumber3)) { showToast("Datos del J3 obligatorios.", "error"); return; }

      // Validación de la fotografía
      if (customization.includePhoto && !customization.selectedPhoto) { 
          showToast("Debes buscar y confirmar tu fotografía antes de añadir el producto.", "error"); 
          return; 
      }

      let extendedName = product.name;
      if (activeVariant) extendedName += ` (${activeVariant.name})`;
      
      let fullDetails = `Jugador 1: ${customization.playerName || 'Sin nombre'} #${customization.playerNumber || 'Sin dorsal'}`;
      if(isDouble || isTriple) fullDetails += ` | J2: ${customization.playerName2} #${customization.playerNumber2}`;
      if(isTriple) fullDetails += ` | J3: ${customization.playerName3} #${customization.playerNumber3}`;
      if(isTeamPhoto) fullDetails = "Foto de Equipo";
      if(features.size) fullDetails += ` | Talla: ${customization.size}`;

      let confirmMsg = `Producto: ${extendedName}\nCantidad: ${isGift ? 1 : quantity}\nClub: ${clubInput}\n${fullDetails}`;
      if (modificationCount > 0 && !isGift) confirmMsg += `\n\n(Incluye ${modificationCount} modificación/es)`;
      if (isGift) confirmMsg += `\n\n🎁 APLICADO CÓDIGO REGALO (0.00€)`;

      setConfirmation({
          msg: confirmMsg,
            onConfirm: () => {
              const selectedClubObj = clubs.find(c => c.id === customization.clubId);
              const clubNameStr = selectedClubObj ? selectedClubObj.name : 'Club';

              const finalItem = {
                  ...product,
                  clubName: clubNameStr, 
                  category: customization.category, 
                  name: extendedName,
                  playerName: isTeamPhoto ? '' : customization.playerName,
                  playerNumber: isTeamPhoto ? '' : customization.playerNumber,
                  photoFileName: customization.includePhoto ? customization.selectedPhoto : null, // Guarda la foto final
                  quantity: isGift ? 1 : quantity, 
                  size: customization.size,
                  price: isGift ? 0 : product.price,
                  isGift: isGift,
                  giftCode: isGift ? activeGiftCode.code : null,
                  giftCodeId: isGift ? activeGiftCode.docId : null,
                  details: {
                        player2: (isDouble || isTriple) ? { name: customization.playerName2, number: customization.playerNumber2, category: customization.category2 } : null,
                        player3: (isTriple) ? { name: customization.playerName3, number: customization.playerNumber3, category: customization.category3 } : null,
                        variant: activeVariant ? activeVariant.name : 'Standard'
                    }
                };
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
        <h2 className="text-2xl font-bold mb-2">Personalizar {product.name}</h2>
        
        {isGift && (
            <div className="bg-gray-800 text-white px-4 py-3 rounded-xl mb-6 flex items-start gap-3 shadow-md">
                <Gift className="w-6 h-6 shrink-0 mt-0.5"/>
                <div>
                    <h4 className="font-bold text-sm">Canjeando Regalo ({activeGiftCode.code})</h4>
                    <p className="text-xs text-gray-300">Este producto es gratis gracias a tu código. Personalízalo a tu gusto sin coste adicional.</p>
                </div>
            </div>
        )}

        <div className="flex items-end gap-2 mb-6">
            <p className={`font-bold text-3xl ${isGift ? 'text-gray-800' : 'text-emerald-600'}`}>
                {isGift ? 'GRATIS' : `${unitPrice.toFixed(2)}€`}
            </p>
            {!isGift && <span className="text-gray-400 text-sm mb-1">/ unidad</span>}
            {modificationCount > 0 && !isGift && (
                <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded mb-1 font-bold">
                   +{modificationCount} Mod. (+{modificationCount * modificationFee}€)
                </span>
            )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {(variants.length > 0 || isPhotoProduct || isCalendarProduct) && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-bold text-blue-800 mb-2 uppercase">Tipo</label>
                  <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setCustomization({...customization, selectedVariantId: null})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${!customization.selectedVariantId ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                          Estándar
                      </button>
                      {variants.map(v => (
                          <button key={v.id} type="button" onClick={() => setCustomization({...customization, selectedVariantId: v.id})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${customization.selectedVariantId === v.id ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                              {v.name}
                          </button>
                      ))}
                  </div>
              </div>
          )}

          <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Club Seleccionado</label>
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 flex items-center gap-3 opacity-90">
                  {activeClub.logoUrl && <img src={activeClub.logoUrl} className="w-6 h-6 object-contain" />}
                  <span className="font-bold text-gray-700">{activeClub.name}</span>
              </div>
          </div>

          {customization.clubId && (
                <div className="relative animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                    <Input 
                        placeholder="Buscar categoría..." 
                        value={categoryInput} 
                        onChange={e => { setCategoryInput(e.target.value); setCustomization({...customization, category: ''}); setShowCategorySuggestions(true); }} 
                        onFocus={() => setShowCategorySuggestions(true)} 
                        onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)} 
                    />
                    {showCategorySuggestions && categorySuggestions.length > 0 && (
                        <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                            {categorySuggestions.map(cat => (
                                <div key={cat} onMouseDown={() => { setCustomization({ ...customization, category: cat }); setCategoryInput(cat); setShowCategorySuggestions(false); }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer">
                                    {cat}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {features.size && (
                <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Talla <span className="text-red-500">*</span></label>
                    {sizeOptions ? (
                        <select className="w-full px-3 py-2 border rounded-md bg-white" value={customization.size} onChange={(e) => setCustomization({...customization, size: e.target.value})}>
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
                      {features.name && modifiable.name && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includeName} onChange={e => setCustomization({...customization, includeName: e.target.checked})}/>
                              <span className="text-sm">Incluir Nombre</span>
                              {customization.includeName !== !!defaults.name && !isGift && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                      {features.number && modifiable.number && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includeNumber} onChange={e => setCustomization({...customization, includeNumber: e.target.checked})}/>
                              <span className="text-sm">Incluir Dorsal</span>
                              {customization.includeNumber !== !!defaults.number && !isGift && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                      {features.shield && modifiable.shield && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includeShield} onChange={e => setCustomization({...customization, includeShield: e.target.checked})}/>
                              <span className="text-sm">Incluir Escudo</span>
                              {customization.includeShield !== !!defaults.shield && !isGift && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                      {/* CHECKBOX DE FOTO AQUÍ */}
                      {features.photo && modifiable.photo && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includePhoto} onChange={e => setCustomization({...customization, includePhoto: e.target.checked})}/>
                              <span className="text-sm">Incluir Foto</span>
                              {customization.includePhoto !== !!defaults.photo && !isGift && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {features.name && (
                        <div className={!customization.includeName ? 'opacity-30 pointer-events-none' : ''}>
                            <label className="text-sm font-medium mb-1 block">Nombre</label>
                            <Input value={customization.playerName} onChange={e => setCustomization({...customization, playerName: e.target.value})}/>
                        </div>
                    )}
                    {features.number && (
                        <div className={!customization.includeNumber ? 'opacity-30 pointer-events-none' : ''}>
                            <label className="text-sm font-medium mb-1 block">Dorsal</label>
                            <Input type="number" value={customization.playerNumber} onChange={e => setCustomization({...customization, playerNumber: e.target.value})}/>
                        </div>
                    )}
                  </div>
              </div>
          )}

            {(isDouble || isTriple) && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 relative">
                  <h4 className="font-bold text-blue-800 text-xs uppercase mb-3">Datos Jugador 2</h4>
                  <div className="relative mb-3">
                      <label className="block text-[10px] font-bold text-blue-600 mb-1 uppercase">Categoría J2</label>
                      <Input 
                          placeholder="Buscar categoría J2..." 
                          value={categoryInput2} 
                          onChange={e => { setCategoryInput2(e.target.value); setCustomization({...customization, category2: ''}); setShowCategorySuggestions2(true); }} 
                          onFocus={() => setShowCategorySuggestions2(true)} 
                          onBlur={() => setTimeout(() => setShowCategorySuggestions2(false), 200)} 
                      />
                      {showCategorySuggestions2 && categorySuggestions2.length > 0 && (
                          <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                              {categorySuggestions2.map(cat => (
                                  <div key={cat} onMouseDown={() => { setCustomization({ ...customization, category2: cat }); setCategoryInput2(cat); setShowCategorySuggestions2(false); }} className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm">
                                      {cat}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className={!customization.includeName ? 'opacity-40 pointer-events-none grayscale' : ''}>
                          <Input placeholder="Nombre J2" value={customization.playerName2} onChange={e => setCustomization({...customization, playerName2: e.target.value})}/>
                      </div>
                      <div className={!customization.includeNumber ? 'opacity-40 pointer-events-none grayscale' : ''}>
                          <Input placeholder="Dorsal J2" type="number" value={customization.playerNumber2} onChange={e => setCustomization({...customization, playerNumber2: e.target.value})}/>
                      </div>
                  </div>
              </div>
          )}
          
          {isTriple && (
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 relative">
                   <h4 className="font-bold text-purple-800 text-xs uppercase mb-3">Datos Jugador 3</h4>
                  <div className="relative mb-3">
                      <label className="block text-[10px] font-bold text-purple-600 mb-1 uppercase">Categoría J3</label>
                      <Input 
                          placeholder="Buscar categoría J3..." 
                          value={categoryInput3} 
                          onChange={e => { setCategoryInput3(e.target.value); setCustomization({...customization, category3: ''}); setShowCategorySuggestions3(true); }} 
                          onFocus={() => setShowCategorySuggestions3(true)} 
                          onBlur={() => setTimeout(() => setShowCategorySuggestions3(false), 200)} 
                      />
                      {showCategorySuggestions3 && categorySuggestions3.length > 0 && (
                          <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                              {categorySuggestions3.map(cat => (
                                  <div key={cat} onMouseDown={() => { setCustomization({ ...customization, category3: cat }); setCategoryInput3(cat); setShowCategorySuggestions3(false); }} className="px-4 py-3 hover:bg-purple-50 cursor-pointer text-sm">
                                      {cat}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className={!customization.includeName ? 'opacity-40 pointer-events-none grayscale' : ''}>
                          <Input placeholder="Nombre J3" value={customization.playerName3} onChange={e => setCustomization({...customization, playerName3: e.target.value})}/>
                      </div>
                      <div className={!customization.includeNumber ? 'opacity-40 pointer-events-none grayscale' : ''}>
                          <Input placeholder="Dorsal J3" type="number" value={customization.playerNumber3} onChange={e => setCustomization({...customization, playerNumber3: e.target.value})}/>
                      </div>
                  </div>
              </div>
          )}

          {/* SECCIÓN INDEPENDIENTE: BÚSQUEDA DE FOTOGRAFÍA */}
          {customization.includePhoto && (
              <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 mt-6 relative overflow-hidden shadow-inner">
                  <h4 className="font-bold text-emerald-800 text-sm uppercase mb-2">Buscador de Fotografía <span className="text-red-500">*</span></h4>
                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                      {isTeamPhoto 
                          ? 'Al ser foto de equipo, solo pulsa en buscar.' 
                          : 'Independientemente de si has pedido imprimir tu nombre o no, necesitamos que busques tu foto en el servidor usando tu nombre o dorsal:'}
                  </p>
                  
                  {!isTeamPhoto && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                          <div>
                              <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Nombre (Para buscar la foto)</label>
                              <Input 
                                  placeholder="Ej: Marc" 
                                  value={searchPhotoName} 
                                  onChange={e => setSearchPhotoName(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Dorsal (Para buscar la foto)</label>
                              <Input 
                                  type="number"
                                  placeholder="Ej: 10" 
                                  value={searchPhotoNumber} 
                                  onChange={e => setSearchPhotoNumber(e.target.value)}
                              />
                          </div>
                      </div>
                  )}
                  
                  <Button 
                      type="button" 
                      onClick={handleSearchPhoto}
                      disabled={isSearchingPhoto}
                      className="w-full flex items-center justify-center gap-2 mb-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95 py-3"
                  >
                      {isSearchingPhoto ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5"/>}
                      {isSearchingPhoto ? 'Buscando foto...' : 'Buscar y Confirmar Fotografía'}
                  </Button>

                  {photoSearchError && (
                      <div className="text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-200 flex items-center gap-2 mt-2 font-medium shadow-sm">
                          <AlertTriangle className="w-5 h-5 shrink-0"/> {photoSearchError}
                      </div>
                  )}

                  {photoSearchResult && (
                      <div className="mt-5 animate-fade-in-up">
                          <div className="flex items-center gap-2 mb-3 bg-white p-3 rounded-lg border border-emerald-200 shadow-sm">
                              <Check className="w-6 h-6 text-emerald-500 shrink-0"/>
                              <span className="text-sm font-bold text-emerald-800 leading-tight">
                                  ¡Foto vinculada al pedido!
                              </span>
                          </div>
                          <div className="pointer-events-none rounded-xl overflow-hidden border-[3px] border-emerald-300 shadow-xl bg-white p-1">
                              <ProtectedWatermarkImage 
                                  imageUrl={photoSearchResult.url}
                                  fileName={photoSearchResult.name}
                                  logoUrl={LOGO_URL}
                              />
                          </div>
                      </div>
                  )}
              </div>
          )}
          
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border mt-6">
              <label className="font-bold text-gray-700 text-sm">CANTIDAD:</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className={`w-10 h-10 rounded-full border font-bold bg-white`}>-</button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                    <button type="button" onClick={() => {
                      const maxAllowed = (activeGiftCode && activeGiftCode.maxUnits > 0) ? activeGiftCode.maxUnits : 99;
                      if (quantity < maxAllowed) setQuantity(quantity + 1);
                      else showToast(`Este cupón solo te permite comprar un máximo de ${maxAllowed} unidades con descuento.`, "error");
                  }} className={`w-10 h-10 rounded-full border font-bold bg-white`}>+</button>
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