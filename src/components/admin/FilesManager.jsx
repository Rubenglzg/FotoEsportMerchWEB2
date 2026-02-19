import React, { useState } from 'react';
import { Upload, X, ChevronRight, Folder, Eye, Trash2, RefreshCw } from 'lucide-react';
import { ref, listAll, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import { storage } from '../../config/firebase';

// --- GESTOR DE ARCHIVOS
export const FilesManager = ({ clubs }) => {
    const [level, setLevel] = useState('clubs'); 
    const [selectedClub, setSelectedClub] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [items, setItems] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // Estados para subida
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]); 
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [uploadMode, setUploadMode] = useState('smart'); 
    
    // Estado para Drag & Drop
    const [isDragging, setIsDragging] = useState(false);

    // --- UTILS PARA DRAG & DROP RECURSIVO ---
    const traverseFileTree = async (item, path = '') => {
        if (item.isFile) {
            const file = await new Promise((resolve) => item.file(resolve));
            Object.defineProperty(file, 'webkitRelativePath', {
                value: path + file.name,
                writable: true,
                configurable: true
            });
            return [file];
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            let entries = [];
            const readEntries = async () => {
                const results = await new Promise((resolve) => dirReader.readEntries(resolve));
                if (results.length > 0) {
                    entries = entries.concat(results);
                    await readEntries(); 
                }
            };
            await readEntries();
            
            let files = [];
            for (const entry of entries) {
                files = [...files, ...(await traverseFileTree(entry, path + item.name + '/'))];
            }
            return files;
        }
        return [];
    };

    // --- HANDLERS DRAG & DROP ---
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedClub && !isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return; 
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (!selectedClub) {
            alert("Primero selecciona un club para subir archivos.");
            return;
        }

        const items = e.dataTransfer.items;
        if (!items) return;

        setLoading(true);
        let allFiles = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) {
                const files = await traverseFileTree(item);
                allFiles = [...allFiles, ...files];
            }
        }

        if (allFiles.length > 0) {
            setUploadFiles(allFiles);
            setIsUploading(true);
            const hasFolders = allFiles.some(f => f.webkitRelativePath.includes('/'));
            setUploadMode(hasFolders ? 'smart' : 'single');
        }
        setLoading(false);
    };

    // CARGAS
    const loadCategories = async (clubId) => {
        setLoading(true);
        try {
            // BUSCAMOS EL CLUB POR ID PARA OBTENER SU NOMBRE
            const club = clubs.find(c => c.id === clubId);
            // Usamos el nombre si existe, si no el ID por seguridad
            const rootFolder = club ? club.name : clubId;
            
            const clubRef = ref(storage, rootFolder); // <--- CAMBIO AQUÍ
            const res = await listAll(clubRef);
            setItems(res.prefixes);
            setLevel('categories');
        } catch (error) {
            console.error("Error:", error);
            setItems([]);
            setLevel('categories');
        }
        setLoading(false);
    };

    const loadPhotos = async (categoryRef) => {
        setLoading(true);
        try {
            // categoryRef ya viene de la lista anterior, pero si necesitamos reconstruirlo:
            // const storagePath = `${selectedClub.name}/${selectedCategory}`;
            // En este caso, 'categoryRef' que viene de listAll ya trae la ruta correcta (nombre/categoria)
            // así que NO suele hacer falta cambiar nada aquí si 'loadCategories' ya usó el nombre.
            
            // PERO por seguridad, si usabas ref textual manual en algún sitio:
            // const photosRef = ref(storage, `${selectedClub.name}/${selectedCategory}`);
            
            // El código original usaba 'res = await listAll(categoryRef)', eso sigue funcionando bien 
            // porque categoryRef es hijo de la referencia creada en loadCategories.
            
            const res = await listAll(categoryRef);
            const photosWithUrls = await Promise.all(res.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return { name: itemRef.name, fullPath: itemRef.fullPath, url, ref: itemRef };
            }));
            setItems(photosWithUrls);
            setLevel('files');
        } catch (error) {
            console.error("Error:", error);
        }
        setLoading(false);
    };

    // SUBIDA
    const handleBulkUpload = async () => {
        if (uploadFiles.length === 0 || !selectedClub) return;

        setLoading(true);
        setUploadProgress({ current: 0, total: uploadFiles.length });
        let successCount = 0;

        const filesArray = Array.from(uploadFiles);

        try {
            for (let i = 0; i < filesArray.length; i++) {
                const file = filesArray[i];
                let targetFolderName = '';

                // ... lógica de carpetas smart/single igual ...
                if (uploadMode === 'smart') {
                    const pathParts = file.webkitRelativePath.split('/');
                    if (pathParts.length >= 2) {
                        targetFolderName = pathParts[pathParts.length - 2]; 
                    } else {
                        targetFolderName = 'General';
                    }
                } else {
                    targetFolderName = selectedCategory || 'General';
                }

                const cleanFolderName = targetFolderName.trim().replace(/\s+/g, '_');
                
                // --- CAMBIO IMPORTANTE AQUÍ ---
                // Usamos selectedClub.name en lugar de selectedClub.id
                const finalPath = `${selectedClub.name}/${cleanFolderName}/${file.name}`; 
                
                if (!file.name.startsWith('.')) {
                    const fileRef = ref(storage, finalPath);
                    await uploadBytes(fileRef, file);
                    successCount++;
                }

                setUploadProgress(prev => ({ ...prev, current: i + 1 }));
            }
            
            // ... resto de la función (alert, limpieza, recarga) ...
            // Al recargar, asegúrate de usar el ID que loadCategories transformará a nombre internamente:
            if (level === 'categories') loadCategories(selectedClub.id);
            else if (level === 'files') {
                // Aquí sí debemos construir la referencia manualmente si recargamos directo
                const photosRef = ref(storage, `${selectedClub.name}/${selectedCategory}`);
                loadPhotos(photosRef);
            } else {
                loadCategories(selectedClub.id);
            }

        } catch (error) {
            console.error("Error subida:", error);
            alert("Error en la subida. Revisa permisos.");
        }
        setLoading(false);
    };

    const handleDelete = async (fileItem) => {
        if (!window.confirm(`¿Eliminar ${fileItem.name}?`)) return;
        try {
            await deleteObject(fileItem.ref);
            setItems(prev => prev.filter(i => i.fullPath !== fileItem.fullPath));
        } catch (error) {
            console.error("Error borrando:", error);
        }
    };

    return (
        <div 
            className={`bg-white p-6 rounded-xl shadow h-full min-h-[500px] flex flex-col relative transition-colors ${isDragging ? 'bg-blue-50 border-2 border-blue-400 border-dashed' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* OVERLAY DRAG & DROP */}
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-100/90 rounded-xl backdrop-blur-sm pointer-events-none">
                    <div className="text-center animate-bounce">
                        <Upload className="w-16 h-16 text-blue-600 mx-auto mb-2"/>
                        <h3 className="text-2xl font-bold text-blue-700">¡Suelta los archivos aquí!</h3>
                    </div>
                </div>
            )}

            {/* CABECERA */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => { setLevel('clubs'); setSelectedClub(null); setSelectedCategory(null); }} className={`font-bold hover:text-emerald-600 ${level === 'clubs' ? 'text-gray-800' : 'text-gray-400'}`}>Clubes</button>
                    {level !== 'clubs' && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-300"/>
                            <button onClick={() => loadCategories(selectedClub.id)} className={`font-bold hover:text-emerald-600 ${level === 'categories' ? 'text-gray-800' : 'text-gray-400'}`}>{selectedClub.name}</button>
                        </>
                    )}
                    {level === 'files' && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-300"/>
                            <span className="font-bold text-emerald-600">{selectedCategory}</span>
                        </>
                    )}
                </div>
                
                {selectedClub && !isUploading && (
                    <button onClick={() => setIsUploading(true)} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm transition-transform active:scale-95">
                        <Upload className="w-4 h-4"/> Subir / Arrastrar
                    </button>
                )}
            </div>

            {/* PANEL DE SUBIDA */}
            {isUploading && (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 mb-6 animate-fade-in shadow-inner relative z-10">
                    <button onClick={() => { setIsUploading(false); setUploadFiles([]); }} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                    
                    <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5"/> Preparado para Subir
                    </h4>

                    {loading && uploadProgress.total > 0 ? (
                        <div className="text-center py-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                            </div>
                            <p className="text-sm font-bold text-emerald-700">Subiendo {uploadProgress.current} de {uploadProgress.total}...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {uploadFiles.length > 0 && (
                                <div className="bg-white p-3 rounded border border-emerald-200 text-sm mb-2">
                                    <p className="font-bold text-gray-700">✅ {uploadFiles.length} archivos detectados</p>
                                    <p className="text-xs text-gray-500 truncate mt-1">
                                        Ej: {uploadFiles[0].name} {uploadFiles.length > 1 && `... y ${uploadFiles.length - 1} más`}
                                    </p>
                                </div>
                            )}

                            {/* Selector de Modo */}
                            <div className="flex gap-4 border-b border-emerald-200 pb-4">
                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-emerald-100 transition-colors flex-1 border border-transparent hover:border-emerald-200">
                                    <input type="radio" name="mode" checked={uploadMode === 'smart'} onChange={() => setUploadMode('smart')} className="mt-1 text-emerald-600"/>
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 block">Modo Estructura / Carpeta</span>
                                        <span className="text-xs text-gray-600">Crear categorías automáticamente (Recomendado).</span>
                                    </div>
                                </label>
                                
                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-emerald-100 transition-colors flex-1 border border-transparent hover:border-emerald-200">
                                    <input type="radio" name="mode" checked={uploadMode === 'single'} onChange={() => setUploadMode('single')} className="mt-1 text-emerald-600"/>
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 block">Modo Simple</span>
                                        <span className="text-xs text-gray-600">Todo a: <b>{selectedCategory || 'General'}</b></span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* BOTÓN PERSONALIZADO (AQUÍ ESTÁ EL ARREGLO) */}
                                <div className="flex-1 flex items-center gap-3">
                                    <label className="cursor-pointer flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-xs hover:bg-emerald-200 transition-colors shadow-sm border border-emerald-200 active:scale-95">
                                        <Upload className="w-4 h-4" />
                                        {uploadMode === 'smart' ? 'Seleccionar Carpeta' : 'Seleccionar Fotos'}
                                        <input 
                                            type="file" 
                                            multiple 
                                            className="hidden" // INPUT OCULTO
                                            {...(uploadMode === 'smart' ? { webkitdirectory: "", directory: "" } : {})}
                                            onChange={e => setUploadFiles(e.target.files)} 
                                        />
                                    </label>
                                    <span className="text-sm text-gray-400 italic">
                                        {uploadFiles.length === 0 ? 'O arrastra aquí...' : ''}
                                    </span>
                                </div>

                                <button 
                                    onClick={handleBulkUpload} 
                                    disabled={uploadFiles.length === 0} 
                                    className="bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all active:scale-95"
                                >
                                    Confirmar Subida
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CONTENIDO */}
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-4 overflow-y-auto custom-scrollbar relative z-0">
                {level === 'clubs' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {clubs.map(c => (
                            <div key={c.id} onClick={() => { setSelectedClub(c); loadCategories(c.id); }} className="bg-white p-4 rounded-lg shadow-sm border hover:border-emerald-500 cursor-pointer flex items-center gap-3 hover:shadow-md transition-all">
                                <div className="bg-emerald-100 p-2 rounded text-emerald-600"><Folder className="w-6 h-6"/></div>
                                <div><p className="font-bold text-sm text-gray-700">{c.name}</p></div>
                            </div>
                        ))}
                    </div>
                )}
                {level === 'categories' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {items.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <Folder className="w-16 h-16 mb-4 opacity-20"/>
                                <p className="font-medium">Carpeta vacía</p>
                            </div>
                        ) : (
                            items.map(ref => (
                                <div key={ref.name} onClick={() => { setSelectedCategory(ref.name); loadPhotos(ref); }} className="bg-white p-4 rounded-lg shadow-sm border hover:border-blue-500 cursor-pointer text-center hover:shadow-md">
                                    <Folder className="w-12 h-12 mx-auto text-blue-200 mb-2"/>
                                    <p className="font-bold text-sm text-gray-700 truncate">{ref.name}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {level === 'files' && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {items.map(photo => (
                            <div key={photo.fullPath} className="group relative bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg">
                                <div className="aspect-square bg-gray-100 relative">
                                    <img src={photo.url} className="w-full h-full object-cover" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                        <a href={photo.url} target="_blank" className="p-2 bg-white rounded-full hover:text-blue-600"><Eye className="w-4 h-4"/></a>
                                        <button onClick={() => handleDelete(photo)} className="p-2 bg-white rounded-full hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                <p className="p-2 text-[10px] font-medium text-gray-600 truncate">{photo.name}</p>
                            </div>
                        ))}
                    </div>
                )}
                {loading && !isUploading && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 absolute inset-0 bg-white/80 z-20">
                        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-emerald-500"/>
                        <span className="text-sm font-medium">Cargando...</span>
                    </div>
                )}
            </div>
        </div>
    );
};