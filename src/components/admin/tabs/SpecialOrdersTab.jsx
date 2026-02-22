import React, { useState } from 'react';
import { Briefcase, FileText, Banknote, Landmark, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button'; // Ajusta la ruta si es necesario

export const SpecialOrdersTab = ({ clubs, specialOrders, createSpecialOrder }) => {
    // Movemos el estado del formulario aquí adentro
    const [newSpecialOrder, setNewSpecialOrder] = useState({ 
        clubId: '', 
        items: [{ description: '', quantity: 1, price: 0, cost: 0 }], 
        paymentMethod: 'invoice', 
        globalBatch: 1 
    });

    // Movemos todas las funciones manejadoras de este formulario
    const handleAddSpecialItem = () => {
        setNewSpecialOrder({
            ...newSpecialOrder,
            items: [...newSpecialOrder.items, { description: '', quantity: 1, price: 0, cost: 0 }]
        });
    };

    const handleRemoveSpecialItem = (index) => {
        const updatedItems = newSpecialOrder.items.filter((_, i) => i !== index);
        setNewSpecialOrder({ ...newSpecialOrder, items: updatedItems });
    };

    const updateSpecialItem = (index, field, value) => {
        const updatedItems = [...newSpecialOrder.items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setNewSpecialOrder({ ...newSpecialOrder, items: updatedItems });
    };

    const calculateSpecialTotals = () => {
        const total = newSpecialOrder.items.reduce((acc, item) => acc + (parseFloat(item.price || 0) * parseFloat(item.quantity || 1)), 0);
        const totalCost = newSpecialOrder.items.reduce((acc, item) => acc + (parseFloat(item.cost || 0) * parseFloat(item.quantity || 1)), 0);
        return { total, totalCost };
    };

    const handleCreateSpecialOrder = (e) => {
        e.preventDefault();
        const club = clubs.find(c => c.id === newSpecialOrder.clubId);
        if(!club) return;

        const { total } = calculateSpecialTotals();

        const orderItems = newSpecialOrder.items.map(item => ({
            name: item.description,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            cost: parseFloat(item.cost),
            category: 'Servicios',
            image: '', 
            cartId: Date.now() + Math.random() 
        }));

        createSpecialOrder({
            clubId: newSpecialOrder.clubId,
            clubName: club.name,
            customer: { name: club.name, email: 'club@admin.com', phone: '-', notification: 'email' },
            items: orderItems,
            total: total,
            paymentMethod: newSpecialOrder.paymentMethod, 
            globalBatch: club.activeGlobalOrderId
        });
        
        // Limpiar el formulario tras guardar
        setNewSpecialOrder({ 
            clubId: '', 
            items: [{ description: '', quantity: 1, price: 0, cost: 0 }], 
            paymentMethod: 'invoice', 
            globalBatch: 1 
        });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow max-w-4xl mx-auto animate-fade-in-up">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-indigo-700">
                <Briefcase className="w-5 h-5"/> Registro de Pedidos Especiales
            </h3>
            
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-8">
                <p className="text-sm text-indigo-800 mb-6">Herramienta para registrar servicios adicionales o ventas directas fuera del catálogo estándar.</p>
                <form onSubmit={handleCreateSpecialOrder} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Club</label>
                            <select required className="w-full border rounded p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={newSpecialOrder.clubId} onChange={e => setNewSpecialOrder({...newSpecialOrder, clubId: e.target.value})}>
                                <option value="">-- Seleccionar Club --</option>
                                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Método de Pago</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button type="button" onClick={() => setNewSpecialOrder({...newSpecialOrder, paymentMethod: 'invoice'})} className={`flex flex-col items-center justify-center p-2 rounded border text-xs transition-colors ${newSpecialOrder.paymentMethod === 'invoice' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <FileText className="w-4 h-4 mb-1"/> Factura
                                </button>
                                <button type="button" onClick={() => setNewSpecialOrder({...newSpecialOrder, paymentMethod: 'cash'})} className={`flex flex-col items-center justify-center p-2 rounded border text-xs transition-colors ${newSpecialOrder.paymentMethod === 'cash' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <Banknote className="w-4 h-4 mb-1"/> Efectivo
                                </button>
                                <button type="button" onClick={() => setNewSpecialOrder({...newSpecialOrder, paymentMethod: 'transfer'})} className={`flex flex-col items-center justify-center p-2 rounded border text-xs transition-colors ${newSpecialOrder.paymentMethod === 'transfer' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <Landmark className="w-4 h-4 mb-1"/> Transf.
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-gray-600 uppercase">Conceptos</label>
                            <button type="button" onClick={handleAddSpecialItem} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                                <Plus className="w-3 h-3"/> Añadir Línea
                            </button>
                        </div>
                        <div className="space-y-2">
                            {newSpecialOrder.items.map((item, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <input required placeholder="Descripción" className="w-full border rounded p-2 text-sm outline-none focus:border-indigo-500" value={item.description} onChange={e => updateSpecialItem(index, 'description', e.target.value)} />
                                    </div>
                                    <div className="w-20">
                                        <input type="number" min="1" placeholder="Cant." className="w-full border rounded p-2 text-sm text-center outline-none focus:border-indigo-500" value={item.quantity} onChange={e => updateSpecialItem(index, 'quantity', e.target.value)} />
                                    </div>
                                    <div className="w-24 relative">
                                        <input type="number" step="0.01" placeholder="PVP" className="w-full border rounded p-2 text-sm text-right pr-6 outline-none focus:border-indigo-500" value={item.price} onChange={e => updateSpecialItem(index, 'price', e.target.value)} />
                                        <span className="absolute right-2 top-2 text-gray-400 text-xs">€</span>
                                    </div>
                                    <div className="w-24 relative">
                                        <input type="number" step="0.01" placeholder="Coste" className="w-full border rounded p-2 text-sm text-right pr-6 bg-gray-50 text-gray-500 outline-none focus:border-indigo-500" value={item.cost} onChange={e => updateSpecialItem(index, 'cost', e.target.value)} />
                                        <span className="absolute right-2 top-2 text-gray-400 text-xs">€</span>
                                    </div>
                                    {newSpecialOrder.items.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveSpecialItem(index)} className="p-2 text-red-400 hover:bg-red-50 rounded transition-colors">
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded border border-indigo-100 flex justify-end gap-8">
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase">Coste Total</p>
                            <p className="text-lg font-mono text-gray-400">{calculateSpecialTotals().totalCost.toFixed(2)}€</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-indigo-600 font-bold uppercase">Total a Cobrar</p>
                            <p className="text-2xl font-bold text-indigo-900">{calculateSpecialTotals().total.toFixed(2)}€</p>
                        </div>
                    </div>
                    
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 shadow-lg shadow-indigo-200">
                        Registrar Pedido Especial
                    </Button>
                </form>
            </div>

            {/* Listado de Últimos Pedidos Especiales */}
            <div>
                <h4 className="font-bold text-gray-700 mb-4">Últimos Pedidos Especiales</h4>
                <div className="space-y-2">
                    {specialOrders.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No hay pedidos especiales registrados.</p>
                    ) : (
                        specialOrders.map(order => (
                            <div key={order.id} className="border p-4 rounded-lg flex justify-between items-center bg-gray-50 hover:bg-white transition-colors">
                                <div>
                                    <p className="font-bold text-indigo-900">{order.items.length > 1 ? `${order.items.length} Artículos` : order.items[0]?.name}</p>
                                    <p className="text-xs text-gray-500 flex gap-2">
                                        <span>{order.clubName}</span><span>•</span>
                                        <span>{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-lg">{order.total}€</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};