import React from 'react';
import { Layers, Plus, EyeOff, Eye, Calendar, FileSpreadsheet, Archive, Trash2 } from 'lucide-react';

export const SeasonsTab = ({
    seasons,
    addSeason,
    toggleSeasonVisibility,
    deleteSeason,
    setConfirmation,
    handleExportSeasonExcel,
    handleDeleteSeasonData
}) => {
    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                            <Layers className="w-6 h-6 text-indigo-600"/> 
                            Gestión de Temporadas
                        </h2>
                        <p className="text-gray-500 text-sm">Control de visibilidad, reportes y datos históricos.</p>
                    </div>
                    
                    {/* Formulario rápido creación */}
                    <div className="flex gap-2 items-end bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400 block ml-1">Nombre</label>
                            <input id="newSName" placeholder="Ej. 24/25" className="border rounded px-2 py-1 text-sm w-24" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400 block ml-1">Inicio</label>
                            <input id="newSStart" type="date" className="border rounded px-2 py-1 text-sm w-32" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400 block ml-1">Fin</label>
                            <input id="newSEnd" type="date" className="border rounded px-2 py-1 text-sm w-32" />
                        </div>
                        <button 
                            onClick={() => {
                                const name = document.getElementById('newSName').value;
                                const start = document.getElementById('newSStart').value;
                                const end = document.getElementById('newSEnd').value;
                                if(name && start && end) {
                                    addSeason({name, startDate: start, endDate: end});
                                    document.getElementById('newSName').value = '';
                                } else {
                                    alert('Rellena todos los campos');
                                }
                            }} 
                            className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 h-[30px] w-[30px] flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {seasons.map(season => (
                        <div key={season.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${season.hiddenForClubs ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-100 shadow-sm hover:border-indigo-200'}`}>
                            
                            {/* Info Temporada */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold text-lg ${season.hiddenForClubs ? 'text-gray-500' : 'text-gray-800'}`}>
                                        {season.name}
                                    </span>
                                    {season.hiddenForClubs ? (
                                        <span className="flex items-center gap-1 text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                                            <EyeOff className="w-3 h-3"/> Oculta
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                                            <Eye className="w-3 h-3"/> Visible
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                    <Calendar className="w-3 h-3"/>
                                    {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                                </div>
                            </div>

                            {/* ACCIONES (Barra de herramientas completa) */}
                            <div className="flex items-center gap-2">
                                
                                {/* 1. VISIBILIDAD */}
                                <button 
                                    onClick={() => toggleSeasonVisibility(season.id, seasons)}
                                    className={`p-2 rounded-lg transition-colors ${season.hiddenForClubs ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                    title={season.hiddenForClubs ? "Mostrar a Clubes" : "Ocultar a Clubes"}
                                >
                                    {season.hiddenForClubs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>

                                <div className="w-px h-6 bg-gray-200 mx-1"></div>

                                {/* 2. EXPORTAR EXCEL */}
                                <button 
                                    onClick={() => setConfirmation({
                                        title: "Descargar Reporte",
                                        msg: `¿Generar Excel completo de la temporada ${season.name}?`,
                                        onConfirm: () => handleExportSeasonExcel(season.id)
                                    })}
                                    className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                    title="Descargar Excel de Pedidos"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                </button>

                                {/* 3. LIMPIAR DATOS (PEDIDOS) */}
                                <button 
                                    onClick={() => handleDeleteSeasonData(season.id)}
                                    className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                                    title="Borrar TODOS los pedidos de esta temporada"
                                >
                                    <Archive className="w-4 h-4" />
                                </button>

                                {/* 4. ELIMINAR TEMPORADA (CONFIGURACIÓN) */}
                                <button 
                                    onClick={() => {
                                        if(window.confirm('¿Seguro que quieres eliminar esta temporada de la configuración?')) deleteSeason(season.id);
                                    }}
                                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                    title="Eliminar Temporada (Configuración)"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {seasons.length === 0 && (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2"/>
                            <p className="text-gray-500 font-medium">No hay temporadas registradas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};