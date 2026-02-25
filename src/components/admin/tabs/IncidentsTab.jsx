import React, { useState } from 'react';
import { AlertTriangle, Check, FileText, Package, User, History, Info, MessageCircle, Gift, XCircle, RefreshCw, CreditCard, Send, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { doc, updateDoc, addDoc, collection, arrayUnion } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { appId } from '../../../config/constants';
import { Button } from '../../ui/Button';

export const IncidentsTab = ({ incidents, orders = [], clubs = [], products = [] }) => {
    const [resolutionData, setResolutionData] = useState({});
    const [chatInput, setChatInput] = useState({});
    const [expandedId, setExpandedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    // NUEVO ESTADO: Controla el modal de confirmación web para reabrir
    const [reopenModal, setReopenModal] = useState({ isOpen: false, ticket: null });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const toggleExpand = (id) => {
        setExpandedId(prevId => prevId === id ? null : id);
    };

    const handleSendMessage = async (ticket) => {
        const text = chatInput[ticket.id];
        if (!text || text.trim() === '') return;

        const newMessage = {
            sender: 'admin',
            text: text,
            date: new Date().toISOString()
        };

        try {
            await updateDoc(doc(db, 'incidents', ticket.id), {
                messages: arrayUnion(newMessage),
                status: 'waiting_customer', 
                lastUpdate: new Date().toISOString()
            });

            await addDoc(collection(db, 'mail'), {
                to: [ticket.userEmail],
                message: {
                    subject: `Nuevo mensaje sobre tu incidencia: Pedido #${ticket.orderId}`,
                    html: `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #f8fafc; padding: 20px; border-bottom: 1px solid #eee;">
                                <h3 style="margin: 0; color: #0f172a;">Actualización de Incidencia</h3>
                                <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b;">Pedido #${ticket.orderId}</p>
                            </div>
                            <div style="padding: 20px;">
                                <p style="font-size: 14px; color: #475569; margin-bottom: 5px;"><strong>El equipo de soporte dice:</strong></p>
                                <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-style: italic; color: #1e293b; margin-bottom: 25px;">
                                    "${text}"
                                </div>
                                <p style="font-size: 15px; margin-bottom: 20px;">Para continuar la conversación y responder a este mensaje, por favor accede a tu incidencia a través de nuestra web:</p>
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <a href="${window.location.origin}" style="display: inline-block; background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">Ir a mi Incidencia</a>
                                </div>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                                    ⚠️ <strong>Por favor, no respondas directamente a este correo.</strong> Las respuestas a esta dirección de email no son supervisadas. Usa el botón superior.
                                </p>
                            </div>
                        </div>
                    `
                }
            });

            setChatInput({ ...chatInput, [ticket.id]: '' });
            showToast("Mensaje enviado al cliente correctamente.", "success");
        } catch (error) {
            console.error("Error enviando mensaje:", error);
            showToast("Hubo un error al enviar el mensaje.", "error");
        }
    };

    // Función modificada: Ya no usa window.confirm
    const executeReopenCase = async (ticket) => {
        try {
            const reopenLog = {
                sender: 'admin',
                text: `[SISTEMA] Incidencia reabierta por el equipo de soporte.`,
                date: new Date().toISOString()
            };

            await updateDoc(doc(db, 'incidents', ticket.id), {
                status: 'open',
                messages: arrayUnion(reopenLog),
                lastUpdate: new Date().toISOString()
            });

            await addDoc(collection(db, 'mail'), {
                to: [ticket.userEmail],
                message: {
                    subject: `Tu incidencia ha sido REABIERTA: Pedido #${ticket.orderId}`,
                    html: `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #fefce8; padding: 20px; border-bottom: 1px solid #fef08a;">
                                <h3 style="margin: 0; color: #a16207;">🔄 Tu incidencia ha sido reabierta</h3>
                                <p style="margin: 5px 0 0 0; font-size: 14px; color: #854d0e;">Pedido #${ticket.orderId}</p>
                            </div>
                            <div style="padding: 20px;">
                                <p style="font-size: 14px; color: #475569; margin-bottom: 15px;">
                                    El equipo de soporte ha reabierto tu incidencia para seguir revisando el caso o solicitarte más información.
                                </p>
                                <p style="font-size: 14px; color: #475569; margin-bottom: 25px;">
                                    Puedes entrar a tu panel para ver las novedades o enviarnos un nuevo mensaje.
                                </p>
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <a href="${window.location.origin}" style="display: inline-block; background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">Ver mi incidencia</a>
                                </div>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                                    ⚠️ Por favor, no respondas directamente a este correo. Usa el botón superior para acceder al chat de soporte.
                                </p>
                            </div>
                        </div>
                    `
                }
            });

            showToast("Incidencia reabierta y cliente notificado.", "success");
        } catch (error) {
            console.error("Error reabriendo caso:", error);
            showToast("Hubo un error al reabrir la incidencia.", "error");
        }
    };

    const handleResolveCase = async (ticket, originalOrder, actionType) => {
        const form = resolutionData[ticket.id] || { itemIndex: '', targetBatch: 'ERRORS', giftId: '', closingMessage: '' };
        
        if (!form.closingMessage) {
            return showToast("Debes escribir un mensaje de cierre/resolución para el cliente.", "error");
        }

        const club = clubs.find(c => c.id === originalOrder.clubId);
        let replacementOrder = null;
        let newItems = [];
        let giftCodeString = null;
        let giftProductName = '';

        if (actionType === 'replace' && form.itemIndex !== '') {
            const selectedItem = originalOrder.items[parseInt(form.itemIndex)];
            const reported = ticket.affectedItems?.find(i => i.name === selectedItem.name && (i.size === selectedItem.size || !i.size));
            const qtyToReplace = reported ? reported.selectedQty : (selectedItem.quantity || 1);

            newItems.push({
                ...selectedItem,
                quantity: qtyToReplace,
                price: 0, 
                clubCommission: 0,
                commercialCommission: 0,
                isReplacement: true,
                originalOrderId: originalOrder.id
            });
        }

        if (form.giftId) {
            const giftProduct = products.find(p => p.id === form.giftId);
            if (giftProduct) {
                giftCodeString = `REG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                giftProductName = giftProduct.name;
                
                try {
                    await addDoc(collection(db, 'giftCodes'), {
                        code: giftCodeString,
                        type: 'incident',
                        incidentId: ticket.id,
                        originalOrderId: originalOrder.id,
                        userEmail: ticket.userEmail,
                        productId: giftProduct.id,
                        productName: giftProduct.name,
                        status: 'pending', 
                        createdAt: new Date().toISOString()
                    });
                } catch (error) {
                    console.error("Error generando código de regalo:", error);
                    return showToast("Error al generar el código de regalo.", "error");
                }
            }
        }

        if (newItems.length > 0) {
            let finalBatch = form.targetBatch;
            if (finalBatch === 'ERRORS') {
                const errId = club ? (club.activeErrorBatchId || 1) : 1;
                finalBatch = `ERR-${errId}`;
            }

            replacementOrder = {
                clubId: originalOrder.clubId,
                clubName: originalOrder.clubName,
                customer: {
                    name: originalOrder.customer.name + " (INCIDENCIA)",
                    email: originalOrder.customer.email || "",
                    phone: originalOrder.customer.phone || ""
                },
                items: newItems,
                total: 0,
                paymentMethod: 'none',
                status: 'en_produccion', 
                visibleStatus: 'Reposición en Curso',
                globalBatch: finalBatch,
                type: 'replacement',
                createdAt: new Date()
            };

            try {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), replacementOrder);
            } catch (error) {
                console.error('Error creando pedido:', error);
                return showToast('Error al generar el pedido de reposición en el sistema.', 'error');
            }
        }

        try {
            const closingLog = {
                sender: 'admin',
                text: `[CASO CERRADO - ${actionType.toUpperCase()}] ${form.closingMessage}`,
                date: new Date().toISOString()
            };

            await updateDoc(doc(db, 'incidents', ticket.id), {
                status: 'resolved', 
                resolutionType: actionType,
                hasGift: !!form.giftId,
                messages: arrayUnion(closingLog),
                resolvedAt: new Date().toISOString()
            });
            
            await addDoc(collection(db, 'mail'), {
                to: [ticket.userEmail],
                message: {
                    subject: `Incidencia Resuelta: Pedido #${ticket.orderId}`,
                    html: `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #f0fdf4; padding: 20px; border-bottom: 1px solid #dcfce7;">
                                <h3 style="margin: 0; color: #166534;">✅ Hemos resuelto tu incidencia</h3>
                                <p style="margin: 5px 0 0 0; font-size: 14px; color: #15803d;">Pedido #${ticket.orderId}</p>
                            </div>
                            <div style="padding: 20px;">
                                <p style="font-size: 14px; color: #475569; margin-bottom: 5px;"><strong>Resolución aportada por el equipo:</strong></p>
                                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; color: #1e293b; margin-bottom: 15px;">
                                    ${form.closingMessage}
                                </div>

                                ${newItems.length > 0 ? `
                                    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; color: #92400e; margin-bottom: 20px; font-size: 14px;">
                                        <strong>📦 Reposición en curso:</strong> Hemos enviado a fábrica el/los producto(s) dañados sin coste alguno para ti.
                                    </div>
                                ` : ''}

                                ${giftCodeString ? `
                                    <div style="background-color: #fdf4ff; border: 1px solid #fbcfe8; padding: 20px; border-radius: 8px; color: #831843; margin-bottom: 20px;">
                                        <h4 style="margin-top: 0; font-size: 16px; margin-bottom: 10px;">🎁 ¡Tienes un regalo compensatorio!</h4>
                                        <p style="font-size: 14px; margin-bottom: 15px; color: #9d174d;">Por las molestias ocasionadas, te regalamos: <strong>${giftProductName}</strong>.</p>
                                        <p style="font-size: 14px; margin-bottom: 15px;">Usa este código exclusivo en el carrito de nuestra tienda online para añadir el producto, elegir tu talla y personalizarlo (nombre/dorsal) totalmente gratis:</p>
                                        <div style="text-align: center; margin: 20px 0;">
                                            <span style="background-color: #be185d; color: white; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 20px; letter-spacing: 3px;">${giftCodeString}</span>
                                        </div>
                                    </div>
                                ` : ''}

                                <div style="text-align: center; margin-top: 20px;">
                                    <a href="${window.location.origin}" style="display: inline-block; background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Visitar la tienda</a>
                                </div>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                                    ⚠️ Este es un mensaje automático generado al cerrar el ticket. Por favor, no respondas a este correo.
                                </p>
                            </div>
                        </div>
                    `
                }
            });

            setExpandedId(null);
            showToast(`Caso resuelto. ${newItems.length > 0 ? 'Reposición creada.' : ''} ${giftCodeString ? 'Código de regalo generado.' : ''}`, "success");
        } catch (error) {
            console.error("Error cerrando caso:", error);
            showToast("Hubo un error al cerrar la incidencia.", "error");
        }
    };

    const filteredIncidents = incidents.filter(ticket => {
        const term = searchTerm.toLowerCase();
        const orderMatch = ticket.orderId?.toString().toLowerCase().includes(term);
        const emailMatch = ticket.userEmail?.toLowerCase().includes(term);
        return orderMatch || emailMatch;
    });

    return (
        <div className="space-y-6 animate-fade-in relative">
            
            {/* TOAST DE NOTIFICACIONES */}
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up transition-all transform ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <Check className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                    <span className="font-bold text-sm">{toast.message}</span>
                    <button onClick={() => setToast({...toast, show: false})} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* MODAL WEB DE CONFIRMACIÓN PARA REABRIR INCIDENCIA */}
            {reopenModal.isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up border border-gray-100">
                        <div className="flex items-center gap-3 mb-4 text-blue-600">
                            <div className="bg-blue-100 p-3 rounded-full">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">¿Reabrir incidencia?</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                            Estás a punto de reabrir la incidencia del pedido <strong>#{reopenModal.ticket?.orderId}</strong>. 
                            El cliente recibirá un correo electrónico notificándole que el caso vuelve a estar activo y en revisión por el equipo.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                onClick={() => setReopenModal({ isOpen: false, ticket: null })}
                            >
                                Cancelar
                            </button>
                            <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-white" 
                                onClick={() => {
                                    executeReopenCase(reopenModal.ticket);
                                    setReopenModal({ isOpen: false, ticket: null });
                                }}
                            >
                                Sí, Reabrir
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <AlertTriangle className="w-6 h-6 text-red-600"/> Centro de Incidencias y Soporte
                    </h2>
                    <p className="text-gray-500 text-sm">Chatea con el cliente, ofrece regalos compensatorios y toma decisiones sobre pedidos dañados.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por Email o Nº Pedido..."
                        className="pl-9 w-full border border-gray-200 rounded-lg py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {filteredIncidents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed">
                        {searchTerm ? (
                            <>
                                <Search className="w-12 h-12 mx-auto mb-2 text-gray-300"/>
                                <p>No se han encontrado incidencias con la búsqueda "{searchTerm}".</p>
                            </>
                        ) : (
                            <>
                                <Check className="w-12 h-12 mx-auto mb-2 text-green-200"/>
                                <p>No hay incidencias activas. ¡Buen trabajo!</p>
                            </>
                        )}
                    </div>
                ) : (
                    filteredIncidents.map(ticket => {
                        const originalOrder = orders.find(o => o.id === ticket.orderId);
                        const club = originalOrder ? clubs.find(c => c.id === originalOrder.clubId) : null;
                        const userIncidentsCount = incidents.filter(i => i.userEmail === ticket.userEmail).length;
                        const form = resolutionData[ticket.id] || { itemIndex: '', targetBatch: 'ERRORS', giftId: '', closingMessage: '' };
                        const messages = ticket.messages || [];
                        const isExpanded = expandedId === ticket.id;

                        return (
                            <div key={ticket.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden transition-all ${ticket.status === 'resolved' ? 'border-gray-400 opacity-80' : ticket.status === 'waiting_customer' ? 'border-blue-500' : 'border-red-500'}`}>
                                <div className="p-4 flex flex-col md:flex-row md:justify-between md:items-center cursor-pointer hover:bg-gray-50 transition-colors gap-3" onClick={() => toggleExpand(ticket.id)}>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h4 className="font-bold text-lg text-gray-800">#{ticket.orderId}</h4>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${ticket.status === 'open' ? 'bg-red-100 text-red-700' : ticket.status === 'waiting_customer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                                            {ticket.status === 'open' ? 'Nueva' : ticket.status === 'waiting_customer' ? 'Esperando Respuesta' : 'Cerrada'}
                                        </span>
                                        <span className="text-sm text-gray-600 truncate w-full sm:w-auto max-w-[200px] md:max-w-xs">{ticket.userEmail}</span>
                                    </div>
                                    <div className="flex items-center justify-between w-full md:w-auto gap-4 text-xs text-gray-500">
                                        <span>{new Date(ticket.createdAt?.seconds * 1000).toLocaleString()}</span>
                                        <div className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shrink-0">
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-600"/> : <ChevronDown className="w-5 h-5 text-gray-600"/>}
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/30 animate-fade-in">
                                        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                                    <h5 className="text-xs font-bold text-blue-800 uppercase flex items-center gap-1.5 mb-2"><User className="w-4 h-4"/> Cliente</h5>
                                                    <div className="text-sm text-gray-700">
                                                        <p><span className="font-semibold text-gray-500">Email:</span> {ticket.userEmail}</p>
                                                        {originalOrder && <p><span className="font-semibold text-gray-500">Nombre:</span> {originalOrder.customer?.name}</p>}
                                                        <p className="text-xs mt-1 text-gray-500"><History className="w-3 h-3 inline mr-1"/> Historial: {userIncidentsCount} incidencias</p>
                                                    </div>
                                                </div>

                                                {originalOrder && (
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                        <h5 className="text-xs font-bold text-gray-600 uppercase flex items-center justify-between mb-3">
                                                            <span className="flex items-center gap-1.5"><Package className="w-4 h-4"/> Pedido Original ({club?.name})</span>
                                                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">Total: {originalOrder.total}€</span>
                                                        </h5>
                                                        <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                                                            {originalOrder.items?.map((item, idx) => (
                                                                <li key={idx} className="text-xs bg-white border p-2 rounded flex justify-between shadow-sm">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold">{item.name} {item.size ? `(T.${item.size})` : ''}</span>
                                                                        {item.playerName && <span className="text-gray-400">Jugador: {item.playerName} {item.playerNumber ? `#${item.playerNumber}` : ''}</span>}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="font-mono bg-gray-100 px-1.5 rounded">{item.quantity || 1}x</span>
                                                                        <div className="text-[10px] text-gray-400 mt-0.5">{item.price}€/ud</div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <div className="bg-red-50/30 p-4 rounded-lg border border-red-100">
                                                    <h5 className="text-xs font-bold text-red-800 uppercase flex items-center gap-1.5 mb-2"><Info className="w-4 h-4"/> Problema Reportado</h5>
                                                    <div className="text-sm text-gray-700 italic bg-white p-3 rounded border border-red-50">"{ticket.description}"</div>
                                                    
                                                    {ticket.affectedItems && ticket.affectedItems.length > 0 && (
                                                        <div className="mt-3">
                                                            <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Productos reportados:</span>
                                                            <ul className="text-xs text-gray-700 space-y-1">
                                                                {ticket.affectedItems.map((i,k)=> <li key={k}>• <strong className="text-red-600">{i.selectedQty}x</strong> {i.name} {i.size ? `(T.${i.size})` : ''}</li>)}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {ticket.evidence && ticket.evidence.length > 0 && (
                                                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                                                            {ticket.evidence.map((file, i) => (
                                                                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-bold whitespace-nowrap hover:bg-blue-100">Ver Archivo {i+1}</a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col border rounded-lg bg-gray-50 overflow-hidden shadow-sm">
                                                <div className="p-3 bg-gray-200/50 border-b font-bold text-sm text-gray-700 flex items-center gap-2">
                                                    <MessageCircle className="w-4 h-4"/> Conversación con el Cliente
                                                </div>
                                                <div className="flex-1 p-4 overflow-y-auto max-h-[350px] space-y-3 bg-white">
                                                    {messages.length === 0 ? (
                                                        <p className="text-xs text-center text-gray-400 mt-10">No hay mensajes previos. Escribe abajo para iniciar el contacto.</p>
                                                    ) : (
                                                        messages.map((msg, i) => (
                                                            <div key={i} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                                                                <div className={`p-3 max-w-[85%] rounded-lg text-sm ${msg.sender === 'admin' ? 'bg-emerald-100 text-emerald-900 rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                                                                    {msg.text}
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 mt-1">{new Date(msg.date).toLocaleString()}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                {ticket.status !== 'resolved' && (
                                                    <div className="p-3 bg-white border-t flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Escribe un mensaje al cliente..." 
                                                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                                            value={chatInput[ticket.id] || ''}
                                                            onChange={e => setChatInput({...chatInput, [ticket.id]: e.target.value})}
                                                            onKeyDown={e => e.key === 'Enter' && handleSendMessage(ticket)}
                                                        />
                                                        <Button size="sm" onClick={() => handleSendMessage(ticket)} className="bg-emerald-600 text-white flex gap-2 items-center"><Send className="w-4 h-4"/> Enviar</Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ZONA INFERIOR: RESOLUCIÓN Y REGALOS */}
                                        {ticket.status !== 'resolved' && originalOrder && (
                                            <div className="p-5 bg-orange-50/80 border-t border-orange-100 mt-4 shadow-inner">
                                                <h4 className="font-bold text-orange-900 mb-4 flex items-center gap-2">Resolución Final del Caso</h4>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                        <label className="text-xs font-bold text-gray-600 block mb-2"><RefreshCw className="w-4 h-4 inline mr-1 text-blue-500"/> Reponer Producto (Va a Fábrica)</label>
                                                        <select className="w-full text-sm p-2 rounded border border-gray-300 outline-none focus:ring-2 focus:ring-orange-500" value={form.itemIndex} onChange={(e) => setResolutionData({...resolutionData, [ticket.id]: { ...form, itemIndex: e.target.value }})}>
                                                            <option value="">-- No reponer original --</option>
                                                            {originalOrder.items?.map((item, idx) => {
                                                                const reported = ticket.affectedItems?.find(i => i.name === item.name && (i.size === item.size || !i.size));
                                                                const qtyToReplace = reported ? reported.selectedQty : (item.quantity || 1);
                                                                return (
                                                                    <option key={idx} value={idx}>
                                                                        Reponer: {qtyToReplace}x | {item.name} {item.size ? `(T.${item.size})` : ''} - {item.price}€/ud
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>

                                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                        <label className="text-xs font-bold text-gray-600 block mb-2"><Gift className="w-4 h-4 inline mr-1 text-purple-500"/> Regalo (Genera Código)</label>
                                                        <select className="w-full text-sm p-2 rounded border border-gray-300 outline-none focus:ring-2 focus:ring-purple-500 mb-2" value={form.giftId} onChange={(e) => setResolutionData({...resolutionData, [ticket.id]: { ...form, giftId: e.target.value }})}>
                                                            <option value="">-- Ningún regalo --</option>
                                                            {products.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                        <p className="text-[9px] text-gray-400 mt-1 ml-1 leading-tight">No se enviará ahora. Se le generará un código de 1 solo uso para que lo pida en su carrito.</p>
                                                    </div>

                                                    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                        <label className="text-xs font-bold text-gray-600 block mb-2">Lote para la Reposición</label>
                                                        <select className="w-full text-sm p-2 rounded border border-gray-300 outline-none focus:ring-2 focus:ring-orange-500" value={form.targetBatch} onChange={(e) => setResolutionData({...resolutionData, [ticket.id]: { ...form, targetBatch: e.target.value }})}>
                                                            <option value="ERRORS">🚨 Lote Errores Activo</option>
                                                            <option value="INDIVIDUAL">📦 Envío Individual</option>
                                                            {(() => {
                                                                const activeBatchesMap = {};
                                                                orders.filter(o => o.clubId === originalOrder.clubId && !['SPECIAL', 'INDIVIDUAL'].includes(o.globalBatch)).forEach(o => {
                                                                    if(['recopilando', 'en_produccion'].includes(o.status)) activeBatchesMap[o.globalBatch] = o.status;
                                                                });
                                                                return Object.entries(activeBatchesMap).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([id, status]) => (
                                                                    <option key={id} value={id}>
                                                                        Lote Global #{id} ({status === 'recopilando' ? '🟢 Recopilando' : '🟡 En Producción'})
                                                                    </option>
                                                                ));
                                                            })()}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                                    <label className="text-xs font-bold text-gray-600 block mb-2">Mensaje de Cierre (Obligatorio para resolver)</label>
                                                    <textarea 
                                                        className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-3 outline-none focus:ring-2 focus:ring-orange-500 resize-none" 
                                                        rows="2" 
                                                        placeholder="Ej: Te hemos enviado un código promocional para una taza gratis..."
                                                        value={form.closingMessage}
                                                        onChange={e => setResolutionData({...resolutionData, [ticket.id]: {...form, closingMessage: e.target.value}})}
                                                    ></textarea>
                                                    
                                                    <div className="flex flex-wrap gap-3 justify-end items-center">
                                                        <span className="text-[10px] text-gray-400 hidden md:block">* Cerrará la incidencia definitivamente</span>
                                                        <Button variant="danger" onClick={() => handleResolveCase(ticket, originalOrder, 'denied')} className="flex items-center gap-1">
                                                            <XCircle className="w-4 h-4"/> Denegar
                                                        </Button>
                                                        <Button onClick={() => handleResolveCase(ticket, originalOrder, 'refund')} className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1">
                                                            <CreditCard className="w-4 h-4"/> Reembolsar
                                                        </Button>
                                                        <Button variant="warning" onClick={() => handleResolveCase(ticket, originalOrder, 'replace')} className="flex items-center gap-1 shadow-md">
                                                            <Check className="w-4 h-4"/> Confirmar y Cerrar
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* BOTÓN PARA REABRIR INCIDENCIAS CERRADAS (AHORA ABRE EL MODAL) */}
                                        {ticket.status === 'resolved' && (
                                            <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                                <p className="text-sm text-gray-500">
                                                    Esta incidencia ha sido cerrada. Si el cliente requiere más ayuda sobre este mismo reporte, puedes volver a abrirla.
                                                </p>
                                                <Button 
                                                    onClick={() => setReopenModal({ isOpen: true, ticket: ticket })} 
                                                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                                                >
                                                    <RefreshCw className="w-4 h-4"/> Reabrir Incidencia
                                                </Button>
                                            </div>
                                        )}
                                        
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};