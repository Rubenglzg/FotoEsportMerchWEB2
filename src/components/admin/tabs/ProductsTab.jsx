import React, { useState, useEffect } from 'react';
import { Package, Plus, Layers, Trash2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import { ProductEditorRow } from '../ProductEditorRow';

export const ProductsTab = ({ 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    suppliers,
    showNotification
}) => {
    const [sections, setSections] = useState([]);
    const [newSection, setNewSection] = useState('');

    // Cargar secciones desde Firebase
    useEffect(() => {
        const fetchSections = async () => {
            const docSnap = await getDoc(doc(db, 'settings', 'shopSections'));
            if (docSnap.exists() && docSnap.data().list) {
                setSections(docSnap.data().list);
            }
        };
        fetchSections();
    }, []);

    // Guardar secciones en Firebase
    const saveSections = async (newList) => {
        await setDoc(doc(db, 'settings', 'shopSections'), { list: newList });
        setSections(newList);
        showNotification('Secciones actualizadas');
    };

    const handleAddSection = () => {
        if (!newSection.trim() || sections.includes(newSection.trim())) return;
        const updatedSections = [...sections, newSection.trim()];
        saveSections(updatedSections);
        setNewSection('');
    };

    const handleDeleteSection = (sectionToRemove) => {
        // 1. Actualizamos la lista de secciones disponibles
        const updatedSections = sections.filter(s => s !== sectionToRemove);
        saveSections(updatedSections);

        // 2. LIMPIEZA AUTOMÁTICA: Buscamos qué productos tenían esta sección
        const affectedProducts = products.filter(p => p.shopSection === sectionToRemove);
        
        // 3. A cada producto afectado, le quitamos la sección (lo mandamos a General)
        affectedProducts.forEach(product => {
            updateProduct({ ...product, shopSection: '' });
        });
        
        showNotification(`Sección "${sectionToRemove}" eliminada de los productos`);
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start animate-fade-in">
            
            {/* COLUMNA IZQUIERDA: GESTIÓN DE SECCIONES (1/3 ancho) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                    <h4 className="font-black text-emerald-800 text-lg flex items-center gap-2">
                        <Layers className="w-6 h-6"/> Secciones de Tienda
                    </h4>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            placeholder="Nueva sección (ej. Tazas)..."
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-100 outline-none"
                            value={newSection}
                            onChange={(e) => setNewSection(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                        />
                        <button 
                            onClick={handleAddSection}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-colors"
                        >
                            <Plus className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="space-y-2 mt-4">
                        {sections.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">No hay secciones creadas.</p>
                        ) : (
                            sections.map((section, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-3 rounded-lg">
                                    <span className="font-bold text-gray-700 text-sm">{section}</span>
                                    <button 
                                        onClick={() => handleDeleteSection(section)}
                                        className="text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA: CATÁLOGO DE PRODUCTOS (2/3 ancho) */}
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col min-h-[600px] overflow-hidden">
                <div className="px-6 py-5 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h4 className="font-black text-gray-800 text-lg flex items-center gap-2 tracking-tight">
                            <Package className="w-6 h-6 text-emerald-600"/> Catálogo de Productos
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-1 ml-8">Asigna tus productos a las secciones creadas.</p>
                    </div>
                    <button 
                        onClick={addProduct} 
                        className="bg-gray-900 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-gray-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4"/> <span className="text-xs font-bold">Crear Producto</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50 custom-scrollbar space-y-4">
                    {products.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 opacity-60">
                            <Package className="w-16 h-16 text-gray-300 mb-2"/>
                            <p className="font-bold text-sm">Catálogo vacío</p>
                        </div>
                    ) : (
                        products.map(p => (
                            <ProductEditorRow 
                                key={p.id} 
                                product={p} 
                                updateProduct={updateProduct} 
                                deleteProduct={deleteProduct} 
                                suppliers={suppliers}
                                // Pasamos las secciones para que el ProductEditorRow pueda mostrarlas en un select
                                availableSections={sections} 
                            />
                        ))
                    )}
                </div>
            </div>

        </div>
    );
};