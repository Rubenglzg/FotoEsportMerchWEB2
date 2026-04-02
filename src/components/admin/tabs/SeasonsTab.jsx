import React, { useState } from 'react';
import { Layers, Plus, EyeOff, Eye, Calendar, FileSpreadsheet, Archive, Trash2, X, Info } from 'lucide-react';
import { Button } from '../../ui/Button';

export const SeasonsTab = ({
    seasons,
    clubs = [],
    addSeason,
    toggleSeasonVisibility,
    deleteSeason,
    setConfirmation,
    handleExportSeasonExcel,
    handleDeleteSeasonData
}) => {
    const [deleteModal, setDeleteModal] = useState({ active: false, season: null, selectedClubs: [] });

    const openDeleteModal = (season) => {
        setDeleteModal({ active: true, season: season, selectedClubs: [] });
    };

    const toggleClubSelection = (clubId) => {
        setDeleteModal(prev => {
            const isSelected = prev.selectedClubs.includes(clubId);
            return {
                ...prev,
                selectedClubs: isSelected 
                    ? prev.selectedClubs.filter(id => id !== clubId)
                    : [...prev.selectedClubs, clubId]
            };
        });
    };

    const handleConfirmDelete = () => {
        handleDeleteSeasonData(deleteModal.season.id, deleteModal.selectedClubs);
        setDeleteModal({ active: false, season: null, selectedClubs: [] });
    };

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

                {/* LEYENDA INFORMATIVA CON LA "I" */}
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs flex flex-col md:flex-row gap-3 items-start md:items-center mb-6 border border-blue-100">
                    <div className="flex items-center gap-1 font-bold">
                        <Info className="w-4 h-4 text-blue-600" /> Leyenda de Acciones:
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-indigo-500"/> Ocultar/Mostrar a Clubes</span>
                        <span className="flex items-center gap-1"><FileSpreadsheet className="w-3 h-3 text-green-600"/> Descargar Excel Completo</span>
                        <span className="flex items-center gap-1"><Archive className="w-3 h-3 text-orange-500"/> Borrar pedidos de Clubes (Parcial)</span>
                        <span className="flex items-center gap-1"><Trash2 className="w-3 h-3 text-red-500"/> Borrar Temporada y TODOS los datos</span>
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

                            {/* ACCIONES */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => toggleSeasonVisibility(season.id, seasons)}
                                    className={`p-2 rounded-lg transition-colors ${season.hiddenForClubs ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                    title={season.hiddenForClubs ? "Mostrar a Clubes" : "Ocultar a Clubes"}
                                >
                                    {season.hiddenForClubs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>

                                <div className="w-px h-6 bg-gray-200 mx-1"></div>

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

                                {/* BOTÓN NARANJA: Solo borrado selectivo */}
                                <button 
                                    onClick={() => openDeleteModal(season)}
                                    className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                                    title="Borrar pedidos de clubes específicos"
                                >
                                    <Archive className="w-4 h-4" />
                                </button>

                                {/* BOTÓN ROJO: Borrado total (Pedidos + Configuración) */}
                                <button 
                                    onClick={() => handleDeleteSeasonData(season.id, [], () => deleteSeason(season.id))}
                                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                    title="Eliminar Temporada y TODOS sus pedidos"
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

            {/* MODAL PARA SELECCIONAR CLUBES (BOTÓN NARANJA) */}
            {deleteModal.active && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold text-gray-800">
                                Borrado Parcial - Temporada {deleteModal.season.name}
                            </h3>
                            <button onClick={() => setDeleteModal({active: false, season: null, selectedClubs: []})} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5"/>
                            </button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                            <p className="text-sm text-gray-600 mb-4">
                                Selecciona de qué clubes quieres borrar los pedidos. 
                                <span className="block font-medium text-orange-600 mt-2">
                                    ⚠️ Debes seleccionar al menos un club. Si quieres borrar la temporada entera junto con todos sus datos, utiliza el botón rojo de la papelera.
                                </span>
                            </p>

                            <div className="space-y-2 border rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                                {clubs.map(club => (
                                    <label key={club.id} className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                                            checked={deleteModal.selectedClubs.includes(club.id)}
                                            onChange={() => toggleClubSelection(club.id)}
                                        />
                                        <span className="text-sm font-medium text-gray-700">{club.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeleteModal({active: false, season: null, selectedClubs: []})}>
                                Cancelar
                            </Button>
                            {/* Deshabilitado si no hay nada seleccionado */}
                            <Button 
                                variant="danger" 
                                onClick={handleConfirmDelete}
                                disabled={deleteModal.selectedClubs.length === 0}
                                className={deleteModal.selectedClubs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                                Borrar Datos Seleccionados
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};