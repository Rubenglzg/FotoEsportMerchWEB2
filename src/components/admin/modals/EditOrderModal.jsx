import React from 'react';
import { Edit3, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export const EditOrderModal = ({ editOrderModal, setEditOrderModal, handlePreSaveOrder }) => {
    if (!editOrderModal.active || !editOrderModal.modified) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2"><Edit3 className="w-5 h-5"/> Editar Pedido</h3>
                    <button onClick={() => setEditOrderModal({ active: false, original: null, modified: null })}><X className="w-5 h-5 text-gray-400"/></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Nombre Cliente" value={editOrderModal.modified.customer.name} onChange={e => setEditOrderModal({ ...editOrderModal, modified: { ...editOrderModal.modified, customer: { ...editOrderModal.modified.customer, name: e.target.value } } })} />
                        <Input label="Email" value={editOrderModal.modified.customer.email} onChange={e => setEditOrderModal({ ...editOrderModal, modified: { ...editOrderModal.modified, customer: { ...editOrderModal.modified.customer, email: e.target.value } } })} />
                    </div>

                    <div>
                        <h4 className="font-bold text-sm text-gray-700 mb-2 uppercase">Productos</h4>
                        <div className="space-y-3">
                            {editOrderModal.modified.items.map((item, idx) => (
                                <div key={idx} className="border p-3 rounded bg-gray-50 grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-4"><label className="text-[10px] block font-bold text-gray-400">Producto</label><input className="w-full text-sm border rounded p-1" value={item.name} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].name = e.target.value; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                    <div className="col-span-2"><label className="text-[10px] block font-bold text-gray-400">Dorsal</label><input className="w-full text-sm border rounded p-1" value={item.playerNumber || ''} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].playerNumber = e.target.value; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                    <div className="col-span-3"><label className="text-[10px] block font-bold text-gray-400">Nombre</label><input className="w-full text-sm border rounded p-1" value={item.playerName || ''} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].playerName = e.target.value; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                    <div className="col-span-1"><label className="text-[10px] block font-bold text-gray-400">Cant.</label><input type="number" min="1" className="w-full text-sm border rounded p-1 text-gray-900" value={item.quantity || 1} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].quantity = parseInt(e.target.value) || 1; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                    <div className="col-span-2"><label className="text-[10px] block font-bold text-gray-400">Precio</label><input type="number" className="w-full text-sm border rounded p-1" value={item.price} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].price = parseFloat(e.target.value) || 0; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                    <Button variant="secondary" onClick={() => setEditOrderModal({ active: false, original: null, modified: null })}>Cancelar</Button>
                    <Button onClick={handlePreSaveOrder}>Guardar Cambios</Button>
                </div>
            </div>
        </div>
    );
};