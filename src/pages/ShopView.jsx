import React, { useState, useMemo, useEffect } from 'react';
// 1. Iconos necesarios
import { Search, ShoppingBag, ChevronLeft } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // 1. Obtener categorías únicas dinámicamente
  const categories = useMemo(() => {
    const cats = products.map(p => p.category || 'General');
    return ['Todas', ...new Set(cats)].sort();
  }, [products]);

  // 2. Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || (p.category || 'General') === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <div className="animate-fade-in min-h-screen pb-12">
      {!selectedProduct ? (
        <>
          {/* CABECERA Y FILTROS */}
          <div className="mb-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
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
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-emerald-100 transition-all duration-300 cursor-pointer group flex flex-col h-full transform hover:-translate-y-1" 
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Imagen - CORREGIDA: object-contain + p-4 */}
                  <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700 ease-out z-10" 
                    />
                    
                    {/* Etiqueta Categoría Flotante */}
                    <div className="absolute top-3 left-3 z-20">
                      <span className="bg-white/90 backdrop-blur-sm text-xs font-bold px-2 py-1 rounded-md text-gray-700 shadow-sm border border-white/50">
                        {product.category || 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 leading-tight mb-2 group-hover:text-emerald-700 transition-colors">
                        {product.name}
                      </h3>
                      
                      {/* Características pequeñas */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.features?.name && (
                          <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Nombre</span>
                        )}
                        {product.features?.number && (
                          <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Dorsal</span>
                        )}
                        {product.sizes && product.sizes.length > 0 && (
                          <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{product.sizes.length} Tallas</span>
                        )}
                      </div>
                    </div>

                    {/* Footer Tarjeta */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                    {/* --- INICIO LÓGICA PRECIO CAMPAÑA --- */}
                    {(() => {
                        // Calculamos precio
                        const isPack = product.category === 'Packs' || product.category === 'Ofertas';
                        const hasDiscount = campaignConfig?.active && campaignConfig?.discount > 0 && !isPack;
                        const finalPrice = hasDiscount ? product.price * (1 - campaignConfig.discount / 100) : product.price;

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
                            </div>
                        );
                    })()}
                    {/* --- FIN LÓGICA --- */}
                      
                      <button className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-sm">
                        <ShoppingBag className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ESTADO VACÍO */
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No encontramos productos</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">
                Intenta buscar con otro término o selecciona la categoría "Todas".
              </p>
              <button 
                onClick={() => { setSearchTerm(''); setSelectedCategory('Todas'); }}
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
              onBack={() => setSelectedProduct(null)} 
              onAdd={addToCart} 
              clubs={clubs} 
              modificationFee={modificationFee} 
              storeConfig={storeConfig} 
              setConfirmation={setConfirmation} 
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE SECUNDARIO: PERSONALIZADOR (Solo se usa aquí dentro)
// ============================================================================
export function ProductCustomizer({ product, onBack, onAdd, clubs, modificationFee, storeConfig, setConfirmation }) {
  const defaults = product.defaults || {};
  const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };
  const features = product.features || {};
  const variants = product.variants || []; 
  const sizeOptions = product.sizes && product.sizes.length > 0 ? product.sizes : null;

  const [clubInput, setClubInput] = useState('');
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
      clubId: '', 
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
      return clubs.filter(c => c.name.toLowerCase().includes(clubInput.toLowerCase()));
  }, [clubInput, clubs]);

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
    const unitPrice = product.price + variantPrice + (modificationCount * (modificationFee || 0));
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

          <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Club <span className="text-red-500">*</span></label>
              <Input placeholder="Buscar club..." value={clubInput} onChange={e => { setClubInput(e.target.value); setCustomization({...customization, clubId: ''}); setShowClubSuggestions(true); }} onFocus={() => setShowClubSuggestions(true)} onBlur={() => setTimeout(() => setShowClubSuggestions(false), 200)} />
              {showClubSuggestions && clubSuggestions.length > 0 && (
                  <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {clubSuggestions.map(c => <div key={c.id} onClick={() => handleSelectClub(c)} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer">{c.name}</div>)}
                  </div>
              )}
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
