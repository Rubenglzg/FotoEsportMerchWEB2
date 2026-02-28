import React, { useState } from 'react';
import { Award, Mail, Download } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../../config/firebase'; 
import { Button } from '../../ui/Button';
import { generateCustomersExcel } from '../../../utils/excelExport'; 

export const MarketingTab = ({
    campaignConfig, setCampaignConfig,
    orders, clubs, showNotification
}) => {
    // --- ESTADOS PARA MAILING ---
    const [emailTarget, setEmailTarget] = useState('all');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
    const [clubSearch, setClubSearch] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailHtml, setEmailHtml] = useState('');

    // --- FUNCIONES DE MARKETING ---
    const handleDownloadCustomers = () => {
        if (!orders || orders.length === 0) {
            return showNotification("No hay pedidos para extraer clientes", "error");
        }
        generateCustomersExcel(orders, clubs);
        showNotification("Descargando base de datos de clientes...");
    };

    const handleSendMassEmail = async () => {
        if (!emailSubject.trim() || !emailHtml.trim()) {
            return showNotification("Debes introducir un asunto y el código HTML del correo", "error");
        }
        
        const recipients = orders.filter(o => {
            if (!o.customer || !o.customer.marketingConsent || !o.customer.email) return false;
            if (emailTarget !== 'all' && o.clubId !== emailTarget) return false;
            return true;
        });

        const uniqueEmails = [...new Set(recipients.map(o => o.customer.email.toLowerCase().trim()))];

        if (uniqueEmails.length === 0) {
            return showNotification("No hay clientes que acepten publicidad con estos filtros", "error");
        }

        if (!window.confirm(`¿Estás seguro de enviar este email a ${uniqueEmails.length} clientes?`)) return;

        setIsSendingEmail(true);
        try {
            const functions = getFunctions();
            const sendMassEmailFn = httpsCallable(functions, 'sendMassEmail');
            
            await sendMassEmailFn({
                emails: uniqueEmails,
                subject: emailSubject,
                html: emailHtml
            });
            
            showNotification(`¡Campaña encolada con éxito para ${uniqueEmails.length} clientes!`);
            
            setEmailSubject('');
            setEmailHtml('');
        } catch (error) {
            console.error("Error en el envío de campaña:", error);
            showNotification("Hubo un error al procesar el envío masivo.", "error");
        }
        setIsSendingEmail(false);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* PANEL DE CAMPAÑAS */}
            <div className="md:col-span-2 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 shadow-sm mb-6">
                <h3 className="font-bold text-lg text-purple-800 flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5"/> Campañas y Ofertas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-purple-600 uppercase block mb-1">Tipo Campaña</label>
                        <select 
                            className="w-full border border-purple-200 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-200"
                            value={campaignConfig?.type || 'none'}
                            onChange={async (e) => {
                                const newConfig = { ...campaignConfig, type: e.target.value };
                                await setDoc(doc(db, 'settings', 'campaigns'), newConfig);
                                setCampaignConfig(newConfig);
                            }}
                        >
                            <option value="none">Sin Campaña</option>
                            <option value="christmas">Navidad 🎄</option>
                            <option value="black_friday">Black Friday 🖤</option>
                            <option value="summer">Fin de Temporada ☀️</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-purple-600 uppercase block mb-1">% Descuento Global</label>
                        <input 
                            type="number" 
                            className="w-full border border-purple-200 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-200"
                            placeholder="0"
                            value={campaignConfig?.discount || 0}
                            onChange={async (e) => {
                                const newConfig = { ...campaignConfig, discount: parseInt(e.target.value) || 0 };
                                await setDoc(doc(db, 'settings', 'campaigns'), newConfig);
                                setCampaignConfig(newConfig);
                            }}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-purple-600 uppercase block mb-1">Mensaje Banner</label>
                        <div className="flex gap-2">
                            <input 
                                className="w-full border border-purple-200 rounded-lg p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-200"
                                placeholder="Ej: ¡Solo hoy! Precios locos."
                                value={campaignConfig?.bannerMessage || ''}
                                onChange={(e) => setCampaignConfig({ ...campaignConfig, bannerMessage: e.target.value })} 
                            />
                            <Button size="sm" onClick={async () => {
                                await setDoc(doc(db, 'settings', 'campaigns'), campaignConfig);
                                showNotification('Campaña guardada');
                            }}>Guardar</Button>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="campActive"
                        className="accent-purple-600 w-4 h-4 cursor-pointer"
                        checked={campaignConfig?.active || false}
                        onChange={async (e) => {
                            const newConfig = { ...campaignConfig, active: e.target.checked };
                            await setDoc(doc(db, 'settings', 'campaigns'), newConfig);
                            setCampaignConfig(newConfig);
                        }}
                    />
                    <label htmlFor="campActive" className="text-sm font-bold text-purple-700 cursor-pointer">Activar Campaña en la Web</label>
                </div>
            </div>

            {/* PANEL DE MARKETING Y BASE DE DATOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between p-6 border-b border-blue-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm border border-blue-100">
                            <Mail className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-blue-900 text-lg leading-tight">Campañas y Marketing</h3>
                            <p className="text-xs text-blue-600 font-medium mt-0.5">Envía correos masivos y exporta tu base de clientes</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleDownloadCustomers}
                        className="bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 font-bold py-2.5 px-5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                    >
                        <Download className="w-4 h-4"/> Descargar Excel de Clientes
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
                    <div className="space-y-6 flex flex-col">
                        <div>
                            <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-2">1. Seleccionar Destinatarios</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setEmailTarget('all')}
                                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${emailTarget === 'all' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                                >
                                    <span className={`block font-bold text-sm mb-0.5 ${emailTarget === 'all' ? 'text-blue-800' : 'text-gray-700'}`}>Todos los Clientes</span>
                                    <span className="text-[10px] text-gray-500 leading-tight block">Suscritos a publicidad</span>
                                    {emailTarget === 'all' && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-500 shadow"></div>}
                                </button>
                                
                                <div className="relative">
                                    <button 
                                        type="button"
                                        onClick={() => setIsClubDropdownOpen(!isClubDropdownOpen)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between relative overflow-hidden ${emailTarget !== 'all' && emailTarget !== '' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                                    >
                                        <div>
                                            <span className={`block font-bold text-sm mb-0.5 ${emailTarget !== 'all' && emailTarget !== '' ? 'text-blue-800' : 'text-gray-700'}`}>
                                                {emailTarget !== 'all' && emailTarget !== '' 
                                                    ? clubs.find(c => c.id === emailTarget)?.name || 'Club seleccionado' 
                                                    : 'Club Específico'}
                                            </span>
                                            <span className="text-[10px] text-gray-500 leading-tight block">
                                                {emailTarget !== 'all' && emailTarget !== '' ? 'Destinatarios filtrados' : 'Buscar y elegir...'}
                                            </span>
                                        </div>
                                        <div className="text-gray-400 text-xs mr-2 transition-transform duration-200" style={{ transform: isClubDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
                                        {emailTarget !== 'all' && emailTarget !== '' && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-blue-500 shadow"></div>}
                                    </button>

                                    {isClubDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsClubDropdownOpen(false)}></div>
                                            <div className="absolute z-50 top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
                                                <div className="p-2 border-b border-gray-100 bg-gray-50">
                                                    <input 
                                                        type="text" 
                                                        placeholder="🔍 Buscar club..." 
                                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700"
                                                        value={clubSearch}
                                                        onChange={(e) => setClubSearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                    {clubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).length === 0 ? (
                                                        <p className="text-xs text-gray-500 text-center py-4">No se encontraron clubes.</p>
                                                    ) : (
                                                        clubs.filter(c => c.name.toLowerCase().includes(clubSearch.toLowerCase())).map(c => (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${emailTarget === c.id ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                                                                onClick={() => {
                                                                    setEmailTarget(c.id);
                                                                    setIsClubDropdownOpen(false);
                                                                    setClubSearch('');
                                                                }}
                                                            >
                                                                {c.name}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-2">2. Asunto del Correo</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-gray-50 transition-all font-medium text-gray-800 placeholder-gray-400"
                                placeholder="Ej: ¡Nuevas ofertas de fin de temporada!"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 flex flex-col">
                            <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider block mb-2">3. Código HTML</label>
                            <textarea 
                                className="w-full flex-1 min-h-[220px] border border-gray-300 rounded-xl p-4 text-[13px] font-mono outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-[#1e1e1e] text-green-400 custom-scrollbar transition-all resize-y shadow-inner"
                                placeholder="<html>&#10;  <body>&#10;    <h1>Hola,</h1>&#10;    <p>Escribe aquí tu correo.</p>&#10;  </body>&#10;</html>"
                                value={emailHtml}
                                onChange={(e) => setEmailHtml(e.target.value)}
                                spellCheck="false"
                            ></textarea>
                            <p className="text-[10px] text-gray-400 mt-2 text-right">El código se renderizará automáticamente en la pantalla de la derecha.</p>
                        </div>

                        <button 
                            onClick={handleSendMassEmail}
                            disabled={isSendingEmail}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow border border-blue-700 hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            <Mail className="w-5 h-5"/> {isSendingEmail ? 'Procesando Envío...' : 'Confirmar y Enviar Campaña'}
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm border border-red-500/20"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm border border-yellow-500/20"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm border border-emerald-500/20"></div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded shadow-sm">Vista Previa</span>
                        </div>
                        
                        <div className="bg-white px-6 py-5 border-b border-gray-100 shadow-sm relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                    F
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 leading-tight">FotoEsport Merch</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">para cliente@email.com</p>
                                </div>
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mt-4 border-l-4 border-blue-500 pl-3 py-1">
                                {emailSubject || <span className="text-gray-300 font-normal italic">El asunto del correo aparecerá aquí...</span>}
                            </h4>
                        </div>

                        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto custom-scrollbar relative">
                            {emailHtml ? (
                                <div 
                                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-full"
                                    dangerouslySetInnerHTML={{ __html: emailHtml }} 
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-60">
                                    <Mail className="w-16 h-16"/>
                                    <p className="text-sm font-medium text-center max-w-[250px]">
                                        Escribe código HTML en el panel izquierdo para ver cómo lo recibirán tus clientes.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};