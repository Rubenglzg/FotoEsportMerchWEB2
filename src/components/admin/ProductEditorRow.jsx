import React, { useState, useEffect } from 'react';
import { ChevronRight, Settings, Trash2, Image as ImageIcon, Upload, Plus, Layers, Hash, FileText, ShieldCheck, Lock, Unlock, Truck } from 'lucide-react';

export const ProductEditorRow = ({ product, updateProduct, deleteProduct, suppliers, availableSections }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [localSizeInput, setLocalSizeInput] = useState(product.sizes ? product.sizes.join(', ') : '');

    useEffect(() => {
        if (!isExpanded) { 
             setLocalSizeInput(product.sizes ? product.sizes.join(', ') : '');
        }
    }, [product.sizes, isExpanded]);

    const handleSizeBlur = () => {
        const newSizes = localSizeInput.split(',')
            .map(s => s.trim())
            .filter(s => s !== ''); 
        updateProduct({ ...product, sizes: newSizes });
    };

    const features = product.features || { name: true, number: true, photo: true, shield: true, size: true, color: true };
    const defaults = product.defaults || { name: false, number: false, photo: false, shield: true };
    const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };
    const variants = product.variants || [];

    const toggleFeature = (key) => {
        const newValue = !features[key];
        let newFeatures = { ...features, [key]: newValue };
        let newDefaults = { ...defaults };
        let newModifiable = { ...modifiable };

        if (key === 'photo' && newValue === true) {
            newDefaults.photo = true;      
            newModifiable.photo = false;   
        }

        updateProduct({ 
            ...product, 
            features: newFeatures,
            defaults: newDefaults,
            modifiable: newModifiable
        });
    };

    const toggleDefault = (key) => updateProduct({ ...product, defaults: { ...defaults, [key]: !defaults[key] } });
    const toggleModifiable = (key) => updateProduct({ ...product, modifiable: { ...modifiable, [key]: !modifiable[key] } });

    const addVariant = () => {
        const newVariants = [...variants, { id: Date.now(), name: '', priceMod: 0, image: '' }];
        updateProduct({ ...product, variants: newVariants });
    };
    const updateVariant = (id, field, value) => {
        const newVariants = variants.map(v => v.id === id ? { ...v, [field]: value } : v);
        updateProduct({ ...product, variants: newVariants });
    };
    const deleteVariant = (id) => {
        const newVariants = variants.filter(v => v.id !== id);
        updateProduct({ ...product, variants: newVariants });
    };

    const currentSupplier = suppliers ? suppliers.find(s => s.id === product.supplierId) : null;

    return (
        <div className={`bg-white rounded-xl transition-all duration-300 overflow-hidden group mb-3 ${isExpanded ? 'border-2 border-emerald-500 shadow-xl ring-4 ring-emerald-50/50 z-10 transform scale-[1.01]' : 'border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md'}`}>
            
            <div className="p-4 flex items-center gap-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="relative w-14 h-14 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                    {product.image ? (
                        <img src={product.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6 opacity-50"/></div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-base truncate mb-1 group-hover:text-emerald-700 transition-colors">
                        {product.name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                            PVP: {product.price.toFixed(2)}€
                        </span>
                        {product.sizes && product.sizes.length > 0 && (
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-medium">
                                {product.sizes.length} Tallas
                            </span>
                        )}
                        {variants.length > 0 && (
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-medium">
                                {variants.length} Tipos
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
                    <button className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                        {isExpanded ? <ChevronRight className="w-5 h-5 rotate-90"/> : <Settings className="w-5 h-5"/>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }} className="p-2 rounded-lg bg-white border border-transparent text-gray-300 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors">
                        <Trash2 className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-gray-50/80 border-t border-gray-100 p-6 animate-fade-in-down">
                    
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                        
                        <div className="w-full md:w-56 shrink-0 flex flex-col gap-3">
                            <div className="w-full h-56 bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex items-center justify-center relative overflow-hidden group/img">
                                {product.image ? (
                                    <img src={product.image} className="w-full h-full object-contain" alt="" />
                                ) : (
                                    <ImageIcon className="w-16 h-16 text-gray-200"/>
                                )}
                            </div>
                            
                            <label className="w-full cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 py-2.5 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95">
                                <Upload className="w-4 h-4"/>
                                <span>Cambiar Imagen</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if(file) updateProduct(product, file); 
                                    }} 
                                />
                            </label>
                        </div>

                        <div className="flex-1 space-y-5">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre del Producto</label>
                                    <input 
                                        className="w-full border-b-2 border-gray-100 focus:border-emerald-500 outline-none py-2 font-bold text-gray-800 text-lg bg-transparent transition-colors placeholder-gray-300"
                                        value={product.name} 
                                        onChange={(e) => updateProduct({...product, name: e.target.value})}
                                        placeholder="Ej. Taza Personalizada"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-5 pt-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Precio Venta (PVP)</label>
                                        <div className="relative">
                                            <input type="number" step="0.5" className="w-full bg-emerald-50/50 border border-emerald-100 rounded-lg py-2 pl-3 pr-8 text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-200 outline-none" value={product.price} onChange={e => updateProduct({...product, price: parseFloat(e.target.value)})} />
                                            <span className="absolute right-3 top-2 text-emerald-600 text-xs font-bold">€</span>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Coste Producción</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className={`w-full border rounded-lg py-2 pl-3 pr-8 text-sm font-bold outline-none ${currentSupplier ? 'bg-indigo-50 border-indigo-200 text-indigo-700 cursor-not-allowed' : 'bg-gray-50 border-gray-200 text-gray-600 focus:ring-2 focus:ring-gray-200'}`}
                                                value={product.cost} 
                                                onChange={e => !currentSupplier && updateProduct({...product, cost: parseFloat(e.target.value)})}
                                                readOnly={!!currentSupplier}
                                            />
                                            <span className="absolute right-3 top-2 text-gray-400 text-xs font-bold">€</span>
                                        </div>
                                        {currentSupplier && <p className="text-[9px] text-indigo-500 mt-1 flex items-center gap-1"><Lock className="w-3 h-3"/> Gestionado por proveedor</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-gray-100 mt-4">
                                    {/* PROVEEDOR ASIGNADO */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Proveedor Asignado</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                                                value={product.supplierId || ''}
                                                onChange={(e) => {
                                                    const supId = e.target.value;
                                                    let newCost = product.cost;
                                                    if (supId) {
                                                        const s = suppliers.find(su => su.id === supId);
                                                        if (s && s.priceList && s.priceList[product.id]) {
                                                            newCost = s.priceList[product.id];
                                                        }
                                                    }
                                                    updateProduct({...product, supplierId: supId, cost: newCost});
                                                }}
                                            >
                                                <option value="">-- Sin asignar (Coste manual) --</option>
                                                {suppliers && suppliers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                            <Truck className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"/>
                                        </div>
                                    </div>

                                    {/* NUEVA SECCIÓN DE TIENDA */}
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Sección en Tienda</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-sm bg-white focus:ring-2 focus:ring-emerald-100 outline-none appearance-none"
                                                value={product.shopSection || ''} 
                                                onChange={(e) => updateProduct({...product, shopSection: e.target.value})}
                                            >
                                                <option value="">-- Sin Sección --</option>
                                                {availableSections && availableSections.map(sec => (
                                                    <option key={sec} value={sec}>{sec}</option>
                                                ))}
                                            </select>
                                            <Layers className="absolute left-2.5 top-2.5 w-4 h-4 text-emerald-600"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 rounded-xl border border-blue-100 overflow-hidden shadow-sm mt-6 mb-6">
                        <div className="bg-blue-100 px-6 py-3 border-b border-blue-200 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-blue-800 uppercase flex items-center gap-2">
                                <Layers className="w-4 h-4"/> Variantes Visuales (Calendarios / Fotos)
                            </h4>
                            <button onClick={addVariant} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 font-bold flex items-center gap-1">
                                <Plus className="w-3 h-3"/> Añadir Opción
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {variants.length === 0 && <p className="text-xs text-gray-400 italic text-center">Sin variantes (Producto único). Añade "Doble", "Triple" o "Equipo" aquí.</p>}
                            {variants.map((variant, idx) => (
                                <div key={variant.id} className="flex gap-3 items-center bg-white p-3 rounded border border-blue-100">
                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center shrink-0 overflow-hidden border">
                                        {variant.image ? <img src={variant.image} className="w-full h-full object-cover"/> : <ImageIcon className="w-4 h-4 text-gray-300"/>}
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Nombre Opción</label>
                                        <input 
                                            placeholder="Ej. Calendario Doble"
                                            className="w-full text-sm font-bold border-b border-gray-200 outline-none focus:border-blue-500 bg-transparent"
                                            value={variant.name}
                                            onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Extra Precio</label>
                                        <div className="relative">
                                            <input 
                                                type="number" step="0.50"
                                                className="w-full text-sm font-bold border rounded p-1 text-right pr-4 outline-none focus:border-blue-500"
                                                value={variant.priceMod}
                                                onChange={(e) => updateVariant(variant.id, 'priceMod', parseFloat(e.target.value))}
                                            />
                                            <span className="absolute right-1 top-1 text-xs text-gray-400">€</span>
                                        </div>
                                    </div>
                                    
                                    <label className="cursor-pointer p-2 bg-gray-50 rounded hover:bg-gray-100 text-gray-500" title="Subir foto para esta opción">
                                        <Upload className="w-4 h-4"/>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                             const file = e.target.files[0];
                                             if(file) {
                                                 const reader = new FileReader();
                                                 reader.onload = (ev) => updateVariant(variant.id, 'image', ev.target.result); 
                                                 reader.readAsDataURL(file);
                                             }
                                        }}/>
                                    </label>

                                    <button onClick={() => deleteVariant(variant.id)} className="p-2 text-red-400 hover:bg-red-50 rounded">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-6">
                        <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                                <Settings className="w-4 h-4"/> Opciones y Personalización
                            </h4>
                            <div className="flex gap-8 text-[9px] font-bold uppercase text-gray-400 pr-2">
                                <span className="w-12 text-center">Activo</span>
                                <span className="w-12 text-center">Default</span>
                                <span className="w-12 text-center">Lock</span>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-50 p-4">
                            <div className="flex flex-col gap-2 py-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${features.size ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><Hash className="w-5 h-5"/></div>
                                        <span className="text-sm font-bold text-gray-700">Talla</span>
                                    </div>
                                    <div className="flex gap-8 pr-2 items-center">
                                        <div className="w-12 flex justify-center"><input type="checkbox" checked={features.size} onChange={() => toggleFeature('size')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                        <div className="w-12 flex justify-center opacity-20"><input type="checkbox" disabled checked={true}/></div>
                                        <div className="w-12 flex justify-center opacity-20"><Lock className="w-4 h-4 text-gray-300"/></div>
                                    </div>
                                </div>
                                {features.size && (
                                    <div className="ml-12 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in">
                                        <label className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Lista de Tallas (Separadas por comas)</label>
                                        <input 
                                            type="text" 
                                            className="w-full border border-blue-200 rounded p-2 text-xs bg-white focus:ring-2 focus:ring-blue-200 outline-none font-medium text-gray-700" 
                                            placeholder="Ej: S, M, L, XL, XXL (o dejar vacío para texto libre)" 
                                            value={localSizeInput} 
                                            onChange={(e) => setLocalSizeInput(e.target.value)} 
                                            onBlur={handleSizeBlur}
                                        />
                                        <p className="text-[9px] text-blue-400 mt-1">Escribe tallas separadas por comas. Se guardarán al salir del campo.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.name ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><FileText className="w-5 h-5"/></div>
                                    <span className="text-sm font-bold text-gray-700">Nombre Jugador</span>
                                </div>
                                <div className="flex gap-8 pr-2 items-center">
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={features.name} onChange={() => toggleFeature('name')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={defaults.name} onChange={() => toggleDefault('name')} disabled={!features.name} className="rounded text-blue-600 cursor-pointer disabled:opacity-30"/></div>
                                    <div className="w-12 flex justify-center"><button onClick={() => toggleModifiable('name')} disabled={!features.name}>{modifiable.name ? <Unlock className="w-4 h-4 text-emerald-500"/> : <Lock className="w-4 h-4 text-red-500"/>}</button></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.number ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><Hash className="w-5 h-5"/></div>
                                    <span className="text-sm font-bold text-gray-700">Dorsal</span>
                                </div>
                                <div className="flex gap-8 pr-2 items-center">
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={features.number} onChange={() => toggleFeature('number')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={defaults.number} onChange={() => toggleDefault('number')} disabled={!features.number} className="rounded text-blue-600 cursor-pointer disabled:opacity-30"/></div>
                                    <div className="w-12 flex justify-center"><button onClick={() => toggleModifiable('number')} disabled={!features.number}>{modifiable.number ? <Unlock className="w-4 h-4 text-emerald-500"/> : <Lock className="w-4 h-4 text-red-500"/>}</button></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.shield ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><ShieldCheck className="w-5 h-5"/></div>
                                    <span className="text-sm font-bold text-gray-700">Escudo</span>
                                </div>
                                <div className="flex gap-8 pr-2 items-center">
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={features.shield} onChange={() => toggleFeature('shield')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={defaults.shield} onChange={() => toggleDefault('shield')} disabled={!features.shield} className="rounded text-blue-600 cursor-pointer disabled:opacity-30"/></div>
                                    <div className="w-12 flex justify-center"><button onClick={() => toggleModifiable('shield')} disabled={!features.shield}>{modifiable.shield ? <Unlock className="w-4 h-4 text-emerald-500"/> : <Lock className="w-4 h-4 text-red-500"/>}</button></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.photo ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><ImageIcon className="w-5 h-5"/></div>
                                    <div>
                                        <span className="text-sm font-bold text-gray-700 block">Foto Personal</span>
                                        <span className="text-[9px] text-gray-400">Si se activa, es obligatoria.</span>
                                    </div>
                                </div>
                                <div className="flex gap-8 pr-2 items-center">
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={features.photo} onChange={() => toggleFeature('photo')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="w-12 flex justify-center">
                                        <input type="checkbox" checked={features.photo ? true : defaults.photo} disabled className="rounded text-blue-600 opacity-50 cursor-not-allowed"/>
                                    </div>
                                    <div className="w-12 flex justify-center">
                                        <button disabled className="opacity-50 cursor-not-allowed">
                                            {features.photo ? <Lock className="w-4 h-4 text-red-500"/> : <Unlock className="w-4 h-4 text-gray-300"/>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};