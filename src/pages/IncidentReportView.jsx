import React, { useState } from 'react';
// 1. Importamos los iconos que usa esta vista
import { AlertTriangle, Upload, FileText, Trash2, Check, X } from 'lucide-react';
// 2. Importamos las herramientas de Firestore y Storage necesarias
import { collection, addDoc, query, getDocs, where, serverTimestamp, updateDoc, doc, deleteField } from 'firebase/firestore';
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
  const [step, setStep] = useState(1); // 1: Buscar, 2: Seleccionar Productos, 3: Resumen/Status
  
  // Datos del Pedido y Selección
  const [orderItems, setOrderItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({}); // { 'itemId': quantity }
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]); // Lista de archivos
  const [isDragging, setIsDragging] = useState(false); // Estado visual para Drag&Drop
  const [existingTicket, setExistingTicket] = useState(null); // Si ya existe incidencia
  const [loading, setLoading] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // --- MANEJADORES DE ARCHIVOS ---
  
  // 1. Al seleccionar desde el explorador
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
        // Convertimos a array y añadimos a los existentes
        const newFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // 2. Al arrastrar sobre la zona (Drag Over)
  const onDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
  };

  // 3. Al salir de la zona de arrastre (Drag Leave)
  const onDragLeave = (e) => {
      e.preventDefault();
      setIsDragging(false);
  };

  // 4. Al soltar los archivos (Drop)
  const onDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const newFiles = Array.from(e.dataTransfer.files);
          setFiles(prev => [...prev, ...newFiles]);
          e.dataTransfer.clearData();
      }
  };

  // 5. Eliminar un archivo específico de la lista
  const removeFile = (indexToRemove) => {
      setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Paso 1: Verificar Pedido y comprobar si ya hay incidencia
  const verifyOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cleanId = orderIdInput.trim().replace(/^#/, '');

    if (cleanId.length < 4) {
        alert("Introduce al menos 4 caracteres del ID."); setLoading(false); return;
    }

    try {
        // A) Buscar el pedido
        const qOrder = query(
            collection(db, 'artifacts', 'fotoesport-merch', 'public', 'data', 'orders'),
            where('__name__', '>=', cleanId),
            where('__name__', '<=', cleanId + '\uf8ff')
        );
        const snapOrder = await getDocs(qOrder);

        if (snapOrder.empty) {
            alert("No encontramos ese pedido."); setLoading(false); return;
        }

        // Buscar coincidencia de email
        let foundDoc = null;
        for (const doc of snapOrder.docs) {
            if (doc.data().customer?.email?.toLowerCase().trim() === email.toLowerCase().trim()) {
                foundDoc = doc;
                break;
            }
        }

        if (!foundDoc) {
            alert("Pedido encontrado, pero el email no coincide."); setLoading(false); return;
        }

        const orderData = foundDoc.data();
        const fullOrderId = foundDoc.id;

        // B) COMPROBAR SI YA EXISTE INCIDENCIA ABIERTA
        const qIncidents = query(collection(db, 'incidents'), where('orderId', '==', fullOrderId));
        const snapIncidents = await getDocs(qIncidents);

        if (!snapIncidents.empty) {
            // ¡Ya existe! La mostramos directamente
            const ticketData = snapIncidents.docs[0].data();
            setExistingTicket({ id: snapIncidents.docs[0].id, ...ticketData });
            setRealOrderId(fullOrderId);
            setStep(3); // Vamos directo a la vista de seguimiento
        } else {
            // No existe, vamos a crearla
            setRealOrderId(fullOrderId);
            // Guardamos los productos del pedido para mostrarlos
            setOrderItems(orderData.items || []); 
            setStep(2);
        }

    } catch(error) {
        console.error(error);
        alert("Error al buscar.");
    }
    setLoading(false);
  };

  // Manejar selección de productos
  const toggleItem = (item, isChecked) => {
    const newSelected = { ...selectedItems };
    if (isChecked) {
        newSelected[item.id || item.name] = 1; // Por defecto 1 unidad
    } else {
        delete newSelected[item.id || item.name];
    }
    setSelectedItems(newSelected);
  };

  const changeQuantity = (itemId, qty, max) => {
    if (qty < 1) qty = 1;
    if (qty > max) qty = max;
    setSelectedItems(prev => ({ ...prev, [itemId]: parseInt(qty) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(selectedItems).length === 0) {
        alert("Selecciona al menos un producto afectado."); return;
    }
    setLoading(true);

    try {
      // 1. Subir archivos
      const fileUrls = [];
      for (const file of files) {
        const storageRef = ref(storage, `incidents/${realOrderId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        fileUrls.push({ name: file.name, url, type: file.type });
      }

      // Preparar lista de items afectados para guardar
      const affectedItems = orderItems
        .filter(item => selectedItems[item.id || item.name])
        .map(item => ({
            name: item.name,
            selectedQty: selectedItems[item.id || item.name],
            originalQty: item.quantity, // Asumiendo que el pedido guarda 'quantity'
            image: item.image || '' // Si tienes fotos del producto
        }));

      // 2. Crear Ticket
      const docRef = await addDoc(collection(db, 'incidents'), {
        orderId: realOrderId,
        displayId: orderIdInput.replace(/^#/, ''),
        userEmail: email,
        description,
        affectedItems, // Guardamos qué productos fallaron
        evidence: fileUrls,
        status: 'open',
        adminReply: '',
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      // 3. Email con Enlace Directo
      // Generamos un link falso simulado. Si tu web está en midominio.com:
      // midominio.com/?ticketId=ID_DEL_DOC
      const trackingLink = `${window.location.origin}/?ticketId=${docRef.id}`;

      await addDoc(collection(db, 'mail'), {
        to: [email],
        message: {
          subject: `Incidencia Registrada: Pedido #${realOrderId.slice(0,6)}`,
          html: `<h3>Incidencia Recibida</h3>
                 <p>Hemos registrado tu problema con los siguientes productos:</p>
                 <ul>${affectedItems.map(i => `<li>${i.selectedQty}x ${i.name}</li>`).join('')}</ul>
                 <p><strong>Motivo:</strong> ${description}</p>
                 <p>Puedes seguir el estado de tu incidencia haciendo clic aquí:</p>
                 <a href="${trackingLink}" style="padding:10px 20px; background:red; color:white; text-decoration:none; border-radius:5px;">Ver Estado Incidencia</a>`
        }
      });

// --- AQUÍ ESTÁ EL CAMBIO PRINCIPAL ---
      setLoading(false);
      setShowSuccessBanner(true); // 1. Mostramos el cartel

      // 2. Programamos la redirección a los 10 segundos
      setTimeout(() => {
          setView('home'); 
      }, 10000); 

    } catch (error) {
      console.error(error);
      alert("Error al enviar.");
      setLoading(false);
    }
  };

  // --- RENDERIZADO ---

    // VISTA ESPECIAL: CARTEL DE ÉXITO (Sobrescribe todo lo demás si está activo)
  if (showSuccessBanner) return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
              {/* Barra de progreso de 10s (opcional, visual) */}
              <div className="absolute bottom-0 left-0 h-2 bg-green-500 transition-all duration-[10000ms] ease-linear w-full" style={{width: '0%'}} ref={el => el && setTimeout(() => el.style.width = '100%', 100)}></div>

              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Incidencia Enviada!</h2>
              <p className="text-gray-600 mb-6">
                  Hemos recibido tu reporte correctamente. Te hemos enviado un correo de confirmación.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm text-gray-500">
                  Serás redirigido a la página principal en <span className="font-bold text-gray-800">10 segundos</span>...
              </div>

              <button 
                  onClick={() => setView('home')} 
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors"
              >
                  Volver al Inicio ahora
              </button>
          </div>
      </div>
  );

  // VISTA 1: FORMULARIO BÚSQUEDA
  if (step === 1) return (
    <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in">
      <h2 className="text-3xl font-bold mb-6 text-red-600 flex items-center gap-2">
        <AlertTriangle className="w-8 h-8"/> Centro de Soporte
      </h2>
      <form onSubmit={verifyOrder} className="bg-white p-6 rounded-xl shadow space-y-4 border border-gray-200">
          <p className="text-sm text-gray-600">Introduce los datos para localizar tu pedido o ver una incidencia existente.</p>
          <Input label="Referencia (Ej. 8A2F)" value={orderIdInput} onChange={e => setOrderIdInput(e.target.value)} required />
          <Input label="Email de Compra" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Button type="submit" disabled={loading} className="w-full h-12">{loading ? 'Buscando...' : 'Gestionar Incidencia'}</Button>
      </form>
      <button onClick={() => setView('home')} className="mt-6 w-full text-center text-gray-400 text-sm">Volver al Inicio</button>
    </div>
  );

// VISTA 2: SELECCIÓN Y ARCHIVOS (AQUÍ ESTÁ EL CAMBIO VISUAL)
  if (step === 2) return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
       <h2 className="text-2xl font-bold mb-4">Detalles de la incidencia</h2>
       <form onSubmit={handleSubmit} className="space-y-6">
           {/* Selector Productos */}
           <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
               <h3 className="font-bold mb-3 text-gray-700">1. Productos afectados</h3>
               <div className="space-y-3">
                   {orderItems.map((item, idx) => {
                       const itemId = item.id || item.name;
                       const isSelected = !!selectedItems[itemId];
                       const maxQty = item.quantity || 1;
                       return (
                           <div key={idx} className={`flex items-center gap-4 p-3 rounded-lg border ${isSelected ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>
                               <input type="checkbox" className="w-5 h-5 accent-red-600" checked={isSelected} onChange={(e) => toggleItem(item, e.target.checked)}/>
                               {item.image && <img src={item.image} alt="" className="w-12 h-12 object-cover rounded" />}
                               <div className="flex-1">
                                   <div className="font-bold text-sm">{item.name}</div>
                                   {item.size && <div className="text-xs text-gray-500">Talla: {item.size}</div>}
                               </div>
                               {isSelected && (
                                   <div className="flex items-center gap-2">
                                       <span className="text-xs text-gray-500">Cant:</span>
                                       <input type="number" min="1" max={maxQty} value={selectedItems[itemId]} onChange={(e) => changeQuantity(itemId, e.target.value, maxQty)} className="w-16 p-1 border rounded text-center"/>
                                   </div>
                               )}
                           </div>
                       );
                   })}
               </div>
           </div>

           {/* Descripción y Archivos */}
           <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
               <h3 className="font-bold mb-3 text-gray-700">2. Descripción y Pruebas</h3>
               <textarea className="w-full border p-3 rounded h-32 text-sm mb-4" required placeholder="Describe el motivo del problema..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
               
               <label className="block text-sm font-bold mb-2">Fotos o Videos (Arrastrar o seleccionar)</label>
               
               {/* --- ZONA DRAG & DROP --- */}
               <div 
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors relative ${
                      isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:bg-gray-50'
                  }`}
               >
                   <input 
                       type="file" 
                       multiple 
                       accept="image/*,video/*" 
                       onChange={handleFileSelect}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                   />
                   <div className="flex flex-col items-center gap-2 text-gray-400 pointer-events-none">
                       <Upload className={`w-10 h-10 ${isDragging ? 'text-red-500' : 'text-gray-400'}`}/>
                       <span className="text-sm font-medium">
                           {isDragging ? '¡Suelta los archivos aquí!' : 'Haz clic o arrastra archivos aquí'}
                       </span>
                       <span className="text-xs">Soporta imágenes y videos</span>
                   </div>
               </div>

               {/* --- LISTA DE ARCHIVOS SELECCIONADOS --- */}
               {files.length > 0 && (
                   <div className="mt-4 space-y-2">
                       <p className="text-xs font-bold text-gray-500 uppercase">Archivos seleccionados ({files.length}):</p>
                       {files.map((f, i) => (
                           <div key={i} className="flex items-center justify-between bg-gray-100 p-2 rounded border border-gray-200 text-sm">
                               <div className="flex items-center gap-2 overflow-hidden">
                                   <FileText className="w-4 h-4 text-blue-500 flex-shrink-0"/>
                                   <span className="truncate text-gray-700">{f.name}</span>
                                   <span className="text-xs text-gray-400">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                               </div>
                               <button 
                                   type="button"
                                   onClick={() => removeFile(i)} 
                                   className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                   title="Eliminar archivo"
                               >
                                   <Trash2 className="w-4 h-4"/>
                               </button>
                           </div>
                       ))}
                   </div>
               )}
           </div>

           <Button type="submit" disabled={loading} className="w-full bg-red-600 h-12 text-lg shadow-xl">
               {loading ? 'Enviando...' : 'Tramitar Incidencia'}
           </Button>
       </form>
       <button onClick={() => setStep(1)} className="mt-4 w-full text-center text-gray-400 text-sm">Cancelar</button>
    </div>
  );

  // VISTA 3: ESTADO / SEGUIMIENTO (Si ya existía o se acaba de crear)
    if (step === 3 && existingTicket) return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              
              {/* Encabezado del Ticket */}
              <div className={`p-6 text-center border-b ${
                  existingTicket.status === 'open' ? 'bg-red-50' : 
                  existingTicket.status === 'resolved_pending' ? 'bg-yellow-50' : 'bg-green-50'
              }`}>
                  <h2 className="text-xl font-bold text-gray-800">
                      {existingTicket.status === 'open' ? 'Incidencia Abierta' : 
                       existingTicket.status === 'resolved_pending' ? 'Respuesta Recibida' : 'Incidencia Cerrada'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Ref: {existingTicket.orderId.slice(0,8)}...</p>
              </div>

              {/* --- HISTORIAL / CONTEXTO (Estilo Chat) --- */}
              <div className="p-6 bg-gray-50 space-y-6 max-h-[500px] overflow-y-auto">
                  
                  {/* 1. Mensaje Original del Usuario */}
                  <div className="flex flex-col items-end">
                      <div className="bg-white border border-gray-200 text-gray-800 p-4 rounded-t-xl rounded-bl-xl shadow-sm max-w-[90%] text-sm text-left">
                          <p className="font-bold text-xs text-red-600 mb-1">Tú (Descripción original):</p>
                          {existingTicket.description}
                          {/* Mostrar items afectados si existen */}
                          {existingTicket.affectedItems && (
                             <ul className="mt-2 text-xs bg-gray-100 p-2 rounded">
                                {existingTicket.affectedItems.map((i,k)=> <li key={k}>• {i.selectedQty}x {i.name}</li>)}
                             </ul>
                          )}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">
                          {existingTicket.createdAt?.seconds ? new Date(existingTicket.createdAt.seconds * 1000).toLocaleString() : 'Inicio'}
                      </span>
                  </div>

                  {/* 2. Historial de mensajes previos (si guardamos array 'messages' en el futuro) */}
                  {/* Por ahora, mostramos la respuesta del admin si existe */}
                  {existingTicket.adminReply && (
                      <div className="flex flex-col items-start">
                          <div className="bg-blue-600 text-white p-4 rounded-t-xl rounded-br-xl shadow-md max-w-[90%] text-sm text-left">
                              <p className="font-bold text-xs text-blue-200 mb-1">Soporte FotoEsport:</p>
                              {existingTicket.adminReply}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1">
                              {existingTicket.resolvedAt ? new Date(existingTicket.resolvedAt).toLocaleString() : 'Reciente'}
                          </span>
                      </div>
                  )}

                  {/* 3. Mensaje de Reapertura (Si el usuario está escribiendo) */}
                  {isReopening && (
                      <div className="flex flex-col items-end animate-fade-in">
                          <div className="bg-white border-2 border-red-100 p-4 rounded-xl w-full shadow-sm">
                              <label className="text-sm font-bold text-gray-700 mb-2 block">¿Por qué no estás de acuerdo?</label>
                              <textarea 
                                  autoFocus
                                  className="w-full border p-2 text-sm rounded h-24 focus:ring-2 focus:ring-red-500 outline-none"
                                  placeholder="Explícanos qué falta o por qué la solución no es válida..."
                                  value={rejectionReason}
                                  onChange={e => setRejectionReason(e.target.value)}
                              ></textarea>
                              <div className="flex justify-end gap-2 mt-2">
                                  <button onClick={() => setIsReopening(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1">Cancelar</button>
                                  <button 
                                      onClick={async () => {
                                          if(!rejectionReason.trim()) return alert("Debes indicar un motivo.");
                                          setLoading(true);
                                          
                                          // Construimos el nuevo historial añadiendo la respuesta antigua y el nuevo motivo
                                          // Nota: Añadimos esto a la descripción o a un campo 'history' para que el admin lo vea
                                          const newDescription = `${existingTicket.description}\n\n--- [REAPERTURA ${new Date().toLocaleDateString()}] ---\nCliente dice: "${rejectionReason}"`;

                                          await updateDoc(doc(db, 'incidents', existingTicket.id), { 
                                              status: 'open', 
                                              description: newDescription, // Actualizamos descripción para que el admin vea todo junto
                                              adminReply: deleteField(), // Borramos la respuesta anterior para que salga como pendiente
                                              reopenedAt: new Date().toISOString()
                                          });

                                          // Email al admin (opcional) o confirmación
                                          alert("Incidencia reabierta. El equipo revisará tu respuesta.");
                                          setExistingTicket(prev => ({...prev, status: 'open', description: newDescription, adminReply: null}));
                                          setIsReopening(false);
                                          setLoading(false);
                                      }} 
                                      className="bg-red-600 text-white text-xs px-4 py-2 rounded hover:bg-red-700 font-bold"
                                  >
                                      Enviar y Reabrir
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              {/* Botones de Acción (Solo si está pendiente de confirmar) */}
              {existingTicket.status === 'resolved_pending' && !isReopening && (
                  <div className="p-6 bg-white border-t flex flex-col sm:flex-row gap-3 justify-center">
                       <Button onClick={async () => {
                           if(!confirm("¿Confirmar que está resuelta?")) return;
                           await updateDoc(doc(db, 'incidents', existingTicket.id), { status: 'closed', closedAt: new Date().toISOString() });
                           setExistingTicket(prev => ({...prev, status: 'closed'}));
                       }} className="bg-green-600 w-full sm:w-auto">
                           ✅ Aceptar Solución
                       </Button>
                       
                       <Button variant="outline" onClick={() => {
                           setRejectionReason('');
                           setIsReopening(true); // Activa el formulario de chat de arriba
                       }} className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50">
                           ✋ No estoy de acuerdo
                       </Button>
                  </div>
              )}
              
              <div className="p-4 text-center">
                <button onClick={() => setView('home')} className="text-gray-400 text-sm hover:text-gray-600 underline">Volver al Inicio</button>
              </div>
          </div>
      </div>
  );
}