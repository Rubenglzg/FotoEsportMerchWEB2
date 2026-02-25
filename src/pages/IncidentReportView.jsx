import React, { useState } from 'react';
// 1. Importamos los iconos que usa esta vista
import { AlertTriangle, Upload, FileText, Trash2, Check, Send, Edit, PlusCircle, MessageCircle, Package, X } from 'lucide-react';
// 2. Importamos las herramientas de Firestore y Storage necesarias
import { collection, addDoc, query, getDocs, where, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// 3. Importamos los componentes de interfaz
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/* * ============================================================================
 * 🚨 VISTA: REPORTE DE INCIDENCIAS
 * ============================================================================
 * Pantalla donde los clientes pueden reportar problemas con sus pedidos,
 * subir fotos de prueba y hacer seguimiento de la resolución.
 */

export function IncidentReportView({ setView, db, storage }) {
  const [orderIdInput, setOrderIdInput] = useState('');
  const [realOrderId, setRealOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); 
  
  const [orderItems, setOrderItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({}); 
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]); 
  const [isDragging, setIsDragging] = useState(false); 
  
  const [existingTicket, setExistingTicket] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  
  // Chat y Edición
  const [chatMessage, setChatMessage] = useState('');
  const [isEditingProducts, setIsEditingProducts] = useState(false);

  // NUEVO: Sistema de Notificaciones en la propia web (Toast)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
      e.preventDefault(); setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const newFiles = Array.from(e.dataTransfer.files);
          setFiles(prev => [...prev, ...newFiles]);
          e.dataTransfer.clearData();
      }
  };

  const removeFile = (indexToRemove) => {
      setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // PASO 1: BUSCAR PEDIDO
  const verifyOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanId = orderIdInput.trim().replace(/^#/, '');

    if (cleanId.length < 4) {
        showToast("Introduce al menos 4 caracteres del ID.", "error"); 
        setLoading(false); 
        return;
    }

    try {
        const qOrder = query(
            collection(db, 'artifacts', 'fotoesport-merch', 'public', 'data', 'orders'),
            where('__name__', '>=', cleanId),
            where('__name__', '<=', cleanId + '\uf8ff')
        );
        const snapOrder = await getDocs(qOrder);

        if (snapOrder.empty) {
            showToast("No encontramos ese pedido en la base de datos.", "error"); 
            setLoading(false); 
            return;
        }

        let foundDoc = null;
        for (const doc of snapOrder.docs) {
            if (doc.data().customer?.email?.toLowerCase().trim() === email.toLowerCase().trim()) {
                foundDoc = doc; break;
            }
        }

        if (!foundDoc) {
            showToast("Pedido encontrado, pero el email no coincide con la compra.", "error"); 
            setLoading(false); 
            return;
        }

        const orderData = foundDoc.data();
        const fullOrderId = foundDoc.id;

        const qIncidents = query(collection(db, 'incidents'), where('orderId', '==', fullOrderId));
        const snapIncidents = await getDocs(qIncidents);

        if (!snapIncidents.empty) {
            const tickets = snapIncidents.docs.map(d => ({id: d.id, ...d.data()}));
            tickets.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            
            setExistingTicket(tickets[0]);
            setRealOrderId(fullOrderId);
            setOrderItems(orderData.items || []); 
            setStep(3); 
        } else {
            setRealOrderId(fullOrderId);
            setOrderItems(orderData.items || []); 
            setStep(2); 
        }
    } catch(error) {
        console.error(error);
        showToast("Error al buscar el pedido.", "error");
    }
    setLoading(false);
  };

  const toggleItem = (item, isChecked) => {
    const newSelected = { ...selectedItems };
    const itemId = item.id || item.name;
    if (isChecked) newSelected[itemId] = 1;
    else delete newSelected[itemId];
    setSelectedItems(newSelected);
  };

  const changeQuantity = (itemId, qty, max) => {
    if (qty < 1) qty = 1;
    if (qty > max) qty = max;
    setSelectedItems(prev => ({ ...prev, [itemId]: parseInt(qty) }));
  };

  // PASO 2: GUARDAR NUEVA INCIDENCIA O GUARDAR MODIFICACIÓN
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(selectedItems).length === 0) {
        showToast("Selecciona al menos un producto afectado.", "error"); 
        return;
    }
    setLoading(true);

    try {
        const affectedItems = orderItems
            .filter(item => selectedItems[item.id || item.name])
            .map(item => ({
                name: item.name,
                selectedQty: selectedItems[item.id || item.name],
                originalQty: item.quantity,
                image: item.image || '',
                size: item.size || ''
            }));

        // SI ESTAMOS EDITANDO UNA INCIDENCIA EXISTENTE
        if (isEditingProducts && existingTicket) {
            const editMessage = {
                sender: 'customer',
                text: '[SISTEMA] El cliente ha modificado la lista de productos afectados.',
                date: new Date().toISOString()
            };

            await updateDoc(doc(db, 'incidents', existingTicket.id), {
                affectedItems,
                messages: arrayUnion(editMessage),
                status: 'open' 
            });

            setExistingTicket(prev => ({
                ...prev, 
                affectedItems, 
                status: 'open',
                messages: [...(prev.messages || []), editMessage]
            }));
            
            setIsEditingProducts(false);
            setStep(3);
            setLoading(false);
            showToast("Productos actualizados correctamente.", "success");
            return;
        }

        // SI ES UNA INCIDENCIA NUEVA
        const fileUrls = [];
        for (const file of files) {
            const storageRef = ref(storage, `incidents/${realOrderId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            fileUrls.push({ name: file.name, url, type: file.type });
        }

        const docRef = await addDoc(collection(db, 'incidents'), {
            orderId: realOrderId,
            displayId: orderIdInput.replace(/^#/, ''),
            userEmail: email,
            description,
            affectedItems,
            evidence: fileUrls,
            status: 'open',
            messages: [],
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
        });

        setLoading(false);
        setShowSuccessBanner(true);
        setTimeout(() => setView('home'), 10000); 

    } catch (error) {
        console.error(error);
        showToast("Error al procesar la solicitud.", "error");
        setLoading(false);
    }
  };

  const sendChatMessage = async () => {
      if (!chatMessage.trim()) return;
      setLoading(true);

      const newMsg = {
          sender: 'customer',
          text: chatMessage,
          date: new Date().toISOString()
      };

      try {
          await updateDoc(doc(db, 'incidents', existingTicket.id), {
              messages: arrayUnion(newMsg),
              status: 'open',
              lastUpdated: serverTimestamp()
          });

          setExistingTicket(prev => ({
              ...prev,
              status: 'open',
              messages: [...(prev.messages || []), newMsg]
          }));
          setChatMessage('');
      } catch (error) {
          console.error("Error al enviar mensaje:", error);
          showToast("No se pudo enviar el mensaje.", "error");
      }
      setLoading(false);
  };

  const startEditingProducts = () => {
      const preSelected = {};
      if (existingTicket.affectedItems) {
          existingTicket.affectedItems.forEach(item => {
              const original = orderItems.find(o => o.name === item.name);
              if (original) preSelected[original.id || original.name] = item.selectedQty || 1;
          });
      }
      setSelectedItems(preSelected);
      setIsEditingProducts(true);
      setStep(2);
  };

  const startNewIncident = () => {
      setExistingTicket(null);
      setSelectedItems({});
      setDescription('');
      setFiles([]);
      setIsEditingProducts(false);
      setStep(2);
  };

  return (
    <>
      {/* NOTIFICACIÓN FLOTANTE (TOAST) */}
      {toast.show && (
          <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up transition-all transform ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
              {toast.type === 'success' ? <Check className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
              <span className="font-bold text-sm">{toast.message}</span>
              <button onClick={() => setToast({...toast, show: false})} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
              </button>
          </div>
      )}

      {/* VISTA DE ÉXITO FINAL */}
      {showSuccessBanner && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 h-2 bg-green-500 transition-all duration-[10000ms] ease-linear w-full" style={{width: '0%'}} ref={el => el && setTimeout(() => el.style.width = '100%', 100)}></div>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Incidencia Registrada!</h2>
                  <p className="text-gray-600 mb-6">Hemos recibido tu reporte. Te mantendremos informado por correo.</p>
                  <button onClick={() => setView('home')} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">Volver al Inicio</button>
              </div>
          </div>
      )}

      {/* VISTA 1: BUSCADOR */}
      {!showSuccessBanner && step === 1 && (
        <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in">
          <h2 className="text-3xl font-bold mb-6 text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8"/> Centro de Soporte
          </h2>
          <form onSubmit={verifyOrder} className="bg-white p-6 rounded-xl shadow space-y-4 border border-gray-200">
              <p className="text-sm text-gray-600">Introduce los datos de tu compra para abrir una incidencia o consultar su estado.</p>
              <Input label="Referencia de Pedido" placeholder="Ej. 8A2F" value={orderIdInput} onChange={e => setOrderIdInput(e.target.value)} required />
              <Input label="Email de Compra" type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
              <Button type="submit" disabled={loading} className="w-full h-12">{loading ? 'Buscando...' : 'Acceder al Soporte'}</Button>
          </form>
          <button onClick={() => setView('home')} className="mt-6 w-full text-center text-gray-400 text-sm hover:underline">Cancelar y Volver</button>
        </div>
      )}

      {/* VISTA 2: FORMULARIO */}
      {!showSuccessBanner && step === 2 && (
        <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
           <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
               {isEditingProducts ? <Edit className="w-6 h-6 text-blue-600"/> : <AlertTriangle className="w-6 h-6 text-red-600"/>} 
               {isEditingProducts ? 'Modificar Productos Afectados' : 'Detalles del Problema'}
           </h2>
           <p className="text-gray-500 mb-6 text-sm">
               {isEditingProducts ? 'Actualiza la lista de productos dañados para que el equipo lo revise.' : 'Selecciona qué productos han llegado mal y adjunta fotos.'}
           </p>

           <form onSubmit={handleSubmit} className="space-y-6">
               <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
                   <h3 className="font-bold mb-3 text-gray-700">1. Selecciona los productos</h3>
                   <div className="space-y-3">
                       {orderItems.map((item, idx) => {
                           const itemId = item.id || item.name;
                           const isSelected = !!selectedItems[itemId];
                           const maxQty = item.quantity || 1;
                           return (
                               <div key={idx} className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${isSelected ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                   <input type="checkbox" className="w-5 h-5 accent-red-600 cursor-pointer" checked={isSelected} onChange={(e) => toggleItem(item, e.target.checked)}/>
                                   <div className="flex-1">
                                       <div className="font-bold text-sm text-gray-800">{item.name}</div>
                                       {item.size && <div className="text-xs text-gray-500">Talla: {item.size}</div>}
                                   </div>
                                   {isSelected && (
                                       <div className="flex items-center gap-2">
                                           <span className="text-xs text-gray-500 font-bold">Cant:</span>
                                           <input type="number" min="1" max={maxQty} value={selectedItems[itemId]} onChange={(e) => changeQuantity(itemId, e.target.value, maxQty)} className="w-16 p-1 border border-red-200 rounded text-center focus:ring-2 focus:ring-red-500 outline-none bg-white"/>
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                   </div>
               </div>

               {!isEditingProducts && (
                   <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
                       <h3 className="font-bold mb-3 text-gray-700">2. Descripción y Pruebas Visuales</h3>
                       <textarea className="w-full border border-gray-300 p-3 rounded-lg h-32 text-sm mb-4 focus:ring-2 focus:ring-red-500 outline-none" required placeholder="Explica detalladamente cuál es el problema..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
                       
                       <label className="block text-sm font-bold mb-2 text-gray-700">Adjuntar Fotos o Videos</label>
                       <div 
                          onDragOver={onDragOver}
                          onDragLeave={onDragLeave}
                          onDrop={onDrop}
                          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors relative cursor-pointer ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:bg-gray-50'}`}
                       >
                           <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                           <div className="flex flex-col items-center gap-2 text-gray-500 pointer-events-none">
                               <Upload className={`w-8 h-8 ${isDragging ? 'text-red-500' : 'text-gray-400'}`}/>
                               <span className="text-sm font-bold">{isDragging ? 'Suelta aquí...' : 'Toca para subir o arrastra archivos'}</span>
                           </div>
                       </div>

                       {files.length > 0 && (
                           <div className="mt-4 space-y-2">
                               {files.map((f, i) => (
                                   <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                                       <div className="flex items-center gap-2 overflow-hidden text-gray-600">
                                           <FileText className="w-4 h-4 flex-shrink-0 text-gray-400"/>
                                           <span className="truncate">{f.name}</span>
                                       </div>
                                       <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button>
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>
               )}

               <Button type="submit" disabled={loading} className={`w-full h-12 text-lg shadow-xl ${isEditingProducts ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                   {loading ? 'Guardando...' : isEditingProducts ? 'Guardar Cambios' : 'Tramitar Incidencia'}
               </Button>
           </form>
           <button onClick={() => { isEditingProducts ? setStep(3) : setStep(1); setIsEditingProducts(false); }} className="mt-4 w-full text-center text-gray-400 text-sm hover:underline">Cancelar</button>
        </div>
      )}

      {/* VISTA 3: CHAT Y SEGUIMIENTO */}
      {!showSuccessBanner && step === 3 && existingTicket && (
          <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[80vh] max-h-[800px]">
                  
                  {/* CABECERA */}
                  <div className={`p-4 md:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b transition-colors ${
                      (existingTicket.status === 'resolved' || existingTicket.status === 'closed') ? 'bg-gray-100' : 
                      existingTicket.status === 'waiting_customer' ? 'bg-blue-50' : 'bg-red-50'
                  }`}>
                      <div>
                          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              {(existingTicket.status === 'resolved' || existingTicket.status === 'closed') ? <Check className="w-6 h-6 text-gray-500"/> : <AlertTriangle className="w-6 h-6 text-red-500"/>}
                              Incidencia #{existingTicket.orderId.slice(0,6)}
                          </h2>
                          <p className="text-xs text-gray-500 mt-1 font-medium">
                              Estado: <span className="uppercase">{(existingTicket.status === 'resolved' || existingTicket.status === 'closed') ? 'RESUELTA Y CERRADA' : existingTicket.status === 'waiting_customer' ? 'Esperando tu respuesta' : 'En revisión'}</span>
                          </p>
                      </div>
                      
                      <div className="flex gap-2">
                          {!(existingTicket.status === 'resolved' || existingTicket.status === 'closed') ? (
                              <button onClick={startEditingProducts} className="flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 shadow-sm transition-colors">
                                  <Package className="w-4 h-4"/> Editar Productos
                              </button>
                          ) : (
                              <button onClick={startNewIncident} className="flex items-center gap-1 bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-900 shadow-sm transition-colors">
                                  <PlusCircle className="w-4 h-4"/> Abrir Nueva
                              </button>
                          )}
                      </div>
                  </div>

                  {/* ZONA DE CHAT */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 space-y-4">
                      <div className="flex flex-col items-end">
                          <div className="bg-white border border-gray-200 text-gray-800 p-4 rounded-2xl rounded-tr-sm shadow-sm max-w-[90%] md:max-w-[75%] text-sm">
                              <p className="font-bold text-xs text-red-600 mb-2">Tú reportaste:</p>
                              <p className="whitespace-pre-wrap">{existingTicket.description}</p>
                              
                              {existingTicket.affectedItems && existingTicket.affectedItems.length > 0 && (
                                 <div className="mt-3 bg-gray-50 border rounded p-2">
                                     <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Productos marcados:</span>
                                     <ul className="text-xs text-gray-700 space-y-1">
                                        {existingTicket.affectedItems.map((i,k)=> <li key={k}>• <strong>{i.selectedQty}x</strong> {i.name} {i.size ? `(${i.size})` : ''}</li>)}
                                     </ul>
                                 </div>
                              )}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1">
                              {existingTicket.createdAt?.seconds ? new Date(existingTicket.createdAt.seconds * 1000).toLocaleString() : 'Inicio'}
                          </span>
                      </div>

                      {existingTicket.adminReply && (existingTicket.messages || []).length === 0 && (
                          <div className="flex flex-col items-start">
                              <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tl-sm shadow-md max-w-[90%] md:max-w-[75%] text-sm">
                                  <p className="font-bold text-xs text-blue-200 mb-1">Soporte FotoEsport:</p>
                                  {existingTicket.adminReply}
                              </div>
                          </div>
                      )}

                      {(existingTicket.messages || []).map((msg, idx) => {
                          const isAdmin = msg.sender === 'admin';
                          return (
                              <div key={idx} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                                  <div className={`p-4 rounded-2xl shadow-sm max-w-[90%] md:max-w-[75%] text-sm ${
                                      isAdmin 
                                          ? 'bg-blue-600 text-white rounded-tl-sm' 
                                          : 'bg-white border border-gray-200 text-gray-800 rounded-tr-sm'
                                  }`}>
                                      {isAdmin && <p className="font-bold text-xs text-blue-200 mb-1">Soporte FotoEsport:</p>}
                                      {!isAdmin && <p className="font-bold text-xs text-gray-400 mb-1">Tú:</p>}
                                      <p className="whitespace-pre-wrap">{msg.text}</p>
                                  </div>
                                  <span className="text-[10px] text-gray-400 mt-1">{new Date(msg.date).toLocaleString()}</span>
                              </div>
                          );
                      })}
                  </div>

                  {/* INPUT DE CHAT */}
                  {!(existingTicket.status === 'resolved' || existingTicket.status === 'closed') ? (
                      <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
                          <input 
                              type="text" 
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="Escribe un mensaje al soporte..."
                              value={chatMessage}
                              onChange={(e) => setChatMessage(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                              disabled={loading}
                          />
                          <button 
                              onClick={sendChatMessage} 
                              disabled={loading || !chatMessage.trim()}
                              className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                              <Send className="w-5 h-5"/>
                          </button>
                      </div>
                  ) : (
                      <div className="p-4 bg-gray-100 border-t border-gray-200 text-center text-sm text-gray-500">
                          Esta incidencia ha sido cerrada. Si necesitas más ayuda, abre una nueva usando el botón superior.
                      </div>
                  )}
                  
              </div>
              <div className="text-center mt-4">
                  <button onClick={() => setView('home')} className="text-gray-400 text-sm hover:text-gray-600 underline">Volver al inicio</button>
              </div>
          </div>
      )}
    </>
  );
}