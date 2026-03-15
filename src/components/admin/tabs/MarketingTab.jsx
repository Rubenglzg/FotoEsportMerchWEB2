import React, { useState, useEffect } from 'react';
import { Award, Mail, Download, UserX, CheckCircle } from 'lucide-react';
import { doc, setDoc, collection, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../../config/firebase'; 
import { Button } from '../../ui/Button';
import { generateCustomersExcel } from '../../../utils/excelExport'; 

export const MarketingTab = ({
    campaignConfig, setCampaignConfig,
    orders, clubs, products, showNotification, setConfirmation // <-- Añadido "products"
}) => {
    // --- ESTADOS PARA MAILING ---
    const [emailTarget, setEmailTarget] = useState('all');
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
    const [clubSearch, setClubSearch] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailHtml, setEmailHtml] = useState('');

    // --- ESTADOS PARA RGPD (DERECHO AL OLVIDO) ---
    const [deletionRequests, setDeletionRequests] = useState([]);

    useEffect(() => {
        // Usamos onSnapshot para recibir las peticiones en TIEMPO REAL
        const unsubscribe = onSnapshot(collection(db, 'right_to_forget'), (snapshot) => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordenar más recientes primero
            requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setDeletionRequests(requests);
        }, (error) => {
            console.error("Error cargando solicitudes RGPD:", error);
        });

        // Limpiar el escuchador cuando se cierre la pestaña
        return () => unsubscribe();
    }, []);

    const handleConfirmDeletion = (request) => {
        setConfirmation({
            title: 'Confirmar Borrado (RGPD)',
            // AÑADIDO el nombre del jugador al mensaje de confirmación
            msg: `¿Estás seguro de que quieres eliminar definitivamente los datos de ${request.email} (Jugador/a: ${request.playerName || 'No especificado'})?\n\nEl cliente recibirá un email automático confirmando la eliminación de su información y el borrado es irreversible.`,
            onConfirm: async () => {
                try {
                    await updateDoc(doc(db, 'right_to_forget', request.id), {
                        status: 'completed',
                        completedAt: new Date().toISOString()
                    });

                    // AÑADIDO el nombre del jugador a la plantilla del email
                    const htmlEmail = `
                        <div style="font-family: sans-serif; padding: 30px; background-color: #f9fafb; border-radius: 8px;">
                            <div style="background-color: white; padding: 20px; border-radius: 8px; border-top: 4px solid #10B981; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #065f46; margin-top: 0;">Confirmación de Borrado de Datos (RGPD)</h2>
                                <p style="color: #374151; font-size: 16px;">Hola,</p>
                                <p style="color: #374151; font-size: 16px;">Te confirmamos que hemos procesado correctamente tu solicitud de "Derecho al Olvido".</p>
                                <p style="color: #374151; font-size: 16px;">Todos tus datos personales, fotografías e información asociada a tu DNI (<strong>${request.dni}</strong>), correo electrónico (<strong>${request.email}</strong>) y al jugador/a <strong>${request.playerName || 'solicitado'}</strong> han sido eliminados de forma definitiva y permanente de nuestras bases de datos y servidores de almacenamiento.</p>
                                <p style="color: #374151; font-size: 16px;">Cumpliendo con la normativa vigente de Protección de Datos (RGPD), ya no conservamos ningún registro tuyo en nuestro sistema activo.</p>
                                <br>
                                <p style="color: #6b7280; font-size: 14px;">Un saludo,<br>El equipo de FotoEsport Merch.</p>
                            </div>
                        </div>
                    `;

                    const functions = getFunctions();
                    const sendMassEmailFn = httpsCallable(functions, 'sendMassEmail');
                    
                    await sendMassEmailFn({
                        emails: [request.email],
                        subject: 'Confirmación de eliminación de datos (RGPD) - FotoEsport',
                        html: htmlEmail
                    });

                    // Actualizamos la vista local
                    setDeletionRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'completed', completedAt: new Date().toISOString() } : r));

                    showNotification("Datos borrados y usuario notificado con éxito.");
                } catch (error) {
                    console.error("Error al confirmar borrado:", error);
                    showNotification("Error al procesar la solicitud", "error");
                }
            }
        });
    };

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

        // Usamos el modal personalizado
        setConfirmation({
            title: 'Confirmar Envío de Campaña',
            msg: `Vas a enviar este correo electrónico masivo a ${uniqueEmails.length} clientes suscritos.\n\n¿Estás seguro de que deseas continuar?`,
            onConfirm: async () => {
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
            }
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* PANEL DE CAMPAÑAS PRO */}
            <div className="md:col-span-2 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 shadow-sm mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-purple-100 pb-4">
                    <h3 className="font-bold text-lg text-purple-800 flex items-center gap-2">
                        <Award className="w-6 h-6"/> Gestión de Campañas y Novedades
                    </h3>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-purple-200 shadow-sm hover:shadow transition-all">
                        <input 
                            type="checkbox" 
                            id="campActive"
                            className="accent-purple-600 w-5 h-5 cursor-pointer"
                            checked={campaignConfig?.active || false}
                            onChange={(e) => setCampaignConfig({ ...campaignConfig, active: e.target.checked })}
                        />
                        <label htmlFor="campActive" className="text-sm font-black text-purple-700 cursor-pointer uppercase tracking-wide">Activar en la Web</label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-4">
                    {/* 1. TEMA Y MENSAJE */}
                    <div>
                        <label className="text-[10px] font-bold text-purple-600 uppercase block mb-1">Tema Visual</label>
                        <select 
                            className="w-full border border-purple-200 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-400"
                            value={campaignConfig?.type || 'none'}
                            onChange={(e) => setCampaignConfig({ ...campaignConfig, type: e.target.value })}
                        >
                            <option value="none">Estándar (Verde)</option>
                            <option value="christmas">Navidad 🎄</option>
                            <option value="black_friday">Black Friday 🖤</option>
                            <option value="summer">Verano / Fin Temporada ☀️</option>
                        </select>
                    </div>
                    <div className="lg:col-span-3">
                        <label className="text-[10px] font-bold text-purple-600 uppercase block mb-1">Mensaje del Banner</label>
                        <input 
                            className="w-full border border-purple-200 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-400"
                            placeholder="Ej: ¡Próximamente nuevas equipaciones!"
                            value={campaignConfig?.bannerMessage || ''}
                            onChange={(e) => setCampaignConfig({ ...campaignConfig, bannerMessage: e.target.value })} 
                        />
                    </div>

                    {/* 2. PROGRAMACIÓN AUTOMÁTICA */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex flex-col gap-3">
                        <h4 className="text-[10px] font-bold text-purple-600 uppercase border-b border-purple-50 pb-1">2. Programación de Tiempos</h4>
                        
                        {/* Fecha de Inicio */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <input 
                                    type="checkbox" id="startActive" className="accent-purple-600 w-4 h-4"
                                    checked={campaignConfig?.scheduleStartActive || false}
                                    onChange={(e) => setCampaignConfig({ ...campaignConfig, scheduleStartActive: e.target.checked })}
                                />
                                <label htmlFor="startActive" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">Programar Inicio (Empieza en...)</label>
                            </div>
                            {campaignConfig?.scheduleStartActive && (
                                <input 
                                    type="datetime-local" 
                                    className="w-full border border-purple-200 rounded p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                                    value={campaignConfig?.startDate || ''}
                                    onChange={(e) => setCampaignConfig({ ...campaignConfig, startDate: e.target.value })}
                                />
                            )}
                        </div>

                        {/* Fecha de Fin */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <input 
                                    type="checkbox" id="endActive" className="accent-purple-600 w-4 h-4"
                                    checked={campaignConfig?.scheduleEndActive || false}
                                    onChange={(e) => setCampaignConfig({ ...campaignConfig, scheduleEndActive: e.target.checked })}
                                />
                                <label htmlFor="endActive" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">Programar Fin (Termina en...)</label>
                            </div>
                            {campaignConfig?.scheduleEndActive && (
                                <input 
                                    type="datetime-local" 
                                    className="w-full border border-purple-200 rounded p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-purple-400 font-mono"
                                    value={campaignConfig?.endDate || ''}
                                    onChange={(e) => setCampaignConfig({ ...campaignConfig, endDate: e.target.value })}
                                />
                            )}
                        </div>
                    </div>

                    {/* 3. TIPO DE OFERTA */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                        <label className="text-[10px] font-bold text-purple-600 uppercase block mb-1">Lógica de Promoción</label>
                        <select 
                            className="w-full border border-purple-200 rounded-lg p-2 text-sm bg-gray-50 mb-3 outline-none focus:ring-2 focus:ring-purple-400 font-bold text-gray-700"
                            value={campaignConfig?.promoMode || 'none'}
                            onChange={(e) => setCampaignConfig({ ...campaignConfig, promoMode: e.target.value, targetProducts: [] })}
                        >
                            <option value="none">Solo Anuncio (Sin afectar precios)</option>
                            <option value="global">Descuento Global a toda la tienda</option>
                            <option value="specific">Descuento en Productos Específicos</option>
                            <option value="free_mods">Modificaciones Gratis (Dorsal/Nombre)</option>
                        </select>
                        
                        {(campaignConfig?.promoMode === 'global' || campaignConfig?.promoMode === 'specific') && (
                            <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100 w-fit">
                                <span className="text-xs font-bold text-purple-800">Descuento:</span>
                                <input 
                                    type="number" className="w-16 border border-purple-200 rounded p-1 text-sm text-center outline-none focus:ring-2 focus:ring-purple-400 font-bold"
                                    value={campaignConfig?.discount || 0}
                                    onChange={(e) => setCampaignConfig({ ...campaignConfig, discount: parseInt(e.target.value) || 0 })}
                                />
                                <span className="text-xs font-black text-purple-800">%</span>
                            </div>
                        )}
                    </div>

                    {/* 4. SELECTOR DE PRODUCTOS ESPECÍFICOS */}
                    {campaignConfig?.promoMode === 'specific' && (
                        <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-purple-200 shadow-inner">
                            <label className="text-[10px] font-bold text-purple-600 uppercase block mb-3">Selecciona los productos afectados por el descuento:</label>
                            {(!products || products.length === 0) ? (
                                <p className="text-xs text-red-500 font-bold">⚠️ Falta la propiedad 'products'. Asegúrate de añadirla en AdminDashboard.jsx.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                    {products.map(p => {
                                        const isSelected = campaignConfig?.targetProducts?.includes(p.id);
                                        return (
                                            <label key={p.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${isSelected ? 'bg-purple-100 border-purple-400 shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                                <input 
                                                    type="checkbox" className="accent-purple-600 w-4 h-4"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const current = campaignConfig?.targetProducts || [];
                                                        const next = e.target.checked 
                                                            ? [...current, p.id] 
                                                            : current.filter(id => id !== p.id);
                                                        setCampaignConfig({ ...campaignConfig, targetProducts: next });
                                                    }}
                                                />
                                                <span className={`truncate ${isSelected ? 'font-bold text-purple-900' : 'text-gray-700'}`} title={p.name}>{p.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end border-t border-purple-200 pt-4 mt-2">
                    <Button onClick={async () => {
                        await setDoc(doc(db, 'settings', 'campaigns'), campaignConfig);
                        showNotification('Configuración de Campaña Guardada', 'success');
                    }} className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200">
                        Guardar Configuración de Campaña
                    </Button>
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
            {/* PANEL DE SOLICITUDES DE DERECHO AL OLVIDO (RGPD) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-red-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl text-red-600 shadow-sm border border-red-100">
                            <UserX className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-red-900 text-lg leading-tight">Gestión de RGPD y Privacidad</h3>
                            <p className="text-xs text-red-600 font-medium mt-0.5">Historial de clientes que han solicitado el Derecho al Olvido</p>
                        </div>
                    </div>
                </div>
                
                <div className="p-0 overflow-x-auto">
                    {deletionRequests.length === 0 ? (
                        <div className="p-8 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <CheckCircle className="w-12 h-12 text-emerald-100"/>
                            <p className="text-sm font-medium">No hay ninguna solicitud pendiente de borrado.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="p-4 font-bold">Fecha Solicitud</th>
                                    <th className="p-4 font-bold">Email</th>
                                    <th className="p-4 font-bold">Jugador/a</th>
                                    <th className="p-4 font-bold">DNI / Tutor</th>
                                    <th className="p-4 font-bold">Motivo</th>
                                    <th className="p-4 font-bold text-center">Estado</th>
                                    <th className="p-4 font-bold text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {deletionRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-600">
                                            {new Date(req.createdAt).toLocaleDateString()} a las {new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">{req.email}</td>
                                        {/* AÑADIDO: Celda del nombre del jugador */}
                                        <td className="p-4 font-medium text-blue-800 bg-blue-50/30">
                                            {req.playerName || <span className="italic text-gray-400">No especificado</span>}
                                        </td>
                                        <td className="p-4 text-gray-600 font-mono">{req.dni}</td>
                                        <td className="p-4 text-gray-500 text-xs max-w-xs truncate" title={req.reason}>{req.reason || <span className="italic text-gray-400">Sin motivo</span>}</td>
                                        <td className="p-4 text-center">
                                            {req.status === 'completed' ? (
                                                <span className="inline-block bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border border-emerald-200">
                                                    COMPLETADO
                                                </span>
                                            ) : (
                                                <span className="inline-block bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border border-yellow-200 animate-pulse">
                                                    PENDIENTE
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {req.status !== 'completed' ? (
                                                <button 
                                                    onClick={() => handleConfirmDeletion(req)}
                                                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 font-bold py-1.5 px-3 rounded text-xs transition-colors shadow-sm"
                                                >
                                                    Confirmar Borrado
                                                </button>
                                            ) : (
                                                <span className="text-xs text-emerald-600 font-medium flex items-center justify-end gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5"/> Notificado
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};