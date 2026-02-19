import React, { useState } from 'react';
import { Edit3, Plus, Trash2, AlertCircle, Truck, Phone, MapPin, Package, Contact, Factory, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// --- GESTOR DE PROVEEDORES ---
export const SupplierManager = ({ suppliers, products, createSupplier, updateSupplier, deleteSupplier, updateProductCostBatch }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState(null);
    const [activeTab, setActiveTab] = useState('info'); // info | contacts | products

    const INITIAL_SUPPLIER = {
        name: '',
        taxId: '',
        address: '',
        email: '',
        phone: '',
        contacts: [], 
        priceList: {} 
    };

    const handleEdit = (supplier) => {
        setCurrentSupplier({ ...supplier });
        setIsEditing(true);
        setActiveTab('info');
    };

    const handleCreate = () => {
        setCurrentSupplier(INITIAL_SUPPLIER);
        setIsEditing(true);
        setActiveTab('info');
    };

    const handleSave = async () => {
        if (!currentSupplier.name) return alert("El nombre es obligatorio");
        if (currentSupplier.id) {
            await updateSupplier(currentSupplier);
        } else {
            await createSupplier(currentSupplier);
        }
        setIsEditing(false);
        setCurrentSupplier(null);
    };

    const addContact = () => {
        setCurrentSupplier({
            ...currentSupplier,
            contacts: [...(currentSupplier.contacts || []), { name: '', role: '', phone: '', email: '' }]
        });
    };

    const updateContact = (idx, field, val) => {
        const newContacts = [...currentSupplier.contacts];
        newContacts[idx][field] = val;
        setCurrentSupplier({ ...currentSupplier, contacts: newContacts });
    };

    const removeContact = (idx) => {
        const newContacts = currentSupplier.contacts.filter((_, i) => i !== idx);
        setCurrentSupplier({ ...currentSupplier, contacts: newContacts });
    };

    const updateProductCost = (productId, newCost) => {
        const cost = parseFloat(newCost) || 0;
        const newPriceList = { ...currentSupplier.priceList, [productId]: cost };
        setCurrentSupplier({ ...currentSupplier, priceList: newPriceList });
    };

    const toggleProductLink = (productId) => {
        const newPriceList = { ...currentSupplier.priceList };
        if (newPriceList[productId] !== undefined) {
            delete newPriceList[productId];
        } else {
            const prod = products.find(p => p.id === productId);
            newPriceList[productId] = prod ? prod.cost : 0;
        }
        setCurrentSupplier({ ...currentSupplier, priceList: newPriceList });
    };

    const savePricesAndSync = async () => {
        if (!currentSupplier.id) return alert("Guarda primero el proveedor antes de asignar precios.");
        await updateSupplier(currentSupplier);
        await updateProductCostBatch(currentSupplier.id, currentSupplier.priceList);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-fade-in">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {currentSupplier.id ? <Edit3 className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                        {currentSupplier.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </h3>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
                        <Button onClick={activeTab === 'products' ? savePricesAndSync : handleSave}>
                            {activeTab === 'products' ? 'Guardar y Sincronizar Costes' : 'Guardar Datos'}
                        </Button>
                    </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'info' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}>Datos Generales</button>
                    <button onClick={() => setActiveTab('contacts')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'contacts' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}>Personas de Contacto</button>
                    <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'products' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}>Catálogo y Costes</button>
                </div>

                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nombre Fiscal / Comercial" value={currentSupplier.name} onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})} />
                        <Input label="CIF / NIF" value={currentSupplier.taxId || ''} onChange={e => setCurrentSupplier({...currentSupplier, taxId: e.target.value})} />
                        <div className="md:col-span-2">
                            <Input label="Dirección Completa" value={currentSupplier.address || ''} onChange={e => setCurrentSupplier({...currentSupplier, address: e.target.value})} />
                        </div>
                        <Input label="Email Central" value={currentSupplier.email || ''} onChange={e => setCurrentSupplier({...currentSupplier, email: e.target.value})} />
                        <Input label="Teléfono Central" value={currentSupplier.phone || ''} onChange={e => setCurrentSupplier({...currentSupplier, phone: e.target.value})} />
                    </div>
                )}

                {activeTab === 'contacts' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-700">Agenda de Contactos</h4>
                            <Button size="sm" onClick={addContact}><Plus className="w-4 h-4"/> Añadir Persona</Button>
                        </div>
                        {currentSupplier.contacts?.map((c, i) => (
                            <div key={i} className="flex gap-2 items-end bg-gray-50 p-3 rounded border">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Nombre</label>
                                    <input className="w-full border rounded p-1 text-sm" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Cargo</label>
                                    <input className="w-full border rounded p-1 text-sm" value={c.role} onChange={e => updateContact(i, 'role', e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Email</label>
                                    <input className="w-full border rounded p-1 text-sm" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} />
                                </div>
                                <div className="w-32">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Teléfono</label>
                                    <input className="w-full border rounded p-1 text-sm" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} />
                                </div>
                                
                                {/* --- NUEVO CHECKBOX CC --- */}
                                <div className="w-10 flex flex-col items-center justify-center pb-2">
                                    <label className="text-[8px] uppercase font-bold text-gray-400 mb-1" title="Poner en Copia por defecto">CC</label>
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={c.ccDefault || false} 
                                        onChange={e => updateContact(i, 'ccDefault', e.target.checked)} 
                                    />
                                </div>
                                {/* ------------------------- */}

                                <button onClick={() => removeContact(i)} className="p-2 text-red-500 hover:bg-red-50 rounded mb-0.5"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                        {(!currentSupplier.contacts || currentSupplier.contacts.length === 0) && <p className="text-gray-400 text-sm italic">Sin contactos registrados.</p>}
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-4">
                         <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800 flex gap-2">
                            <AlertCircle className="w-5 h-5"/>
                            <p>Marca los productos que suministra este proveedor. El <strong>coste</strong> que definas aquí se aplicará automáticamente al producto al guardar.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto border rounded-lg p-2 bg-gray-50">
                            {products.map(prod => {
                                const isLinked = currentSupplier.priceList && currentSupplier.priceList[prod.id] !== undefined;
                                const cost = isLinked ? currentSupplier.priceList[prod.id] : (prod.cost || 0);
                                
                                return (
                                    <div key={prod.id} className={`flex items-center justify-between p-3 rounded border transition-colors ${isLinked ? 'bg-white border-emerald-300 shadow-sm' : 'bg-gray-100 opacity-70 border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={isLinked} 
                                                onChange={() => toggleProductLink(prod.id)}
                                                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                            {prod.image && <img src={prod.image} className="w-8 h-8 rounded object-cover" />}
                                            <span className={`font-bold text-sm ${isLinked ? 'text-gray-800' : 'text-gray-500'}`}>{prod.name}</span>
                                        </div>
                                        
                                        {isLinked && (
                                            <div className="flex items-center gap-2 animate-fade-in">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Coste:</label>
                                                <div className="relative w-24">
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        className="w-full border border-gray-300 rounded p-1 text-right font-bold text-gray-800 pr-5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                                        value={cost}
                                                        onChange={(e) => updateProductCost(prod.id, e.target.value)}
                                                    />
                                                    <span className="absolute right-1 top-1 text-gray-400 text-xs">€</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Factory className="w-6 h-6 text-indigo-600"/> Gestión de Proveedores
                    </h3>
                    <p className="text-sm text-gray-500">Administra tus proveedores, contactos y costes de compra.</p>
                </div>
                <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2"/> Nuevo Proveedor
                </Button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                {suppliers.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-400">
                        <Truck className="w-16 h-16 mx-auto mb-2 opacity-20"/>
                        <p>No hay proveedores registrados.</p>
                    </div>
                ) : (
                    suppliers.map(sup => (
                        <div key={sup.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                        {sup.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{sup.name}</h4>
                                        <p className="text-xs text-gray-500">{sup.email || 'Sin email'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(sup)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit3 className="w-4 h-4"/></button>
                                    <button onClick={() => { if(window.confirm('¿Borrar proveedor?')) deleteSupplier(sup.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-xs text-gray-600 mt-4">
                                {sup.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-gray-400"/> {sup.phone}</div>}
                                {sup.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-gray-400"/> <span className="truncate">{sup.address}</span></div>}
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                                    <Package className="w-3 h-3 text-gray-400"/> 
                                    <span className="font-bold text-indigo-700">
                                        {sup.priceList ? Object.keys(sup.priceList).filter(pid => products.some(p => p.id === pid)).length : 0} productos suministrados
                                    </span>
                                </div>
                                {sup.contacts?.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Contact className="w-3 h-3 text-gray-400"/> 
                                        <span>{sup.contacts.length} personas de contacto</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};