import React, { useState, useMemo, useEffect } from 'react';
// 1. Iconos necesarios
import { Search, ShoppingBag, ChevronLeft, Clock } from 'lucide-react';

// 2. Firebase para buscar las carpetas/categorías en el personalizador
import { ref, listAll } from 'firebase/storage';
import { storage } from '../config/firebase';

// 3. Componentes visuales
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/* * ============================================================================
 * 🛍️ VISTA: TIENDA Y PERSONALIZADOR
 * ============================================================================
 * Muestra el catálogo de productos con filtros.
 * Incluye también el componente ProductCustomizer para elegir talla, nombre,
 * fotos y variaciones antes de añadir al carrito.
 */

export function ShopView({ products, addToCart, clubs, modificationFee, storeConfig, setConfirmation, campaignConfig }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // NUEVO: Estados para el selector de club
  const [activeClub, setActiveClub] = useState(null);
  const [clubSearchQuery, setClubSearchQuery] = useState('');

  // 1. Obtener categorías únicas dinámicamente
  const categories = useMemo(() => {
    const validSections = products
        .map(p => p.shopSection)
        .filter(sec => sec && sec.trim() !== '');
    
    return ['Todos', ...new Set(validSections)].sort();
  }, [products]);

  // 2. Filtrado estricto de productos (Añadimos filtro por activeClub)
  const filteredProducts = useMemo(() => {
    const now = new Date(); 

    return products.filter(p => {
      // REGLA 1: Si no tiene sección, no se muestra
      if (!p.shopSection || p.shopSection.trim() === '') return false;

      // REGLA 2: Visibilidad Avanzada
      const vis = p.visibility || {};
      if (vis.status === 'hidden') return false; 
      if (vis.status === 'limited' && vis.availableUntil) {
          if (now > new Date(vis.availableUntil)) return false; 
      }

      // NUEVA REGLA: Exclusividad de Club
      if (p.exclusiveClubs && p.exclusiveClubs.length > 0) {
          if (!activeClub || !p.exclusiveClubs.includes(activeClub.id)) return false;
      }

      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || p.shopSection === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, activeClub]);

  // NUEVA PANTALLA: Buscador de Club
  if (!activeClub) {
    // Filtramos los clubes según lo que escriba el usuario
    const suggestedClubs = clubSearchQuery.trim().length > 0 
        ? clubs.filter(c => !c.blocked && c.name.toLowerCase().includes(clubSearchQuery.toLowerCase()))
        : [];

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100 relative overflow-hidden">
                {/* Decoración de fondo */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                
                <h2 className="text-3xl font-black text-gray-900 mb-2 relative z-10">¡Bienvenido!</h2>
                <p className="text-gray-500 text-sm mb-8 relative z-10">Busca tu club para acceder al catálogo y ofertas exclusivas de tu equipo.</p>
                
                {/* BUSCADOR */}
                <div className="relative z-10 mb-2">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input 
                        type="text"
                        autoFocus
                        placeholder="Escribe el nombre de tu club..."
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-gray-700 shadow-inner"
                        value={clubSearchQuery}
                        onChange={(e) => setClubSearchQuery(e.target.value)}
                    />
                </div>

                {/* LISTA DE SUGERENCIAS */}
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
                        // Mensaje / Ayuda visual cuando no han escrito nada aún
                        <p className="text-xs text-gray-400 mt-4 italic text-center">Empieza a escribir para ver las sugerencias.</p>
                    )}
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-screen pb-12">
      {!selectedProduct ? (
        <>
        {/* CABECERA Y FILTROS */}
          <div className="mb-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {/* NUEVA ETIQUETA DE CLUB SELECCIONADO */}
                <div className="flex items-center gap-3 mb-3">
                    {activeClub.logoUrl && <img src={activeClub.logoUrl} className="w-8 h-8 object-contain drop-shadow-sm" alt="Logo"/>}
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wide border border-emerald-200">
                        Tienda Oficial: {activeClub.name}
                    </span>
                    <button onClick={() => { setActiveClub(null); setSelectedProduct(null); }} className="text-xs text-gray-400 hover:text-red-500 underline transition-colors">
                        Cambiar club
                    </button>
                </div>
                
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                  Catálogo Oficial
                </h2>
                <p className="text-gray-500 mt-1">Personaliza tus productos para hacerlos aún más únicos.</p>
              </div>
              
              {/* Buscador */}
              <div className="relative w-full md:w-72 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm group-hover:shadow-md"
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filtros de Categoría (Píldoras) */}
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

          {/* GRID DE PRODUCTOS */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map(product => {
                // Comprobar si está programado para el futuro
                const vis = product.visibility || {};
                const isScheduled = vis.status === 'scheduled' && vis.availableFrom && new Date() < new Date(vis.availableFrom);

                return (
                <div 
                  key={product.id} 
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 flex flex-col h-full ${isScheduled ? 'border-gray-100 opacity-90' : 'hover:shadow-xl hover:border-emerald-100 cursor-pointer hover:-translate-y-1 group'}`}
                  onClick={() => {
                      if (!isScheduled) setSelectedProduct(product);
                  }}
                >
                  {/* Imagen */}
                  <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      loading="lazy"
                      className={`absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-700 ease-out z-10 ${!isScheduled && 'group-hover:scale-110'}`} 
                    />
                    
                    {/* Etiqueta Próximamente (Si está programado) */}
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

                    {/* NUEVO: Etiqueta de Tiempo Limitado */}
                    {vis.status === 'limited' && vis.availableUntil && !isScheduled && (
                        <div className="absolute top-3 right-3 z-20">
                            <span className="bg-red-500/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md text-white shadow-sm border border-red-400 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3"/> Hasta el {new Date(vis.availableUntil).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                  </div>

                  {/* Contenido */}
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

                    {/* Footer y Precios Combinados */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                    {(() => {
                        const isPack = product.category === 'Packs' || product.category === 'Ofertas';
                        let finalPrice = product.price;
                        let hasDiscount = false;
                        let remainingDiscountUnits = null; // <--- AÑADIDO: Variable para guardar stock restante

                        // 1. Verificamos Descuento Específico del Producto
                        const prodDiscount = product.discount || {};
                        let isProdDiscountValid = false;
                        
                        if (prodDiscount.active) {
                            const notExpired = !prodDiscount.expiresAt || new Date() < new Date(prodDiscount.expiresAt);
                            const limitNotReached = !prodDiscount.maxUnits || (prodDiscount.unitsSold || 0) < prodDiscount.maxUnits;
                            
                            if (notExpired && limitNotReached) {
                                isProdDiscountValid = true;
                                // <--- AÑADIDO: Calculamos las unidades restantes
                                if (prodDiscount.maxUnits) {
                                    remainingDiscountUnits = prodDiscount.maxUnits - (prodDiscount.unitsSold || 0);
                                }
                            }
                        }

                        if (isProdDiscountValid) {
                            hasDiscount = true;
                            finalPrice = product.price * (1 - prodDiscount.percentage / 100);
                        } else if (campaignConfig?.active && campaignConfig?.discount > 0 && !isPack) {
                            // 2. Si no hay del producto, aplicamos el de campaña general
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
                                {/* <--- AÑADIDO: Renderizado de unidades restantes */}
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
            /* ESTADO VACÍO */
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No encontramos productos</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">
                Intenta buscar con otro término o selecciona la categoría "Todos".
              </p>
              <button 
                onClick={() => { setSearchTerm(''); setSelectedCategory('Todos'); }}
                className="mt-6 text-emerald-600 font-bold text-sm hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </>
      ) : (
        // Vista de Personalización
        <div className="animate-fade-in-up">
          <ProductCustomizer 
              product={selectedProduct} 
              activeClub={activeClub} // <--- ¡NUEVA LÍNEA!
              onBack={() => setSelectedProduct(null)} 
              onAdd={addToCart} 
              clubs={clubs} 
              modificationFee={modificationFee} 
              storeConfig={storeConfig} 
              setConfirmation={setConfirmation} 
              campaignConfig={campaignConfig}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE SECUNDARIO: PERSONALIZADOR (Solo se usa aquí dentro)
// ============================================================================
export function ProductCustomizer({ product, activeClub, onBack, onAdd, clubs, modificationFee, storeConfig, setConfirmation, campaignConfig }) {
  const defaults = product.defaults || {};
  const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };
  const features = product.features || {};
  const variants = product.variants || []; 
  const sizeOptions = product.sizes && product.sizes.length > 0 ? product.sizes : null;

  const [clubInput, setClubInput] = useState(activeClub ? activeClub.name : '');
  const [categoryInput, setCategoryInput] = useState('');
  const [showClubSuggestions, setShowClubSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);

  // --- NUEVOS ESTADOS PARA CATEGORÍAS J2 y J3 ---
  const [categoryInput2, setCategoryInput2] = useState('');
  const [showCategorySuggestions2, setShowCategorySuggestions2] = useState(false);
  const [categoryInput3, setCategoryInput3] = useState('');
  const [showCategorySuggestions3, setShowCategorySuggestions3] = useState(false);

  // Inicialización correcta de estados basada en defaults
  const [customization, setCustomization] = useState({ 
      clubId: activeClub ? activeClub.id : '',
      category: '', 
      category2: '', // Nueva categoría J2
      category3: '', // Nueva categoría J3
      playerName: '', 
      playerNumber: '', 
      playerName2: '',
      playerNumber2: '', 
      playerName3: '',
      playerNumber3: '',
      color: 'white',
      size: sizeOptions ? sizeOptions[0] : '', 
      selectedPhoto: '',
      // Si el default es undefined, asumimos false para ser seguros, excepto shield que suele ser true
      includeName: defaults.name ?? false, 
      includeNumber: defaults.number ?? false, 
      includePhoto: defaults.photo ?? false, 
      includeShield: defaults.shield ?? true,
      selectedVariantId: null 
  });

  // --- LOGICA DE SUGERENCIAS INDEPENDIENTES ---
  const categorySuggestions2 = useMemo(() => {
      if (categoryInput2.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput2.toLowerCase()));
  }, [categoryInput2, availableCategories]);

  const categorySuggestions3 = useMemo(() => {
      if (categoryInput3.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput3.toLowerCase()));
  }, [categoryInput3, availableCategories]);

  const [quantity, setQuantity] = useState(1);

  const isPhotoProduct = product.name.toLowerCase().includes('foto');
  const isCalendarProduct = product.name.toLowerCase().includes('calendario');
  const activeVariant = variants.find(v => v.id === customization.selectedVariantId);
  const isDouble = activeVariant && activeVariant.name.toLowerCase().includes('doble');
  const isTriple = activeVariant && activeVariant.name.toLowerCase().includes('triple');
  const isTeamPhoto = isPhotoProduct && activeVariant && activeVariant.name.toLowerCase().includes('equipo');

  // ... (Efectos de categorías y sugerencias se mantienen igual) ...
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
                } catch (error) {
                    setAvailableCategories([]);
                }
            } else { setAvailableCategories([]); }
        };
        fetchCategories();
    }, [customization.clubId, clubs]);

  const clubSuggestions = useMemo(() => {
      if (clubInput.length < 2) return [];
      
      let filtered = clubs.filter(c => c.name.toLowerCase().includes(clubInput.toLowerCase()));
      
      // APLICAR EXCLUSIVIDAD (Pruebas de Mercado)
      if (product.exclusiveClubs && product.exclusiveClubs.length > 0) {
          filtered = filtered.filter(c => product.exclusiveClubs.includes(c.id));
      }
      return filtered;
  }, [clubInput, clubs, product]);

  // --- PRECIO BASE CON DESCUENTOS ---
  const basePrice = useMemo(() => {
      const isPack = product.category === 'Packs' || product.category === 'Ofertas';
      const prodDiscount = product.discount || {};
      
      if (prodDiscount.active) {
          const notExpired = !prodDiscount.expiresAt || new Date() < new Date(prodDiscount.expiresAt);
          const limitNotReached = !prodDiscount.maxUnits || (prodDiscount.unitsSold || 0) < prodDiscount.maxUnits;
          if (notExpired && limitNotReached) {
              return product.price * (1 - prodDiscount.percentage / 100);
          }
      }
      
      if (campaignConfig?.active && campaignConfig?.discount > 0 && !isPack) {
          return product.price * (1 - campaignConfig.discount / 100);
      }
      return product.price;
  }, [product, campaignConfig]);

  const categorySuggestions = useMemo(() => {
      if (categoryInput.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()));
  }, [categoryInput, availableCategories]);

 const handleSelectClub = (club) => {
      setCustomization({ ...customization, clubId: club.id, category: '', category2: '', category3: '', color: club.color || 'white' });
      setClubInput(club.name); 
      setCategoryInput(''); 
      setCategoryInput2('');
      setCategoryInput3('');
      setShowClubSuggestions(false);
  };

// --- LÓGICA DE COBRO ACTUALIZADA (Multiplicador de jugadores) ---
  const modificationCount = useMemo(() => {
      let count = 0;
      // Determinamos cuántos jugadores hay activos según la variante
      const playersCount = isTriple ? 3 : isDouble ? 2 : 1;

      const checkExtra = (key) => {
          if (!features[key]) return false;
          if (!modifiable[key]) return false;
          
          const isSelected = customization[`include${key.charAt(0).toUpperCase() + key.slice(1)}`];
          const isDefault = !!defaults[key];

          // Si hay diferencia con el default, se cobra
          return isSelected !== isDefault;
      };
      
      // Si hay modificación, se suma y MULTIPLICA por los jugadores afectados
      if (checkExtra('name')) count += playersCount;
      if (checkExtra('number')) count += playersCount;
      if (checkExtra('shield')) count += playersCount; 
      
      return count;
  }, [customization, defaults, features, modifiable, isDouble, isTriple]);

   const isModified = modificationCount > 0;
   const variantPrice = activeVariant ? (activeVariant.priceMod || 0) : 0;
   // Usamos el basePrice (con descuentos aplicados) en lugar del product.price original
   const unitPrice = basePrice + variantPrice + (modificationCount * (modificationFee || 0));
   const totalPrice = unitPrice * quantity;
  
  const handleSubmit = (e) => { 
      e.preventDefault(); 
      if (!storeConfig.isOpen) return; 
      if (!customization.clubId) { alert("Debes seleccionar un club."); return; }
      
      if (!isTeamPhoto) {
          if (customization.includeName && !customization.playerName) { alert("El nombre es obligatorio."); return; }
          if (customization.includeNumber && !customization.playerNumber) { alert("El dorsal es obligatorio."); return; }
      }
      if (features.size && !customization.size) { alert("Debes seleccionar una talla."); return; }
      if ((isDouble || isTriple) && (!customization.playerName2 || !customization.playerNumber2)) { alert("Datos del J2 obligatorios."); return; }
      if (isTriple && (!customization.playerName3 || !customization.playerNumber3)) { alert("Datos del J3 obligatorios."); return; }

      let extendedName = product.name;
      if (activeVariant) extendedName += ` (${activeVariant.name})`;
      
      let fullDetails = `Jugador 1: ${customization.playerName} #${customization.playerNumber}`;
      if(isDouble || isTriple) fullDetails += ` | J2: ${customization.playerName2} #${customization.playerNumber2}`;
      if(isTriple) fullDetails += ` | J3: ${customization.playerName3} #${customization.playerNumber3}`;
      if(isTeamPhoto) fullDetails = "Foto de Equipo";
      if(features.size) fullDetails += ` | Talla: ${customization.size}`;

      let confirmMsg = `Producto: ${extendedName}\nCantidad: ${quantity}\nClub: ${clubInput}\n${fullDetails}`;
      if (modificationCount > 0) confirmMsg += `\n\n(Incluye ${modificationCount} modificación/es)`;

      setConfirmation({
          msg: confirmMsg,
            onConfirm: () => {
              // --- CORRECCIÓN INICIO: Obtener nombre del club explícitamente ---
              const selectedClubObj = clubs.find(c => c.id === customization.clubId);
              const clubNameStr = selectedClubObj ? selectedClubObj.name : 'Club';
              // -----------------------------------------------------------------

              const finalItem = {
                  ...product,
                  clubName: clubNameStr, // <--- AÑADIR ESTA LÍNEA para guardar el nombre
                  category: customization.category, // <--- AÑADIR ESTA LÍNEA para la categoría
                  name: extendedName,
                  playerName: isTeamPhoto ? '' : customization.playerName,
                  playerNumber: isTeamPhoto ? '' : customization.playerNumber,
                  quantity: quantity, 
                  size: customization.size,
                    details: {
                            player2: (isDouble || isTriple) ? { 
                                name: customization.playerName2, 
                                number: customization.playerNumber2,
                                category: customization.category2 // Guardar Categoría J2
                            } : null,
                            player3: (isTriple) ? { 
                                name: customization.playerName3, 
                                number: customization.playerNumber3,
                                category: customization.category3 // Guardar Categoría J3
                            } : null,
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
        <button onClick={onBack} className="text-gray-500 mb-4 hover:text-gray-700 flex items-center gap-1"><ChevronLeft className="rotate-180 w-4 h-4" /> Volver</button>
        <h2 className="text-2xl font-bold mb-2">Personalizar {product.name}</h2>
        
        <div className="flex items-end gap-2 mb-6">
            <p className="text-emerald-600 font-bold text-3xl">{unitPrice.toFixed(2)}€</p>
            <span className="text-gray-400 text-sm mb-1">/ unidad</span>
            {modificationCount > 0 && (
                <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded mb-1 font-bold">
                   +{modificationCount} Modificación/es (+{modificationCount * modificationFee}€)
                </span>
            )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {(variants.length > 0 || isPhotoProduct || isCalendarProduct) && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-bold text-blue-800 mb-2 uppercase">Tipo</label>
                  <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setCustomization({...customization, selectedVariantId: null})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${!customization.selectedVariantId ? 'bg-blue-600 text-white' : 'bg-white'}`}>Estándar</button>
                      {variants.map(v => (
                          <button key={v.id} type="button" onClick={() => setCustomization({...customization, selectedVariantId: v.id})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${customization.selectedVariantId === v.id ? 'bg-blue-600 text-white' : 'bg-white'}`}>{v.name}</button>
                      ))}
                  </div>
              </div>
          )}

            {/* NUEVO: CLUB FIJO, NO EDITABLE */}
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
                    <Input placeholder="Buscar categoría..." value={categoryInput} onChange={e => { setCategoryInput(e.target.value); setCustomization({...customization, category: ''}); setShowCategorySuggestions(true); }} onFocus={() => setShowCategorySuggestions(true)} onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)} />
                    {showCategorySuggestions && categorySuggestions.length > 0 && (
                        <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                            {categorySuggestions.map(cat => <div key={cat} onClick={() => { setCustomization({ ...customization, category: cat }); setCategoryInput(cat); setShowCategorySuggestions(false); }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer">{cat}</div>)}
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
                              {customization.includeName !== !!defaults.name && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                      {features.number && modifiable.number && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includeNumber} onChange={e => setCustomization({...customization, includeNumber: e.target.checked})}/>
                              <span className="text-sm">Incluir Dorsal</span>
                              {customization.includeNumber !== !!defaults.number && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                      {features.shield && modifiable.shield && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includeShield} onChange={e => setCustomization({...customization, includeShield: e.target.checked})}/>
                              <span className="text-sm">Incluir Escudo</span>
                              {customization.includeShield !== !!defaults.shield && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
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
                  
                  {/* Selector Categoría J2 */}
                  <div className="relative mb-3">
                      <label className="block text-[10px] font-bold text-blue-600 mb-1 uppercase">Categoría J2</label>
                      <Input 
                          placeholder="Buscar categoría J2..." 
                          value={categoryInput2} 
                          onChange={e => { 
                              setCategoryInput2(e.target.value); 
                              setCustomization({...customization, category2: ''}); 
                              setShowCategorySuggestions2(true); 
                          }} 
                          onFocus={() => setShowCategorySuggestions2(true)} 
                          onBlur={() => setTimeout(() => setShowCategorySuggestions2(false), 200)} 
                      />
                      {showCategorySuggestions2 && categorySuggestions2.length > 0 && (
                          <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                              {categorySuggestions2.map(cat => (
                                  <div key={cat} onClick={() => { 
                                      setCustomization({ ...customization, category2: cat }); 
                                      setCategoryInput2(cat); 
                                      setShowCategorySuggestions2(false); 
                                  }} className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm">
                                      {cat}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      {/* Condicionamos visibilidad según si 'Incluir Nombre' está activo */}
                      <div className={!customization.includeName ? 'opacity-40 pointer-events-none grayscale' : ''}>
                          <Input placeholder="Nombre J2" value={customization.playerName2} onChange={e => setCustomization({...customization, playerName2: e.target.value})}/>
                      </div>
                      <div className={!customization.includeNumber ? 'opacity-40 pointer-events-none grayscale' : ''}>
                          <Input placeholder="Dorsal J2" type="number" value={customization.playerNumber2} onChange={e => setCustomization({...customization, playerNumber2: e.target.value})}/>
                      </div>
                  </div>
              </div>
          )}
          {/* JUGADOR 3 - AHORA CON SELECTOR DE CATEGORÍA */}
          {isTriple && (
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 relative">
                   <h4 className="font-bold text-purple-800 text-xs uppercase mb-3">Datos Jugador 3</h4>
                  
                  {/* Selector Categoría J3 */}
                  <div className="relative mb-3">
                      <label className="block text-[10px] font-bold text-purple-600 mb-1 uppercase">Categoría J3</label>
                      <Input 
                          placeholder="Buscar categoría J3..." 
                          value={categoryInput3} 
                          onChange={e => { 
                              setCategoryInput3(e.target.value); 
                              setCustomization({...customization, category3: ''}); 
                              setShowCategorySuggestions3(true); 
                          }} 
                          onFocus={() => setShowCategorySuggestions3(true)} 
                          onBlur={() => setTimeout(() => setShowCategorySuggestions3(false), 200)} 
                      />
                      {showCategorySuggestions3 && categorySuggestions3.length > 0 && (
                          <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                              {categorySuggestions3.map(cat => (
                                  <div key={cat} onClick={() => { 
                                      setCustomization({ ...customization, category3: cat }); 
                                      setCategoryInput3(cat); 
                                      setShowCategorySuggestions3(false); 
                                  }} className="px-4 py-3 hover:bg-purple-50 cursor-pointer text-sm">
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
          
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border mt-6">
              <label className="font-bold text-gray-700 text-sm">CANTIDAD:</label>
              <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full bg-white border font-bold">-</button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full bg-white border font-bold">+</button>
              </div>
          </div>

          <div className="pt-2 border-t">
              <Button type="submit" disabled={!storeConfig.isOpen} className="w-full py-4 text-lg">
                  {storeConfig.isOpen ? `Añadir al Carrito (${totalPrice.toFixed(2)}€)` : 'TIENDA CERRADA'}
              </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
