import React, { useState, useEffect } from 'react';
import { Banknote, Store, Calendar, BarChart3, X, FileDown, Mail, Save, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/Button';
import { DelayedInput } from '../ui/DelayedInput';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../config/firebase'; 
import { generateAgencyExcelData, downloadAgencyExcel } from '../../../utils/excelExport';

export const AccountingControlTab = ({
    clubs, seasons, filterClubId, setFilterClubId, financeSeasonId, setFinanceSeasonId,
    globalAccountingStats, accountingData, financialConfig,
    handlePaymentChange, updateBatchValue,
    orders, showNotification
}) => {
    const [accDetailsModal, setAccDetailsModal] = useState({ active: false, title: '', items: [], type: '' });

    // --- ESTADOS Y LÓGICA DE GESTORÍA ---
    // Variables guardadas realmente en base de datos
    const [savedConfig, setSavedConfig] = useState({ emails: "", autoDay: 1, autoTime: "08:00" });
    // Variables en edición (Borrador)
    const [draftConfig, setDraftConfig] = useState({ emails: "", autoDay: 1, autoTime: "08:00" });
    
    // Identificador visual de si hay cambios sin guardar
    const hasUnsavedChanges = JSON.stringify(savedConfig) !== JSON.stringify(draftConfig);

    const [isIndefiniteDates, setIsIndefiniteDates] = useState(false);
    const [agencyDates, setAgencyDates] = useState({ 
        start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0] 
    });
    
    // Ahora los clubes se manejan como un array para el selector múltiple
    const [agencyClub, setAgencyClub] = useState(['all']);
    
    const [isSendingAgency, setIsSendingAgency] = useState(false);
    const [isSavingEmails, setIsSavingEmails] = useState(false);
    const [lastAgencySend, setLastAgencySend] = useState(null);

    useEffect(() => {
        const fetchAgencyData = async () => {
            try {
                const settingsDoc = await getDoc(doc(db, 'settings', 'agency'));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    const config = {
                        emails: data.emails ? data.emails.join(', ') : "",
                        autoDay: data.autoDay || 1,
                        autoTime: data.autoTime || "08:00"
                    };
                    setSavedConfig(config);
                    setDraftConfig(config);
                }
                
                const logsDoc = await getDoc(doc(db, 'settings', 'agencyLogs'));
                if (logsDoc.exists()) {
                    const data = logsDoc.data();
                    setLastAgencySend({
                        date: data.lastSendDate,
                        status: data.status,
                        csvContent: data.lastCsvBase64 ? atob(data.lastCsvBase64) : null 
                    });
                }
            } catch (error) {
                console.error("Error cargando datos de gestoría:", error);
            }
        };
        fetchAgencyData();
    }, []);

    const handleSaveEmails = async () => {
        setIsSavingEmails(true);
        try {
            const emailArray = draftConfig.emails.split(',').map(e => e.trim()).filter(e => e);
            await setDoc(doc(db, 'settings', 'agency'), { 
                emails: emailArray,
                autoDay: parseInt(draftConfig.autoDay),
                autoTime: draftConfig.autoTime
            }, { merge: true });
            
            setSavedConfig(draftConfig); // Sincronizamos el estado de guardado
            if(showNotification) showNotification(`Guardado: Se enviará el día ${draftConfig.autoDay} a las ${draftConfig.autoTime}`);
        } catch (error) {
            if(showNotification) showNotification("Error al guardar la configuración", "error");
        } finally {
            setIsSavingEmails(false);
        }
    };

    const handleSendToAgency = async () => {
        setIsSendingAgency(true);
        try {
            if (!orders) throw new Error("Aún no se han cargado los pedidos.");
            
            // Definimos el rango real para el filtro de datos
            const actualStart = isIndefiniteDates ? "2000-01-01" : agencyDates.start;
            const actualEnd = isIndefiniteDates ? "2100-12-31" : agencyDates.end;
            
            const filteredOrders = agencyClub.includes('all') ? orders : orders.filter(o => agencyClub.includes(o.clubId));
            const { content, count } = await generateAgencyExcelData(filteredOrders, actualStart, actualEnd);
            
            if (count === 0) throw new Error("No hay pedidos para este rango.");

            const sendEmailFn = httpsCallable(functions, 'sendAgencyReportManual');
            await sendEmailFn({
                emails: savedConfig.emails.split(',').map(e => e.trim()),
                csvContent: content,
                // Enviamos una bandera clara si es indefinido
                isIndefinite: isIndefiniteDates, 
                startDate: agencyDates.start,
                endDate: agencyDates.end
            });

            if(showNotification) showNotification("¡Informe enviado a la gestoría correctamente!");
            setLastAgencySend({ date: new Date().toISOString(), status: 'Correcto (Manual)', csvContent: content });
            
        } catch (error) {
            if(showNotification) showNotification(error.message || "Error enviando informe", "error");
            console.error(error);
        } finally {
            setIsSendingAgency(false);
        }
    };
    
    const handleDownloadLocal = () => {
        if (!orders) return alert("Faltan los pedidos");
        const actualStart = isIndefiniteDates ? "2000-01-01" : agencyDates.start;
        const actualEnd = isIndefiniteDates ? "2100-12-31" : agencyDates.end;
        const filteredOrders = agencyClub.includes('all') ? orders : orders.filter(o => agencyClub.includes(o.clubId));
        downloadAgencyExcel(filteredOrders, actualStart, actualEnd);
    };

    // Función para manejar el checkbox de los clubes
    const toggleClubSelection = (clubId) => {
        if (clubId === 'all') {
            setAgencyClub(['all']);
            return;
        }
        let next = [...agencyClub].filter(id => id !== 'all');
        if (next.includes(clubId)) {
            next = next.filter(id => id !== clubId);
        } else {
            next.push(clubId);
        }
        setAgencyClub(next.length === 0 ? ['all'] : next);
    };

    // --- FIN LÓGICA DE GESTORÍA ---

    return (
        <div className="bg-white p-6 rounded-xl shadow space-y-8 animate-fade-in-up">
            {/* CABECERA Y FILTROS GENERALES */}
            <div className="flex justify-between items-center border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                        <Banknote className="w-8 h-8 text-emerald-600"/> 
                        Control de Contabilidad
                    </h2>
                    <p className="text-gray-500">Gestión de caja, pedidos especiales y lotes globales.</p>
                </div>
                
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                        <Store className="w-4 h-4 text-gray-500"/>
                        <select className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" value={filterClubId} onChange={(e) => setFilterClubId(e.target.value)}>
                            <option value="all">Todos los Clubes</option>
                            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-gray-500"/>
                        <select className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" value={financeSeasonId} onChange={(e) => setFinanceSeasonId(e.target.value)}>
                            <option value="all">Todas las Temporadas</option>
                            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* --- PANEL DE GESTORÍA --- */}
            <div className={`bg-white rounded-xl border p-5 shadow-sm transition-colors duration-300 ${hasUnsavedChanges ? 'border-orange-400 bg-orange-50/20' : 'border-blue-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileDown className="w-5 h-5"/></div>
                    <div>
                        <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Exportación para Gestoría</h4>
                        <p className="text-xs text-slate-500">Envío manual de facturación y configuración de automatización mensual</p>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 space-y-4">
                    {/* Fila 1: Filtros de Exportación (Múltiples Clubes y Fechas) */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Rango de Fechas (Manual)</label>
                                <div className="flex items-center gap-1.5">
                                    <input type="checkbox" id="indefiniteDates" checked={isIndefiniteDates} onChange={e => setIsIndefiniteDates(e.target.checked)} className="rounded text-blue-600 cursor-pointer"/>
                                    <label htmlFor="indefiniteDates" className="text-[10px] font-bold text-gray-600 cursor-pointer uppercase">Indefinido (Todo)</label>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input type="date" disabled={isIndefiniteDates} value={agencyDates.start} onChange={e => setAgencyDates({...agencyDates, start: e.target.value})} className="w-full text-sm border rounded-lg p-2 outline-none focus:border-blue-500 disabled:bg-gray-200 disabled:text-gray-400"/>
                                <input type="date" disabled={isIndefiniteDates} value={agencyDates.end} onChange={e => setAgencyDates({...agencyDates, end: e.target.value})} className="w-full text-sm border rounded-lg p-2 outline-none focus:border-blue-500 disabled:bg-gray-200 disabled:text-gray-400"/>
                            </div>
                        </div>

                        {/* SELECTOR MÚLTIPLE DE CLUBES (Checkbox List) */}
                        <div className="md:w-1/3">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Clubes a Exportar</label>
                            <div className="w-full border rounded-lg p-2 bg-white max-h-24 overflow-y-auto outline-none focus-within:border-blue-500 shadow-inner">
                                <label className="flex items-center gap-2 mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                    <input type="checkbox" checked={agencyClub.includes('all')} onChange={() => toggleClubSelection('all')} className="rounded text-blue-600"/>
                                    <span className="text-xs font-bold text-gray-700">Todos los Clubes</span>
                                </label>
                                {clubs && clubs.map(c => (
                                    <label key={c.id} className="flex items-center gap-2 mb-1 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <input type="checkbox" checked={agencyClub.includes(c.id)} onChange={() => toggleClubSelection(c.id)} className="rounded text-blue-600"/>
                                        <span className="text-xs text-gray-600">{c.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Fila 2: Configuración Automática */}
                    <div className="pt-3 border-t border-slate-200">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Configuración de Envío Automático Mensual</label>
                            {hasUnsavedChanges && <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 animate-pulse"><AlertCircle className="w-3 h-3"/> CAMBIOS SIN GUARDAR</span>}
                        </div>
                        <div className="flex gap-2">
                            {/* Selector de Día */}
                            <div className="w-24 relative" title="Día del mes">
                                <span className="absolute left-2.5 top-2 text-[10px] text-gray-400 font-bold uppercase">Día</span>
                                <input type="number" min="1" max="31" value={draftConfig.autoDay} onChange={e => setDraftConfig({...draftConfig, autoDay: e.target.value})} className={`w-full text-sm border rounded-lg p-2 pl-9 outline-none focus:border-blue-500 font-bold ${hasUnsavedChanges && draftConfig.autoDay !== savedConfig.autoDay ? 'bg-orange-50' : ''}`}/>
                            </div>
                            {/* Selector de Hora */}
                            <div className="w-32 relative" title="Hora de envío (España)">
                                <span className="absolute left-2.5 top-2 text-[10px] text-gray-400 font-bold uppercase">Hora</span>
                                <input type="time" value={draftConfig.autoTime} onChange={e => setDraftConfig({...draftConfig, autoTime: e.target.value})} className={`w-full text-sm border rounded-lg p-2 pl-12 outline-none focus:border-blue-500 font-bold ${hasUnsavedChanges && draftConfig.autoTime !== savedConfig.autoTime ? 'bg-orange-50' : ''}`}/>
                            </div>
                            {/* Correos */}
                            <input type="text" value={draftConfig.emails} onChange={e => setDraftConfig({...draftConfig, emails: e.target.value})} placeholder="Emails separados por comas..." className={`w-full text-sm border rounded-lg p-2 outline-none focus:border-blue-500 ${hasUnsavedChanges && draftConfig.emails !== savedConfig.emails ? 'bg-orange-50' : ''}`}/>
                            
                            {/* Botón de Guardar Dinámico */}
                            <button onClick={handleSaveEmails} disabled={!hasUnsavedChanges || isSavingEmails} title="Guardar configuración automática" className={`px-4 text-white rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 text-xs font-bold ${hasUnsavedChanges ? 'bg-orange-500 hover:bg-orange-600 shadow-md' : 'bg-slate-300 cursor-not-allowed'}`}>
                                <Save className="w-4 h-4"/> <span className="hidden sm:inline">Guardar</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col xl:flex-row justify-between items-center gap-4 border-t pt-4 border-slate-100">
                    <div className="flex gap-2 w-full xl:w-auto">
                        <button onClick={handleDownloadLocal} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 flex-1 xl:flex-none">
                            <FileDown className="w-4 h-4"/> Descargar Local
                        </button>
                        <button onClick={handleSendToAgency} disabled={isSendingAgency} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 flex-1 xl:flex-none">
                            <Mail className="w-4 h-4"/> {isSendingAgency ? 'Enviando...' : 'Enviar Manual Ahora'}
                        </button>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg flex items-center gap-3 w-full xl:w-auto">
                        <div className="text-right flex-1 min-w-max">
                            <p className="text-[10px] uppercase font-bold text-emerald-600">Último envío</p>
                            <p className="text-xs font-medium text-emerald-800">
                                {lastAgencySend ? `${new Date(lastAgencySend.date).toLocaleString()} - ${lastAgencySend.status}` : 'No hay registros'}
                            </p>
                        </div>
                        {lastAgencySend?.csvContent && (
                            <button onClick={() => {
                                const blob = new Blob([lastAgencySend.csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; 
                                // Usamos el estado para saber si fue automático o manual
                                a.download = `Ultima_Exportacion_Gestoria_${new Date(lastAgencySend.date).toLocaleDateString().replace(/\//g, '-')}.xlsx`; 
                                a.click();
                            }} className="bg-white p-1.5 rounded text-emerald-600 hover:bg-emerald-100 shadow-sm border border-emerald-200" title="Descargar último CSV enviado"><FileDown className="w-4 h-4"/></button>
                        )}
                        <div className="text-[10px] text-gray-500 ml-2 pl-3 border-l border-emerald-200 leading-tight hidden md:block">
                            ⚡ El sistema enviará a los correos indicados el <strong className="text-emerald-700">día {savedConfig.autoDay} a las {savedConfig.autoTime}</strong>.
                            {hasUnsavedChanges && <div className="text-orange-600 mt-0.5 font-bold">Tienes configuraciones sin guardar.</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TARJETAS DE RESUMEN --- */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
                
                <div className="md:col-span-1 bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><BarChart3 className="w-16 h-16"/></div>
                  <p className="text-xs font-bold text-emerald-700 uppercase z-10">Beneficio Neto Total</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 z-10">{globalAccountingStats.totalNetProfit.toFixed(2)}€</p>
                  <p className="text-[9px] text-emerald-600/70 z-10 mt-1 leading-tight">Ganancia limpia tras gastos.</p>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase">Banco / Tarjeta</p>
                  <p className="text-xl font-bold text-blue-600 mt-1">{globalAccountingStats.cardTotal.toFixed(2)}€</p>
                  <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>Pasarela:</span>
                          <span className="text-red-500 font-bold">-{globalAccountingStats.cardFees.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-blue-800">
                          <span>Neto Banco:</span>
                          <span>{(globalAccountingStats.cardTotal - globalAccountingStats.cardFees).toFixed(2)}€</span>
                      </div>
                  </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Caja Efectivo</p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded" 
                             onClick={() => setAccDetailsModal({ active: true, title: 'Efectivo YA Recogido', items: globalAccountingStats.cash.listCollected, type: 'success' })}>
                            <span className="text-gray-600">Recogido:</span>
                            <span className="font-bold text-green-600">{globalAccountingStats.cash.collected.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center text-xs cursor-pointer bg-red-50 p-1 rounded hover:bg-red-100 transition-colors"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Efectivo PENDIENTE de Recoger', items: globalAccountingStats.cash.listPending, type: 'error' })}>
                            <span className="text-red-800 font-bold">Pendiente:</span>
                            <span className="font-black text-red-600">{globalAccountingStats.cash.pending.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Pagos Proveedor</p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Proveedor PAGADO', items: globalAccountingStats.supplier.listPaid, type: 'success' })}>
                            <span className="text-gray-600">Pagado:</span>
                            <span className="font-bold text-green-600">{globalAccountingStats.supplier.paid.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center text-xs cursor-pointer bg-orange-50 p-1 rounded hover:bg-orange-100 transition-colors"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Proveedor PENDIENTE', items: globalAccountingStats.supplier.listPending, type: 'warning' })}>
                            <span className="text-orange-800 font-bold">Deuda:</span>
                            <span className="font-black text-orange-600">{globalAccountingStats.supplier.pending.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Com. Comercial</p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Comercial PAGADO', items: globalAccountingStats.commercial.listPaid, type: 'success' })}>
                            <span className="text-gray-600">Pagado:</span>
                            <span className="font-bold text-green-600">{globalAccountingStats.commercial.paid.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center text-xs cursor-pointer bg-blue-50 p-1 rounded hover:bg-blue-100 transition-colors"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Comercial PENDIENTE', items: globalAccountingStats.commercial.listPending, type: 'info' })}>
                            <span className="text-blue-800 font-bold">Deuda:</span>
                            <span className="font-black text-blue-600">{globalAccountingStats.commercial.pending.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Pagos a Clubes</p>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Club PAGADO', items: globalAccountingStats.club.listPaid, type: 'success' })}>
                            <span className="text-gray-600">Pagado:</span>
                            <span className="font-bold text-green-600">{globalAccountingStats.club.paid.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center text-xs cursor-pointer bg-purple-50 p-1 rounded hover:bg-purple-100 transition-colors"
                             onClick={() => setAccDetailsModal({ active: true, title: 'Club PENDIENTE', items: globalAccountingStats.club.listPending, type: 'purple' })}>
                            <span className="text-purple-800 font-bold">Deuda:</span>
                            <span className="font-black text-purple-600">{globalAccountingStats.club.pending.toFixed(2)}€</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLAS POR CLUB */}
            {accountingData.map(({ club, batches }) => {
                let totalPendingCash = 0; 
                let balanceProvider = 0; 
                let balanceCommercial = 0; 
                let balanceClub = 0;

                batches.forEach(batch => {
                    const log = club.accountingLog?.[batch.id] || {};
                    const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                    const isCommissionExempt = isErrorBatch;

                    const cashRevenue = batch.orders.filter(o => o.paymentMethod === 'cash').reduce((s,o)=>s+o.total,0);
                    const totalCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                    
                    const commissionableOrders = batch.orders.filter(o => o.paymentMethod !== 'incident' && o.paymentMethod !== 'gift' && o.type !== 'replacement');
                    const commRevenue = commissionableOrders.reduce((sum, o) => sum + o.total, 0);
                    const commCost = commissionableOrders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                    const commFees = commissionableOrders.reduce((sum, o) => {
                        if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                        return sum;
                    }, 0);

                    const clubRate = isCommissionExempt ? 0 : (club.commission || 0.12);
                    const commClub = commRevenue * clubRate;
                    const commBase = commRevenue - commCost - commClub - commFees;
                    const commComm = isCommissionExempt ? 0 : (commBase * financialConfig.commercialCommissionPct);

                    // --- INICIO NUEVO CÓDIGO ---
                    // Calculamos lo pendiente restando lo pagado al total actual
                    const pendingCash = log.cashCollected ? (cashRevenue - (log.cashCollectedAmount ?? cashRevenue)) : cashRevenue;
                    const pendingSupplier = log.supplierPaid ? (totalCost - (log.supplierPaidAmount ?? totalCost)) : totalCost;
                    const pendingCommercial = log.commercialPaid ? (commComm - (log.commercialPaidAmount ?? commComm)) : commComm;
                    const pendingClub = log.clubPaid ? (commClub - (log.clubPaidAmount ?? commClub)) : commClub;

                    totalPendingCash += pendingCash + (log.cashUnder||0) - (log.cashOver||0);
                    balanceProvider += pendingSupplier + (log.supplierUnder||0) - (log.supplierOver||0);
                    balanceCommercial += pendingCommercial + (log.commercialUnder||0) - (log.commercialOver||0);
                    balanceClub += pendingClub + (log.clubUnder||0) - (log.clubOver||0);
                    // --- FIN NUEVO CÓDIGO ---
                });

                const renderBalance = (amount, labelPositive, labelNegative) => {
                    if (isNaN(amount) || Math.abs(amount) < 0.01) return <span className="text-green-600 font-bold">Al día (0.00€)</span>;
                    if (amount > 0) return <span className="text-red-600 font-bold">{labelPositive} {amount.toFixed(2)}€</span>; 
                    return <span className="text-blue-600 font-bold">{labelNegative} {Math.abs(amount).toFixed(2)}€</span>; 
                };

                return (
                    <div key={club.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-8">
                        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                                    {club.code?.slice(0,2)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{club.name}</h3>
                                    <p className="text-xs text-gray-400">{batches.length} Bloques de Pedidos</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 border-b border-gray-200">
                            <div className="bg-white p-4 text-center">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Caja Efectivo</p>
                                <p className="text-xl">{renderBalance(totalPendingCash, 'Faltan', 'Sobra')}</p>
                            </div>
                            <div className="bg-white p-4 text-center border-l border-gray-100">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Proveedor</p>
                                <p className="text-xl">{renderBalance(balanceProvider, 'Debemos', 'A favor')}</p>
                            </div>
                            <div className="bg-white p-4 text-center border-l border-gray-100">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Comercial</p>
                                <p className="text-xl">{renderBalance(balanceCommercial, 'Debemos', 'A favor')}</p>
                            </div>
                            <div className="bg-white p-4 text-center border-l border-gray-100">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Club</p>
                                <p className="text-xl">{renderBalance(balanceClub, 'Debemos', 'A favor')}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-4 py-3 min-w-[120px]">Lote</th>
                                        <th className="px-4 py-3 text-right bg-blue-50/30">Banco / Tarjeta (Neto)</th>
                                        <th className="px-4 py-3 text-right bg-orange-50/30">Efectivo</th>
                                        <th className="px-4 py-3 text-center bg-orange-50/30 min-w-[160px]">Control Caja</th>
                                        <th className="px-4 py-3 min-w-[160px]">Pago Proveedor</th>
                                        <th className="px-4 py-3 min-w-[160px]">Pago Comercial</th>
                                        <th className="px-4 py-3 min-w-[160px]">Pago Club</th>
                                        <th className="px-4 py-3 min-w-[120px] text-right bg-emerald-50 text-emerald-800">Beneficio Neto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {batches.map(batch => {
                                        const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                                        const isCommissionExempt = isErrorBatch; 

                                        const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
                                        const nonCashOrders = batch.orders.filter(o => o.paymentMethod !== 'cash');
                                        
                                        const revenueCash = cashOrders.reduce((sum, o) => sum + o.total, 0);
                                        const revenueNonCash = nonCashOrders.reduce((sum, o) => sum + o.total, 0); 
                                        const totalBatchRevenue = revenueCash + revenueNonCash;

                                        const totalCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                                        const totalFees = batch.orders.reduce((sum, o) => {
                                            if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                                            return sum;
                                        }, 0);

                                        const commissionableOrders = batch.orders.filter(o => o.paymentMethod !== 'incident' && o.paymentMethod !== 'gift' && o.type !== 'replacement');
                                        const commRevenue = commissionableOrders.reduce((sum, o) => sum + o.total, 0);
                                        const commCost = commissionableOrders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                                        const commFees = commissionableOrders.reduce((sum, o) => {
                                            if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                                            return sum;
                                        }, 0);

                                        const clubRate = isCommissionExempt ? 0 : (club.commission || 0.12);
                                        const commClub = commRevenue * clubRate;
                                        const commBase = commRevenue - commCost - commClub - commFees;
                                        const commComm = isCommissionExempt ? 0 : (commBase * financialConfig.commercialCommissionPct);

                                        const netProfit = totalBatchRevenue - totalCost - commClub - commComm - totalFees;
                                        const status = club.accountingLog?.[batch.id] || {};

                                        return (
                                            <tr key={batch.id} className={`align-top hover:bg-gray-50 transition-colors`}>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold px-2 py-1 rounded w-fit ${isErrorBatch ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {isErrorBatch ? `Lote Errores #${batch.id.split('-')[1]}` : batch.id === 'INDIVIDUAL' ? 'Individual' : batch.id === 'SPECIAL' ? 'Especial' : `Lote #${batch.id}`}
                                                        </span>
                                                        {isCommissionExempt && <span className="text-[9px] font-bold text-orange-500 mt-1 uppercase">Sin Comisión</span>}
                                                        <span className="text-[10px] text-gray-400 mt-1">{batch.orders.length} pedidos</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right bg-blue-50/30">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-mono font-bold text-blue-700">{(revenueNonCash - totalFees).toFixed(2)}€</span>
                                                        <span className="text-[9px] text-gray-400">Bruto: {revenueNonCash.toFixed(2)}€</span>
                                                        {totalFees > 0 && <span className="text-[9px] text-red-400">(-{totalFees.toFixed(2)}€ fees)</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right bg-orange-50/30"><span className="font-mono font-bold text-orange-700">{revenueCash.toFixed(2)}€</span></td>
                                                
                                                <td className="px-4 py-4 bg-orange-50/30">
                                                    {revenueCash > 0 ? (
                                                        <div className="flex flex-col items-center">
                                                            {(() => {
                                                                const savedCash = status.cashCollectedAmount ?? (status.cashCollected ? revenueCash : 0);
                                                                const pendingCash = status.cashCollected ? (revenueCash - savedCash) : revenueCash;
                                                                const isPartialCash = status.cashCollected && pendingCash > 0.01;

                                                                if (isPartialCash) {
                                                                    return (
                                                                        <div className="flex flex-col gap-1 w-full">
                                                                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded w-full text-center">
                                                                                YA RECOGIDO: {savedCash.toFixed(2)}€
                                                                            </span>
                                                                            <button 
                                                                                onClick={() => handlePaymentChange(club, batch.id, 'cashCollected', status.cashCollected, revenueCash)} 
                                                                                className="w-full px-1 py-1 rounded text-[9px] font-bold border shadow-sm transition-all bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                                                            >
                                                                                NUEVOS: {pendingCash.toFixed(2)}€
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <button 
                                                                        onClick={() => handlePaymentChange(club, batch.id, 'cashCollected', status.cashCollected, revenueCash)} 
                                                                        className={`w-full px-2 py-1.5 rounded text-[10px] font-bold border shadow-sm transition-all ${status.cashCollected ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' : 'bg-white text-orange-600 border-orange-200 hover:border-orange-400 animate-pulse'}`}
                                                                    >
                                                                        {status.cashCollected ? 'RECOGIDO' : 'PENDIENTE'}
                                                                    </button>
                                                                );
                                                            })()}
                                                            {status.cashCollected && status.cashCollectedDate && (
                                                                <span className="text-[12px] text-emerald-600 mt-1 font-mono font-bold">
                                                                    {new Date(status.cashCollectedDate).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : <div className="text-center text-xs text-gray-300">-</div>}
                                                    
                                                    <div className="flex gap-2 mt-2">
                                                        <div className="flex-1">
                                                            <label className="text-[9px] text-gray-400 block mb-0.5">De más</label>
                                                            <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.cashOver} onSave={(val) => updateBatchValue(club, batch.id, 'cashOver', val)}/>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[9px] text-gray-400 block mb-0.5">De menos</label>
                                                            <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.cashUnder} onSave={(val) => updateBatchValue(club, batch.id, 'cashUnder', val)}/>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col mb-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs text-red-500 font-bold">-{totalCost.toFixed(2)}€</span>
                                                            {(() => {
                                                                const savedSupplier = status.supplierPaidAmount ?? (status.supplierPaid ? totalCost : 0);
                                                                const pendingSupplier = status.supplierPaid ? (totalCost - savedSupplier) : totalCost;
                                                                const isPartialSupplier = status.supplierPaid && pendingSupplier > 0.01;

                                                                if (isPartialSupplier) {
                                                                    return (
                                                                        <div className="flex flex-col items-end gap-1">
                                                                            <span className="text-[9px] font-bold text-green-700 bg-green-100 px-1 py-0.5 rounded">
                                                                                YA PAGADO: {savedSupplier.toFixed(2)}€
                                                                            </span>
                                                                            <button 
                                                                                onClick={() => handlePaymentChange(club, batch.id, 'supplierPaid', status.supplierPaid, totalCost)} 
                                                                                className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                                                            >
                                                                                PENDIENTE: {pendingSupplier.toFixed(2)}€
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <button 
                                                                        onClick={() => handlePaymentChange(club, batch.id, 'supplierPaid', status.supplierPaid, totalCost)} 
                                                                        className={`text-[10px] px-2 py-0.5 rounded border font-bold ${status.supplierPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                                    >
                                                                        {status.supplierPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                    </button>
                                                                );
                                                            })()}
                                                        </div>
                                                        {status.supplierPaid && status.supplierPaidDate && (
                                                            <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                {new Date(status.supplierPaidDate).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 mt-2">
                                                        <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.supplierOver} onSave={(val) => updateBatchValue(club, batch.id, 'supplierOver', val)}/></div>
                                                        <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.supplierUnder} onSave={(val) => updateBatchValue(club, batch.id, 'supplierUnder', val)}/></div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    {isCommissionExempt ? <div className="text-center text-gray-300 text-xs">-</div> : (
                                                        <>
                                                            <div className="flex flex-col mb-1">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-xs text-blue-500 font-bold">+{commComm.toFixed(2)}€</span>
                                                                    {(() => {
                                                                        const savedComm = status.commercialPaidAmount ?? (status.commercialPaid ? commComm : 0);
                                                                        const pendingComm = status.commercialPaid ? (commComm - savedComm) : commComm;
                                                                        const isPartialComm = status.commercialPaid && pendingComm > 0.01;

                                                                        if (isPartialComm) {
                                                                            return (
                                                                                <div className="flex flex-col items-end gap-1">
                                                                                    <span className="text-[9px] font-bold text-green-700 bg-green-100 px-1 py-0.5 rounded">
                                                                                        YA PAGADO: {savedComm.toFixed(2)}€
                                                                                    </span>
                                                                                    <button 
                                                                                        onClick={() => handlePaymentChange(club, batch.id, 'commercialPaid', status.commercialPaid, commComm)} 
                                                                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                                                                    >
                                                                                        PENDIENTE: {pendingComm.toFixed(2)}€
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <button 
                                                                                onClick={() => handlePaymentChange(club, batch.id, 'commercialPaid', status.commercialPaid, commComm)} 
                                                                                className={`text-[10px] px-2 py-0.5 rounded border font-bold ${status.commercialPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                                            >
                                                                                {status.commercialPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                            </button>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                {status.commercialPaid && status.commercialPaidDate && (
                                                                    <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                        {new Date(status.commercialPaidDate).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.commercialOver} onSave={(val) => updateBatchValue(club, batch.id, 'commercialOver', val)}/></div>
                                                                <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.commercialUnder} onSave={(val) => updateBatchValue(club, batch.id, 'commercialUnder', val)}/></div>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>

                                                <td className="px-4 py-4">
                                                    {isCommissionExempt ? <div className="text-center text-gray-300 text-xs">-</div> : (
                                                        <>
                                                            <div className="flex flex-col mb-1">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-xs text-purple-500 font-bold">-{commClub.toFixed(2)}€</span>
                                                                    {(() => {
                                                                        const savedClub = status.clubPaidAmount ?? (status.clubPaid ? commClub : 0);
                                                                        const pendingClub = status.clubPaid ? (commClub - savedClub) : commClub;
                                                                        const isPartialClub = status.clubPaid && pendingClub > 0.01;

                                                                        if (isPartialClub) {
                                                                            return (
                                                                                <div className="flex flex-col items-end gap-1">
                                                                                    <span className="text-[9px] font-bold text-green-700 bg-green-100 px-1 py-0.5 rounded">
                                                                                        YA PAGADO: {savedClub.toFixed(2)}€
                                                                                    </span>
                                                                                    <button 
                                                                                        onClick={() => handlePaymentChange(club, batch.id, 'clubPaid', status.clubPaid, commClub)} 
                                                                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                                                                    >
                                                                                        PENDIENTE: {pendingClub.toFixed(2)}€
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <button 
                                                                                onClick={() => handlePaymentChange(club, batch.id, 'clubPaid', status.clubPaid, commClub)} 
                                                                                className={`text-[10px] px-2 py-0.5 rounded border font-bold ${status.clubPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                                            >
                                                                                {status.clubPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                            </button>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                {status.clubPaid && status.clubPaidDate && (
                                                                    <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                        {new Date(status.clubPaidDate).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2 mt-2">
                                                                <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.clubOver} onSave={(val) => updateBatchValue(club, batch.id, 'clubOver', val)}/></div>
                                                                <div className="flex-1"><DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.clubUnder} onSave={(val) => updateBatchValue(club, batch.id, 'clubUnder', val)}/></div>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>

                                                <td className="px-4 py-4 text-right font-black text-emerald-600 bg-emerald-50/30 border-l border-emerald-100">
                                                    {netProfit.toFixed(2)}€
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}

            {/* MODAL DE DETALLES CONTABLES */}
            {accDetailsModal.active && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${
                            accDetailsModal.type === 'error' ? 'bg-red-50 border-red-100' :
                            accDetailsModal.type === 'success' ? 'bg-green-50 border-green-100' :
                            accDetailsModal.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                            'bg-blue-50 border-blue-100'
                        }`}>
                            <h3 className="font-bold text-lg text-gray-800">{accDetailsModal.title}</h3>
                            <button onClick={() => setAccDetailsModal({ ...accDetailsModal, active: false })}><X className="w-5 h-5 text-gray-500"/></button>
                        </div>
                        
                        <div className="p-0 max-h-[60vh] overflow-y-auto">
                            {accDetailsModal.items.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">No hay registros.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Club</th>
                                            <th className="px-4 py-3 text-center">Lote</th>
                                            <th className="px-4 py-3 text-right">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {accDetailsModal.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-700">{item.club}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                                                        #{item.batch}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold">
                                                    {item.amount.toFixed(2)}€
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t">
                                        <tr>
                                            <td className="px-4 py-3" colSpan="2">TOTAL</td>
                                            <td className="px-4 py-3 text-right">
                                                {accDetailsModal.items.reduce((acc, i) => acc + i.amount, 0).toFixed(2)}€
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                        
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <Button variant="secondary" onClick={() => setAccDetailsModal({ ...accDetailsModal, active: false })}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};