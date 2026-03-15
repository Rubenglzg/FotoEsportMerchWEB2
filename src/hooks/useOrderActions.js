import { collection, addDoc, doc, updateDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId } from '../config/constants';
import { generateInvoiceEmailHTML } from '../utils/emailTemplates';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
// 🔒 NUEVAS IMPORTACIONES
import { z } from 'zod';
import DOMPurify from 'dompurify';

export function useOrderActions(showNotification, setCart, setView, clubs, seasons) {

// --- CREAR PEDIDO NORMAL ---
  const createOrder = async (orderData) => {
      try {
          const initialStatus = orderData.paymentMethod === 'cash' ? 'pendiente_validacion' : 'recopilando';
          const visibleStatus = orderData.paymentMethod === 'cash' ? 'Pendiente Pago' : 'Recopilando';

          const club = clubs.find(c => c.id === orderData.clubId);
          const activeBatch = club ? (club.activeGlobalOrderId || 1) : 1;

          // 🔒 Limpiamos los datos del cliente
          const safeCustomerData = {
              ...orderData.customer,
              name: orderData.customer?.name ? DOMPurify.sanitize(orderData.customer.name).trim() : 'Cliente',
              email: orderData.customer?.email ? DOMPurify.sanitize(orderData.customer.email).trim() : ''
          };

          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
              ...orderData,
              customer: safeCustomerData,
              status: initialStatus,
              visibleStatus: visibleStatus,
              createdAt: serverTimestamp(),
              globalBatch: activeBatch,
              manualSeasonId: seasons.length > 0 ? seasons[seasons.length - 1].id : 'default' 
          });

          // Lógica de cupones de regalo... (la mantienes igual)
          const itemsConRegalo = orderData.items.filter(item => item.isGift && item.giftCodeId);
          for (const item of itemsConRegalo) {
              await updateDoc(doc(db, 'giftCodes', item.giftCodeId), {
                  status: 'redeemed',
                  redeemedAt: new Date().toISOString(),
                  redeemedOrderId: docRef.id
              });
          }

          // 📧 ENVÍO DE EMAIL CON BLINDAJE ANTI-ERROR
            if (orderData.paymentMethod !== 'cash' && safeCustomerData.email) {
                try {
                    const mailRef = doc(collection(db, 'mail'));
                    const orderWithId = { ...orderData, id: docRef.id };

                    // 1. Generamos el PDF
                    const rawPdf = await generateInvoicePDF(docRef.id, orderWithId);

                    // 2. Generamos el HTML del email
                    const emailHtml = String(generateInvoiceEmailHTML(orderWithId, orderData.clubName || 'Tu Club'));

                    // 3. Validamos que el base64 es limpio
                    const pdfBase64 = (typeof rawPdf === 'string' && rawPdf.length > 0) ? rawPdf : null;

                    if (!pdfBase64) {
                        console.error("❌ PDF base64 inválido, no se enviará email");
                    } else {
                        const mailPayload = {
                            to: [safeCustomerData.email],
                            message: {
                                subject: `✅ Recibo de Pedido: ${orderData.clubName || 'FotoEsport'}`,
                                html: emailHtml,
                                text: `Tu pedido ha sido confirmado. Importe: ${orderData.total}€`,
                                attachments: [{
                                    filename: `Factura_${docRef.id.substring(0, 8).toUpperCase()}.pdf`,
                                    content: pdfBase64,
                                    encoding: 'base64'
                                }]
                            }
                        };
                        await setDoc(mailRef, mailPayload);
                    }

                } catch (emailError) {
                    console.error("❌ Error en bloque email:", emailError);
                }
            }

            setCart([]);
            setView('success');

      } catch (error) {
          console.error("Error creando pedido:", error);
          alert("Hubo un error al procesar el pedido. Revisa los datos e inténtalo de nuevo.");
      }
  };

  // --- CREAR PEDIDO ESPECIAL (ADMIN) ---
  const createSpecialOrder = async (orderData) => { 
      try { 
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), { 
              ...orderData, 
              createdAt: serverTimestamp(), 
              status: 'en_produccion', 
              visibleStatus: 'Pedido Especial en Curso', 
              type: 'special', 
              globalBatch: 'SPECIAL', 
              incidents: [] 
          }); 
          showNotification('Pedido especial registrado con éxito'); 
      } catch(e) { 
          showNotification('Error al crear pedido especial', 'error'); 
      } 
  };

// --- ACTUALIZAR ESTADO DE PEDIDO ---
  const updateOrderStatus = async (orderId, newStatus, visibleStatus, orderData) => {
      try {
          const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
          await updateDoc(orderRef, { status: newStatus, visibleStatus: visibleStatus });

          // 📧 ENVÍO DE EMAIL TRAS VALIDAR EFECTIVO
          if (orderData && orderData.paymentMethod === 'cash' && newStatus === 'recopilando') {
              const customerEmail = orderData.customer?.email;
              if (customerEmail) {
                  const mailRef = doc(collection(db, 'mail'));
                  
                  // Generamos PDF y forzamos conversión a String
                  const rawPdf = await generateInvoicePDF(orderId, orderData);
                  const pdfBase64 = typeof rawPdf === 'string' ? rawPdf : '';
                  const emailHtml = String(generateInvoiceEmailHTML(orderData, orderData.clubName || 'Tu Club'));

                  await setDoc(mailRef, {
                      to: [customerEmail],
                      message: {
                          subject: `✅ Pago Recibido - Factura Pedido ${orderData.clubName || 'Club'}`,
                          html: emailHtml,
                          text: `El club ha validado tu pago.`,
                          attachments: pdfBase64 ? [{
                              filename: `Factura_${orderId.substring(0, 8).toUpperCase()}.pdf`,
                              content: pdfBase64,
                              encoding: 'base64'
                          }] : []
                      }
                  });
                  showNotification(`Pedido validado y factura enviada.`);
              }
          }
          showNotification('Estado actualizado');
      } catch (error) {
          console.error("Error:", error);
          showNotification('Error al actualizar', 'error');
      }
  };

    // --- INCIDENCIAS ---
  const addIncident = async (orderId, incidentData) => { 
      try { 
          // 🔒 1. Sanitizar campos de texto libres que puedan contener inyecciones HTML/JS
          const cleanIncidentData = {
              ...incidentData,
              // Asumimos que los detalles vienen en campos como "description" o "reason"
              // Ajusta la clave a cómo la llames en tu formulario de incidencias
              description: incidentData.description ? DOMPurify.sanitize(incidentData.description).trim() : '',
              title: incidentData.title ? DOMPurify.sanitize(incidentData.title).trim() : ''
          };

          const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); 
          // 🔒 2. Enviamos el dato LIMPIO (cleanIncidentData) en lugar del original
          await updateDoc(orderRef, { incidents: arrayUnion(cleanIncidentData) }); 
          
          showNotification('Incidencia/Reimpresión registrada'); 
      } catch (e) { 
          console.error("Error al registrar incidencia:", e);
          showNotification('Error registrando incidencia', 'error'); 
      } 
  };
  
  const updateIncidentStatus = async (orderId, incidents) => { 
      try { 
          const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); 
          await updateDoc(orderRef, { incidents }); 
          showNotification('Estado de incidencia actualizado'); 
      } catch(e) { 
          showNotification('Error actualizando incidencia', 'error'); 
      } 
  };

  return {
      createOrder, createSpecialOrder, updateOrderStatus,
      addIncident, updateIncidentStatus
  };
}