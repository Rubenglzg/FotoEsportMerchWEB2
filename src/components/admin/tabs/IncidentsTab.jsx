import React from 'react';
import { AlertTriangle, Check, FileText } from 'lucide-react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Button } from '../../ui/Button';

export const IncidentsTab = ({ incidents }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <AlertTriangle className="w-6 h-6 text-red-600"/> Centro de Incidencias
                    </h2>
                    <p className="text-gray-500 text-sm">Gestiona reclamos y problemas con pedidos.</p>
                </div>
            </div>

            <div className="grid gap-4">
                {incidents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed">
                        <Check className="w-12 h-12 mx-auto mb-2 text-green-200"/>
                        <p>No hay incidencias activas. ¡Buen trabajo!</p>
                    </div>
                ) : (
                    incidents.map(ticket => (
                        <div key={ticket.id} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${ticket.status === 'open' ? 'border-red-500' : ticket.status === 'resolved_pending' ? 'border-yellow-500' : 'border-green-500'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800">Pedido #{ticket.orderId}</h4>
                                    <p className="text-xs text-gray-500">{new Date(ticket.createdAt?.seconds * 1000).toLocaleString()} • {ticket.userEmail}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                    ticket.status === 'open' ? 'bg-red-100 text-red-700' : 
                                    ticket.status === 'resolved_pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                }`}>
                                    {ticket.status === 'open' ? 'Abierto' : ticket.status === 'resolved_pending' ? 'Esperando Cliente' : 'Cerrado'}
                                </span>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 mb-4 border border-gray-100">
                                <p className="font-bold text-gray-400 text-xs uppercase mb-1">Descripción del Cliente:</p>
                                "{ticket.description}"
                            </div>

                            {/* Evidencias (Fotos/Videos) */}
                            {ticket.evidence && ticket.evidence.length > 0 && (
                                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                    {ticket.evidence.map((file, i) => (
                                        <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                                            <FileText className="w-4 h-4"/> Ver Prueba {i+1}
                                        </a>
                                    ))}
                                </div>
                            )}
                            
                            {/* Zona de Respuesta Admin */}
                            {ticket.status === 'open' && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Tu Respuesta / Solución</label>
                                    <textarea id={`reply-${ticket.id}`} className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-3 focus:ring-2 focus:ring-emerald-500 outline-none" rows="3" placeholder="Escribe aquí la solución para el cliente..."></textarea>
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" onClick={async () => {
                                            const reply = document.getElementById(`reply-${ticket.id}`).value;
                                            if(!reply) return alert("Escribe una respuesta para poder resolver.");
                                            
                                            // 1. Actualizar estado a 'resolved_pending' (inicia cuenta atrás de 7 días)
                                            await updateDoc(doc(db, 'incidents', ticket.id), {
                                                status: 'resolved_pending',
                                                adminReply: reply,
                                                resolvedAt: new Date().toISOString()
                                            });
                                            
                                            // 2. Enviar correo manual (seguridad)
                                            await addDoc(collection(db, 'mail'), {
                                                to: [ticket.userEmail],
                                                message: {
                                                    subject: `Incidencia Resuelta: Pedido #${ticket.orderId}`,
                                                    html: `<h3>Hemos respondido a tu incidencia</h3>
                                                            <p><strong>Respuesta:</strong> ${reply}</p>
                                                            <p style="color:#666; font-size:12px; margin-top:20px;">Si no estás de acuerdo, responde a este correo. Si no recibimos respuesta en 7 días, daremos el caso por cerrado.</p>`
                                                }
                                            });
                                            alert("Respuesta enviada y caso marcado para cierre automático en 7 días.");
                                        }} className="bg-emerald-600 text-white">
                                            Enviar Solución y Resolver
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {ticket.adminReply && (
                                <div className="mt-4 text-xs bg-green-50 text-green-800 p-3 rounded border border-green-100">
                                    <strong>Tu respuesta:</strong> {ticket.adminReply}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};