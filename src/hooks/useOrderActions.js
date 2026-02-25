import { collection, addDoc, doc, updateDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId } from '../config/constants';
import { generateInvoiceEmailHTML } from '../utils/emailTemplates';

export function useOrderActions(showNotification, setCart, setView, clubs, seasons) {

  // --- CREAR PEDIDO NORMAL ---
  const createOrder = async (orderData) => {
      try {
          const initialStatus = orderData.paymentMethod === 'cash' ? 'pendiente_validacion' : 'recopilando';
          const visibleStatus = orderData.paymentMethod === 'cash' ? 'Pendiente Pago' : 'Recopilando';

          const club = clubs.find(c => c.id === orderData.clubId);
          const activeBatch = club ? (club.activeGlobalOrderId || 1) : 1;

          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
              ...orderData,
              status: initialStatus,
              visibleStatus: visibleStatus,
              createdAt: serverTimestamp(),
              globalBatch: activeBatch,
              manualSeasonId: seasons.length > 0 ? seasons[seasons.length - 1].id : 'default' 
          });

          // --- NUEVO: MARCAR CÓDIGOS DE REGALO COMO CANJEADOS ---
          // Buscamos si en el pedido hay algún artículo que se haya añadido usando un código
          const itemsConRegalo = orderData.items.filter(item => item.isGift && item.giftCodeId);
          
          for (const item of itemsConRegalo) {
              try {
                  // Actualizamos el documento del código en la colección 'giftCodes'
                  await updateDoc(doc(db, 'giftCodes', item.giftCodeId), {
                      status: 'redeemed', // Lo marcamos como usado
                      redeemedAt: new Date().toISOString(), // Fecha de uso
                      redeemedOrderId: docRef.id // Guardamos en qué pedido se usó para el historial
                  });
              } catch (e) {
                  console.error("Error al marcar el código de regalo como canjeado:", e);
              }
          }
          // ------------------------------------------------------

          // Si es pago con tarjeta (o el pedido total es 0€), enviamos factura por email
          if (orderData.paymentMethod !== 'cash') {
              if (orderData.customer.email) {
                  const mailRef = doc(collection(db, 'mail'));
                  const orderWithId = { ...orderData, id: docRef.id };
                  
                  await setDoc(mailRef, {
                      to: [orderData.customer.email],
                      message: {
                          subject: `✅ Recibo de Pedido: ${orderData.clubName}`,
                          html: generateInvoiceEmailHTML(orderWithId, orderData.clubName),
                          text: `Tu pedido ha sido confirmado. Importe: ${orderData.total}€`
                      }
                  });
              }
          }

          setCart([]); // Vaciamos el carrito
          setView('success'); // Vamos a la pantalla de éxito
          
      } catch (error) {
          console.error("Error creando pedido:", error);
          alert("Hubo un error al procesar el pedido. Inténtalo de nuevo.");
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
          
          await updateDoc(orderRef, { 
              status: newStatus, 
              visibleStatus: visibleStatus 
          });

          // Si es validación de efectivo, enviamos email
          if (orderData && orderData.paymentMethod === 'cash' && newStatus === 'recopilando') {
              if (orderData.customer && orderData.customer.email) {
                  const mailRef = doc(collection(db, 'mail'));
                  await setDoc(mailRef, {
                      to: [orderData.customer.email],
                      message: {
                          subject: `✅ Pago Recibido - Factura Pedido ${orderData.clubName || 'Club'}`,
                          html: generateInvoiceEmailHTML(orderData, orderData.clubName || 'Tu Club'),
                          text: `El club ha validado tu pago en efectivo. Tu pedido entra en fase de recopilación.`
                      }
                  });
                  showNotification(`Pedido validado y factura enviada al cliente.`);
                  return; 
              }
          }

          showNotification('Estado del pedido actualizado');
      } catch (error) {
          console.error("Error actualizando estado:", error);
          showNotification('Error al actualizar el estado', 'error');
      }
  };

  // --- INCIDENCIAS ---
  const addIncident = async (orderId, incidentData) => { 
      try { 
          const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); 
          await updateDoc(orderRef, { incidents: arrayUnion(incidentData) }); 
          showNotification('Incidencia/Reimpresión registrada'); 
      } catch (e) { 
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