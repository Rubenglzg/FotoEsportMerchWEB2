import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Search, User, Package, Menu, X, Check, 
  CreditCard, Banknote, AlertCircle, BarChart3, Settings, 
  Image as ImageIcon, Trash2, ShieldCheck, Truck, LogOut,
  ChevronRight, ChevronLeft, Plus, Minus, Euro, LayoutDashboard,
  Filter, Upload, Save, Eye, FileText, UserX, Download, Mail, MessageSquare,
  Edit3, ToggleLeft, ToggleRight, Lock, Unlock, EyeOff, Folder, FileImage, CornerDownRight,
  ArrowRight, Calendar, Ban, Store, Calculator, DollarSign, FileSpreadsheet,
  Layers, Archive, Globe, AlertTriangle, RefreshCw, Briefcase, RotateCcw, MoveLeft, NotebookText,
  Landmark, Printer, FileDown, Users, Table,
  Hash, Factory, MapPin, Contact, Phone,
  Camera, Star, Award, ShoppingBag 
} from 'lucide-react';

import {  
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';

import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  serverTimestamp,
  orderBy,
  writeBatch,
  arrayUnion,
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';

import {  
  ref, 
  uploadBytes, 
  getDownloadURL,
  listAll,
  deleteObject
} from 'firebase/storage';

// --- Logo y colores ---
import { LOGO_URL, appId, AVAILABLE_COLORS } from './config/constants';

// Importamos nuestras herramientas de Firebase desde el archivo independiente
import { auth, db, storage } from './config/firebase';

// Importamos plantillas de emails desde el archivo independiente
import { generateStockEmailHTML, generateEmailHTML, generateInvoiceEmailHTML } from './utils/emailTemplates';

// Importamos plantillas de Excel y Pdf desde el archivo independiente
import { generateBatchExcel } from './utils/excelExport';
import { printBatchAlbaran } from './utils/printTemplates';

// --- 🧩 COMPONENTES VISUALES (Nuestras "piezas de Lego" de diseño) ---
// Importamos los botones y etiquetas genéricas. Al estar separados, 
// mantenemos este archivo principal mucho más limpio y enfocado en la lógica.
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';
import { Input } from './components/ui/Input';

// --- 📄 VISTAS / PÁGINAS ---
// Separamos cada pantalla en su propio archivo
import { TrackingView } from './pages/TrackingView';
import { IncidentReportView } from './pages/IncidentReportView';
import { HomeView } from './pages/HomeView';
import { ShopView } from './pages/ShopView';
import { CartView } from './pages/CartView';
import { PhotoSearchView } from './pages/PhotoSearchView';
import { LoginView } from './pages/LoginView';
import { RightToForgetView } from './pages/RightToForgetView';
import { ClubDashboard } from './pages/ClubDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

// --- COMPONENTES DE ESTRUCTURA Y COMPARTIDOS ---
import { CompanyLogo } from './components/layout/CompanyLogo';
import { CampaignDecorations } from './components/shared/CampaignDecorations';

// --- HERRAMIENTAS DE ADMINISTRACIÓN ---
import { FilesManager } from './components/admin/FilesManager';
import { SupplierManager } from './components/admin/SupplierManager';

// --- HELPER FUNCTIONS ---
const getClubFolders = (clubId) => {
    if (!clubId) return [];
    const clubPhotos = MOCK_PHOTOS_DB.filter(p => p.clubId === clubId);
    return [...new Set(clubPhotos.map(p => p.folder))];
};

const getFolderPhotos = (clubId, folderName) => {
    if (!clubId || !folderName) return [];
    return MOCK_PHOTOS_DB.filter(p => p.clubId === clubId && p.folder === folderName);
};


function OrderSuccessView({ setView }) {
    return (
        <div className="text-center py-20 animate-fade-in-up">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"><Check className="w-12 h-12 text-green-600" /></div>
            <h2 className="text-3xl font-bold mb-4">¡Pedido Realizado con Éxito!</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-8">Hemos recibido tu pedido correctamente.</p>
            <div className="flex justify-center gap-4"><Button onClick={() => setView('home')}>Volver al Inicio</Button><Button variant="outline" onClick={() => setView('tracking')}>Ir al Seguimiento</Button></div>
        </div>
    );
}

// --- COMPONENTES NUEVOS PARA EL FOOTER ---

function PrivacyPolicyView({ setView }) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in">
      <button onClick={() => setView('home')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-medium">
        <ChevronLeft className="w-4 h-4" /> Volver al Inicio
      </button>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h1 className="text-3xl font-black text-gray-900 mb-8 border-b pb-4">Política de Privacidad</h1>
        
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">1. Responsable del Tratamiento</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            El responsable del tratamiento de sus datos personales es <strong>FOTOESPORT MERCH</strong> (en adelante, "el Prestador"), comprometido con la protección de la privacidad y el uso correcto de los datos personales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">2. Finalidad del Tratamiento</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Sus datos personales serán tratados con las siguientes finalidades:
          </p>
          <ul className="list-disc pl-5 mt-2 text-gray-600 text-sm space-y-1">
            <li>Gestión de pedidos y compras realizadas en la plataforma.</li>
            <li>Atención de consultas, incidencias y solicitudes de soporte.</li>
            <li>Envío de comunicaciones relacionadas con el estado de sus pedidos.</li>
            <li>Cumplimiento de obligaciones legales y fiscales.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">3. Legitimación</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            La base legal para el tratamiento de sus datos es la ejecución del contrato de compraventa al realizar un pedido y el consentimiento expreso del usuario al contactar o registrarse.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">4. Destinatarios de los datos</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Sus datos no serán cedidos a terceros salvo obligación legal o cuando sea necesario para la prestación del servicio (ej. proveedores de logística o su propio Club deportivo para la entrega).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">5. Derechos del Usuario</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-2">
            Puede ejercer sus derechos de acceso, rectificación, supresión, limitación y oposición enviando una solicitud a través de nuestro formulario de contacto o al email de soporte.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800">
              <strong>Derecho al Olvido (RGPD):</strong> Disponemos de una herramienta específica para solicitar el borrado de sus imágenes y datos. <button onClick={() => setView('right-to-forget')} className="underline font-bold hover:text-blue-600">Acceder aquí</button>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function LegalNoticeView({ setView }) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in">
      <button onClick={() => setView('home')} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-medium">
        <ChevronLeft className="w-4 h-4" /> Volver al Inicio
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h1 className="text-3xl font-black text-gray-900 mb-8 border-b pb-4">Aviso Legal</h1>
        
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">1. Datos Identificativos</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            En cumplimiento con el deber de información recogido en la Ley 34/2002, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI), se informa que el titular de este sitio web es <strong>FOTOESPORT MERCH</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">2. Usuarios</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            El acceso y/o uso de este portal atribuye la condición de USUARIO, que acepta, desde dicho acceso y/o uso, las Condiciones Generales de Uso aquí reflejadas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">3. Uso del Portal</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            El sitio web proporciona el acceso a multitud de informaciones, servicios, programas o datos (en adelante, "los contenidos") en Internet pertenecientes a FOTOESPORT MERCH o a sus licenciantes. El USUARIO asume la responsabilidad del uso del portal y se compromete a hacer un uso adecuado de los contenidos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">4. Propiedad Intelectual e Industrial</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            FOTOESPORT MERCH es titular de todos los derechos de propiedad intelectual e industrial de su página web, así como de los elementos contenidos en la misma (imágenes, sonido, audio, vídeo, software o textos; marcas o logotipos, combinaciones de colores, estructura y diseño, etc.). <strong>Queda expresamente prohibida la reproducción, distribución y comunicación pública de las imágenes sin autorización.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-2">5. Exclusión de Garantías y Responsabilidad</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            FOTOESPORT MERCH no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier naturaleza que pudieran ocasionar, a título enunciativo: errores u omisiones en los contenidos, falta de disponibilidad del portal o la transmisión de virus o programas maliciosos o lesivos en los contenidos, a pesar de haber adoptado todas las medidas tecnológicas necesarias para evitarlo.
          </p>
        </section>
      </div>
    </div>
  );
}

function Footer({ setView }) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Columna 1: Marca */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
               {/* Usamos un logo simple o el componente CompanyLogo si está disponible en el scope */}
               <div className="font-black text-xl tracking-tighter text-gray-900">
                  FOTOESPORT<span className="text-emerald-600">MERCH</span>
               </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Capturando la pasión del deporte. Tienda oficial de merchandising personalizado para clubes y eventos deportivos.
            </p>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase mb-4">Tienda</h3>
            <ul className="space-y-2">
              <li><button onClick={() => setView('home')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Inicio</button></li>
              <li><button onClick={() => setView('shop')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Catálogo</button></li>
              <li><button onClick={() => setView('photo-search')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Buscar Fotos</button></li>
              <li><button onClick={() => setView('tracking')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Seguimiento</button></li>
            </ul>
          </div>

          {/* Columna 3: Soporte */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase mb-4">Ayuda</h3>
            <ul className="space-y-2">
              <li><button onClick={() => setView('incident-report')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Reportar Incidencia</button></li>
              <li><button onClick={() => setView('right-to-forget')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Derecho al Olvido</button></li>
              <li><button onClick={() => setView('login')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Acceso Clubes</button></li>
            </ul>
          </div>

          {/* Columna 4: Legal */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><button onClick={() => setView('privacy')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Política de Privacidad</button></li>
              <li><button onClick={() => setView('legal')} className="text-gray-500 hover:text-emerald-600 text-sm transition-colors">Aviso Legal</button></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} FotoEsport Merch. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            {/* Iconos sociales de ejemplo */}
            <div className="flex gap-4 text-gray-400">
                <Globe className="w-5 h-5 hover:text-gray-600 cursor-pointer"/>
                <Mail className="w-5 h-5 hover:text-gray-600 cursor-pointer"/>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('home'); 
  const [cart, setCart] = useState([]);
  const [role, setRole] = useState('public'); 
  const [currentClub, setCurrentClub] = useState(null); 
  const [notification, setNotification] = useState(null); 
  const [confirmation, setConfirmation] = useState(null); 
  const [suppliers, setSuppliers] = useState([]); 
  
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [seasons, setSeasons] = useState([]);
  
    const [financialConfig, setFinancialConfig] = useState({ 
        clubCommissionPct: 0.12, 
        commercialCommissionPct: 0.05,
        gatewayPercentFee: 0.015, 
        gatewayFixedFee: 0.25,
        modificationFee: 1.00 // <--- NUEVO CAMPO (Valor por defecto)
    });

  const [storeConfig, setStoreConfig] = useState({ isOpen: true, closedMessage: "Tienda cerrada temporalmente por mantenimiento. Disculpen las molestias." });

    // --- NUEVO: ESTADO PARA CAMPAÑAS ---
    const [campaignConfig, setCampaignConfig] = useState({ 
        active: false, 
        type: 'none', // 'christmas', 'black_friday', 'summer'
        discount: 0, 
        bannerMessage: '' 
    });

    // Cargar configuración de campaña al iniciar
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'campaigns'), (docSnap) => {
            if (docSnap.exists()) {
                setCampaignConfig(docSnap.data());
            }
        });
        return () => unsub();
    }, []);

  useEffect(() => { const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } }; initAuth(); const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u)); return () => unsubscribe(); }, []);
  
// Detectar si venimos desde un email con ID de ticket
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get('ticketId');
    if (ticketId) {
       // Si hay ticket en la URL, vamos directo a la vista de incidencias
       // Nota: IncidentReportView necesitará lógica para cargar ticket por ID si se pasa como prop
       // O, opción sencilla: Simplemente cambiamos la vista y el usuario pone su email
       setView('incident-report');
       
       // Truco visual: Pre-rellenar input si quieres (requiere mover estados a App, pero con cambiar la vista basta por ahora)
       // El usuario verá el formulario, pondrá su email y le saldrá el ticket directo.
    }
  }, []);

    const getThemeClass = () => {
        if (!campaignConfig?.active) return 'bg-gray-50';
        if (campaignConfig.type === 'black_friday') return 'bg-slate-900 text-slate-100'; 
        if (campaignConfig.type === 'christmas') return 'bg-red-50';
        return 'bg-gray-50';
    };

  // --- NUEVO: Redirección automática tras éxito ---
  useEffect(() => {
    let timer;
    if (view === 'success') {
      // Esperar 5 segundos y volver al inicio (landing)
      timer = setTimeout(() => {
        setView('home'); 
        // Opcional: Si quieres que vuelva a la tienda del club:
        // setView('club-store'); 
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [view]);

  useEffect(() => { if (!user) return; const ordersQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); const unsubOrders = onSnapshot(ordersQuery, (snapshot) => { const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); ordersData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds); setOrders(ordersData); }, (err) => console.error("Error fetching orders:", err)); return () => unsubOrders(); }, [user]);

    // --- NUEVO: Cargar PROVEEDORES ---
    useEffect(() => {
        const q = query(collection(db, 'suppliers'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const supData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSuppliers(supData);
        });
        return () => unsubscribe();
    }, []);

  // Cargar Configuración Financiera Global
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'financial'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setFinancialConfig({
                    ...data,
                    // Aseguramos que existan todos los campos
                    gatewayPercentFee: data.gatewayPercentFee !== undefined ? data.gatewayPercentFee : 0.015,
                    gatewayFixedFee: data.gatewayFixedFee !== undefined ? data.gatewayFixedFee : 0.25,
                    modificationFee: data.modificationFee !== undefined ? data.modificationFee : 1.00 // <--- CARGAR
                });
            } else {
                const initialConfig = { 
                    commercialCommissionPct: 0.05,
                    gatewayPercentFee: 0.015,
                    gatewayFixedFee: 0.25,
                    modificationFee: 1.00
                };
                setFinancialConfig(initialConfig);
            }
        });
        return () => unsub();
    }, []);

  // Cargar PRODUCTOS en tiempo real
  useEffect(() => {
      const q = query(collection(db, 'products'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProducts(productsData);
      }, (error) => console.error("Error productos:", error));
      return () => unsubscribe();
  }, []);

  // Cargar CLUBES en tiempo real
  useEffect(() => {
      const q = query(collection(db, 'clubs'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setClubs(clubsData);
      }, (error) => console.error("Error clubes:", error));
      return () => unsubscribe();
  }, []);

  // --- NUEVO: Cargar temporadas en tiempo real desde Firebase ---
  useEffect(() => {
      // Nos conectamos a la colección 'seasons'
      const q = query(collection(db, 'seasons'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const seasonsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Si hay datos en la BD, los usamos. Si no, usamos los iniciales por defecto.
          if (seasonsData.length > 0) {
              // Ordenamos por fecha de inicio (las más nuevas primero o al revés, según prefieras)
              seasonsData.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
              setSeasons(seasonsData);
          } else {
              setSeasons(SEASONS_INITIAL);
          }
      }, (error) => {
          console.error("Error cargando temporadas:", error);
      });

      return () => unsubscribe();
  }, []);

  const addToCart = (product, customization, finalPrice) => { if (!storeConfig.isOpen) { showNotification('La tienda está cerrada temporalmente.', 'error'); return; } setCart([...cart, { ...product, ...customization, price: finalPrice, cartId: Date.now() }]); showNotification('Producto añadido al carrito'); };
  const removeFromCart = (cartId) => { setCart(cart.filter(item => item.cartId !== cartId)); };
  
  // --- FUNCIÓN CREAR PEDIDO (ACTUALIZADA CON EMAIL FACTURA) ---
  const createOrder = async (orderData) => {
      try {
          // 1. Determinar estado inicial
          // Si es efectivo, nace como "pendiente_validacion"
          // Si es tarjeta, nace como "recopilando"
          const initialStatus = orderData.paymentMethod === 'cash' ? 'pendiente_validacion' : 'recopilando';
          const visibleStatus = orderData.paymentMethod === 'cash' ? 'Pendiente Pago' : 'Recopilando';

          // 2. Buscar lote activo del club
          const club = clubs.find(c => c.id === orderData.clubId);
          const activeBatch = club ? (club.activeGlobalOrderId || 1) : 1;

          // 3. Crear documento en Firestore
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
              ...orderData,
              status: initialStatus,
              visibleStatus: visibleStatus,
              createdAt: serverTimestamp(),
              globalBatch: activeBatch,
              manualSeasonId: seasons.length > 0 ? seasons[seasons.length - 1].id : 'default' // Asigna temporada actual
          });

          // 4. LÓGICA DE EMAIL DE FACTURA
          // Si NO es efectivo (es tarjeta), enviamos factura YA.
          if (orderData.paymentMethod !== 'cash') {
              if (orderData.customer.email) {
                  const mailRef = doc(collection(db, 'mail'));
                  // Añadimos el ID generado al objeto para la plantilla
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

          // 5. Limpiezas finales
          setCart([]);
          setView('success');
          
      } catch (error) {
          console.error("Error creando pedido:", error);
          alert("Hubo un error al procesar el pedido. Inténtalo de nuevo.");
      }
  };
  const createSpecialOrder = async (orderData) => { 
      try { 
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), { 
              ...orderData, 
              createdAt: serverTimestamp(), 
              status: 'en_produccion', 
              visibleStatus: 'Pedido Especial en Curso', 
              type: 'special', 
              globalBatch: 'SPECIAL', // <--- CAMBIO AQUÍ (Antes era club.activeGlobalOrderId)
              incidents: [] 
          }); 
          showNotification('Pedido especial registrado con éxito'); 
      } catch(e) { 
          showNotification('Error al crear pedido especial', 'error'); 
      } 
  };

  // --- FUNCIÓN ACTUALIZAR ESTADO (ACTUALIZADA CON EMAIL AL VALIDAR EFECTIVO) ---
  const updateOrderStatus = async (orderId, newStatus, visibleStatus, orderData) => {
      try {
          const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
          
          // 1. Actualizar Estado
          await updateDoc(orderRef, { 
              status: newStatus, 
              visibleStatus: visibleStatus 
          });

          // 2. LÓGICA ESPECIAL: VALIDACIÓN DE EFECTIVO
          // Si el pedido era efectivo Y el nuevo estado es 'recopilando' (significa que el club lo ha validado)
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
                  return; // Salimos para no enviar doble notificación si hubiera
              }
          }

          showNotification('Estado del pedido actualizado');
      } catch (error) {
          console.error("Error actualizando estado:", error);
          showNotification('Error al actualizar el estado', 'error');
      }
  };

  const addIncident = async (orderId, incidentData) => { try { const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); await updateDoc(orderRef, { incidents: arrayUnion(incidentData) }); showNotification('Incidencia/Reimpresión registrada'); } catch (e) { showNotification('Error registrando incidencia', 'error'); } };
  const updateIncidentStatus = async (orderId, incidents) => { try { const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); await updateDoc(orderRef, { incidents }); showNotification('Estado de incidencia actualizado'); } catch(e) { showNotification('Error actualizando incidencia', 'error'); } };
  // --- ACTUALIZAR ESTADO DE LOTE GLOBAL (CON CONFIRMACIÓN DE CIERRE) ---


    const incrementClubGlobalOrder = (clubId) => { 
      const club = clubs.find(c => c.id === clubId);
      setConfirmation({ 
          msg: `¿Cerrar el Pedido Global #${club.activeGlobalOrderId}? Se abrirá el #${club.activeGlobalOrderId + 1}.`, 
          onConfirm: async () => { 
              try {
                  await updateDoc(doc(db, 'clubs', clubId), { activeGlobalOrderId: club.activeGlobalOrderId + 1 });
                  showNotification(`Nuevo Pedido Global iniciado`); 
              } catch (e) { console.error(e); }
          } 
      }); 
  };

    // --- FUNCIÓN QUE FALTABA PARA CERRAR LOTE DE ERRORES ---
    const incrementClubErrorBatch = (clubId) => {
        const club = clubs.find(c => c.id === clubId);
        // Si no existe el campo en base de datos, asumimos que es el 1
        const currentErrId = club.activeErrorBatchId || 1;
        
        setConfirmation({ 
            msg: `¿Cerrar el Lote de Errores #${currentErrId}? \nLos siguientes fallos irán al #${currentErrId + 1}.`, 
            title: "Cerrar Lote de Errores",
            onConfirm: async () => { 
                try {
                    // Actualizamos el contador en Firebase
                    await updateDoc(doc(db, 'clubs', clubId), { activeErrorBatchId: currentErrId + 1 });
                    showNotification(`Nuevo Lote de Errores iniciado (#${currentErrId + 1})`); 
                } catch (e) { 
                    console.error(e); 
                    showNotification("Error al cerrar el lote", "error");
                }
            } 
        }); 
    };

  const decrementClubGlobalOrder = async (clubId, newActiveId) => { 
      try {
          await updateDoc(doc(db, 'clubs', clubId), { activeGlobalOrderId: newActiveId });
          showNotification(`Se ha reabierto el Pedido Global #${newActiveId}`); 
      } catch (e) { console.error(e); }
  };
  
  // --- FUNCIONES CONECTADAS A BASE DE DATOS ---

    const updateProduct = async (updatedProduct, newImageFile) => { 
        try {
            let finalProduct = { ...updatedProduct };
            
            // Si hay archivo nuevo, lo subimos a la carpeta "Productos"
            if (newImageFile) {
                const storageRef = ref(storage, `Productos/${Date.now()}_${newImageFile.name}`);
                await uploadBytes(storageRef, newImageFile);
                const url = await getDownloadURL(storageRef);
                finalProduct.image = url;
            }

            const prodRef = doc(db, 'products', finalProduct.id);
            await updateDoc(prodRef, finalProduct);
            showNotification('Producto guardado correctamente');
        } catch (e) { 
            console.error(e); 
            showNotification('Error al actualizar producto', 'error'); 
        }
    };

  const updateFinancialConfig = async (newConfig) => {
    try {
        // Guardamos en la colección 'settings', documento 'financial'
        await setDoc(doc(db, 'settings', 'financial'), newConfig);
        showNotification('Configuración comercial guardada');
    } catch (error) {
        console.error(error);
        showNotification('Error al guardar configuración', 'error');
    }
};

  const addProduct = async () => { 
      const newProduct = { 
          name: 'Nuevo Producto', 
          price: 10.00, 
          cost: 5.00, 
          category: 'General', 
          image: 'https://via.placeholder.com/300', 
          stockType: 'internal', 
          stock: 0, 
          features: { name: true, number: true, photo: false, shield: true, color: false }, 
          defaults: { name: true, number: true, photo: false, shield: true }, 
          modifiable: { name: true, number: true, photo: false, shield: true },
          createdAt: serverTimestamp()
      }; 
      try {
          await addDoc(collection(db, 'products'), newProduct);
          showNotification('Producto creado en BD');
      } catch (e) { console.error(e); showNotification('Error al crear', 'error'); }
  };

  // --- FUNCIONES DE PROVEEDORES ---
  const createSupplier = async (data) => {
      try {
          await addDoc(collection(db, 'suppliers'), { ...data, createdAt: serverTimestamp() });
          showNotification('Proveedor creado');
      } catch (e) { showNotification('Error creando proveedor', 'error'); }
  };

  const updateSupplier = async (data) => {
      try {
          const ref = doc(db, 'suppliers', data.id);
          await updateDoc(ref, data);
          showNotification('Proveedor actualizado');
      } catch (e) { showNotification('Error actualizando proveedor', 'error'); }
  };

  const deleteSupplier = (id) => {
      setConfirmation({
          msg: '¿Eliminar proveedor? Los productos vinculados conservarán su coste actual pero quedarán sin asignar.',
          onConfirm: async () => {
              try {
                  await deleteDoc(doc(db, 'suppliers', id));
                  showNotification('Proveedor eliminado');
              } catch (e) { showNotification('Error al eliminar', 'error'); }
          }
      });
  };

  const updateProductCostBatch = async (supplierId, priceList) => {
      try {
          const batch = writeBatch(db);
          let count = 0;
          for (const [prodId, newCost] of Object.entries(priceList)) {
              const prodRef = doc(db, 'products', prodId);
              batch.update(prodRef, { supplierId: supplierId, cost: parseFloat(newCost) });
              count++;
          }
          if(count > 0) {
              await batch.commit();
              showNotification(`${count} productos actualizados.`);
          }
      } catch (e) { showNotification('Error sincronizando costes', 'error'); }
  };

  const deleteProduct = (id) => { 
      setConfirmation({ 
          msg: '¿Eliminar producto de la base de datos?', 
          onConfirm: async () => { 
              try {
                  await deleteDoc(doc(db, 'products', id));
                  showNotification('Producto eliminado'); 
              } catch (e) { console.error(e); showNotification('Error al eliminar', 'error'); }
          } 
      }); 
  };

// --- FUNCIÓN MEJORADA: CREAR CLUB CON LOGO Y CREDENCIALES ---
  const createClub = async (clubData, logoFile) => {
      try {
          let logoUrl = '';
          
          // 1. Si hay logo, lo subimos al Storage
          if (logoFile) {
              const logoRef = ref(storage, `club-logos/${Date.now()}_${logoFile.name}`);
              await uploadBytes(logoRef, logoFile);
              logoUrl = await getDownloadURL(logoRef);
          }

          // 2. Guardamos los datos en Firestore (incluyendo usuario, pass y logo)
          await addDoc(collection(db, 'clubs'), {
              name: clubData.name,
              code: clubData.code,
              username: clubData.username, 
              pass: clubData.pass,         
              color: clubData.color,
              logoUrl: logoUrl,            
              commission: 0.12,
              blocked: false,
              activeGlobalOrderId: 1,
              cashPaymentEnabled: true, // <--- AÑADIDO: Por defecto activado
              createdAt: serverTimestamp()
          });
          
          showNotification('Club creado correctamente');
      } catch (error) {
          console.error("Error creando club:", error);
          showNotification('Error al crear el club', 'error');
      }
  };

    const updateClub = async (updatedClub, newLogoFile) => { 
        try {
            let finalClubData = { ...updatedClub };

            // Si hay un nuevo archivo de logo, lo subimos primero
            if (newLogoFile) {
                const logoRef = ref(storage, `club-logos/${Date.now()}_${newLogoFile.name}`);
                await uploadBytes(logoRef, newLogoFile);
                const logoUrl = await getDownloadURL(logoRef);
                finalClubData.logoUrl = logoUrl;
            }

            const clubRef = doc(db, 'clubs', finalClubData.id);
            await updateDoc(clubRef, finalClubData);
            showNotification('Club actualizado correctamente');
        } catch (e) { 
            console.error(e); 
            showNotification('Error al actualizar el club', 'error'); 
        }
    };

  const deleteClub = (clubId) => { 
      setConfirmation({ 
          msg: '¿Eliminar este club definitivamente?', 
          onConfirm: async () => { 
              try {
                  await deleteDoc(doc(db, 'clubs', clubId));
                  showNotification('Club eliminado'); 
              } catch (e) { console.error(e); showNotification('Error al borrar', 'error'); }
          } 
      }); 
  };

  const toggleClubBlock = async (clubId) => { 
      const club = clubs.find(c => c.id === clubId);
      if (!club) return;
      try {
          await updateDoc(doc(db, 'clubs', clubId), { blocked: !club.blocked });
          showNotification(club.blocked ? 'Club desbloqueado' : 'Club bloqueado');
      } catch (e) { console.error(e); showNotification('Error al cambiar estado', 'error'); }
  };



  const addSeason = async (newSeason) => {
      try {
          // Guardamos en la colección 'seasons' de Firebase
          await addDoc(collection(db, 'seasons'), {
              ...newSeason,
              hiddenForClubs: false, // Por defecto visible
              createdAt: serverTimestamp() // Guardamos cuándo se creó
          });
          showNotification('Temporada guardada correctamente en la base de datos');
      } catch (error) {
          console.error("Error al crear temporada:", error);
          showNotification('Error al guardar la temporada', 'error');
      }
  };
  const deleteSeason = async (seasonId) => {
      if(seasons.length <= 1) { 
          showNotification('Debe haber al menos una temporada activa.', 'error'); 
          return; 
      }
      
      setConfirmation({ 
          msg: '¿Eliminar esta temporada definitivamente de la base de datos?', 
          onConfirm: async () => { 
              try {
                  await deleteDoc(doc(db, 'seasons', seasonId));
                  showNotification('Temporada eliminada'); 
              } catch (error) {
                  console.error("Error al borrar:", error);
                  showNotification('Error al eliminar temporada', 'error');
              }
          } 
      }); 
  };
// --- FUNCIÓN NUEVA: OCULTAR/MOSTRAR TEMPORADAS ---
  const toggleSeasonVisibility = async (seasonId) => {
      const seasonToUpdate = seasons.find(s => s.id === seasonId);
      if (!seasonToUpdate) return;

      const newHiddenStatus = !seasonToUpdate.hiddenForClubs;

      // 1. Actualización Visual Inmediata (Optimista)
      setSeasons(seasons.map(s => 
          s.id === seasonId ? { ...s, hiddenForClubs: newHiddenStatus } : s
      ));

      // 2. Actualización en Base de Datos (DESCOMENTADO Y ACTIVO)
      try {
          // Referencia al documento de la temporada en Firebase
          const seasonRef = doc(db, 'seasons', seasonId); 
          
          // Actualizamos solo el campo de visibilidad
          await updateDoc(seasonRef, { hiddenForClubs: newHiddenStatus });
          
      } catch (error) {
          console.error("Error al actualizar visibilidad:", error);
          showNotification("Error al guardar cambios", "error");
          
          // Revertir el cambio visual si falla la base de datos
          setSeasons(seasons.map(s => 
              s.id === seasonId ? { ...s, hiddenForClubs: seasonToUpdate.hiddenForClubs } : s
          ));
      }
  };
  const showNotification = (msg, type = 'success') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 4000); };
  const handleLogin = (username, password) => { 
      if (username === 'admin' && password === 'admin123') { 
          setRole('admin'); 
          setView('admin-dashboard'); 
          showNotification('Bienvenido Administrador'); 
      } else { 
          // AHORA BUSCAMOS POR EL CAMPO 'username' O POR 'id' (para compatibilidad)
          const club = clubs.find(c => (c.username === username || c.id === username) && password === c.pass); 
          
          if (club) { 
              setRole('club'); 
              setCurrentClub(club); 
              setView('club-dashboard'); 
              showNotification(`Bienvenido ${club.name}`); 
          } else { 
              showNotification('Credenciales incorrectas', 'error'); 
          } 
      } 
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-green-100">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Pedido Realizado!</h2>
          
          <p className="text-gray-600 mb-6">
            Hemos recibido tu pedido correctamente.
            <br/><br/>
            <span className="font-semibold text-gray-800">Te acabamos de enviar un email con la factura y el recibo de tu compra.</span>
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 overflow-hidden">
            <div className="bg-green-500 h-1.5 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{width: '100%'}}></div>
          </div>

          <p className="text-sm text-gray-400">
            Volviendo al inicio en unos segundos...
          </p>

          <button 
            onClick={() => setView('home')}
            className="mt-6 text-green-600 font-medium hover:text-green-800 transition-colors"
          >
            Volver ahora
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`min-h-screen font-sans text-gray-800 transition-colors duration-500 ${getThemeClass()}`}>
        <CampaignDecorations config={campaignConfig} />
        {/* --- BANNER DE CAMPAÑA PRO --- */}
      {campaignConfig?.active && campaignConfig?.bannerMessage && (
        <div 
            className={`
                w-full py-3 px-4 text-center font-bold text-sm sticky z-[70] shadow-lg backdrop-blur-md
                flex justify-center items-center gap-3 overflow-hidden
                transition-all duration-500 ease-in-out border-b
                
                /* Estilos por tipo de campaña */
                ${campaignConfig.type === 'black_friday' 
                    ? 'bg-gradient-to-r from-gray-900 via-black to-gray-900 text-yellow-400 border-yellow-900/50' 
                    : ''}
                ${campaignConfig.type === 'christmas' 
                    ? 'bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white border-red-900 shadow-red-900/20' 
                    : ''}
                ${campaignConfig.type === 'summer' 
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white border-orange-400' 
                    : ''}
                ${campaignConfig.type === 'none' || !campaignConfig.type
                    ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-emerald-800' 
                    : ''}
            `} 
            style={{top: !storeConfig.isOpen ? '48px' : '0'}}
        >
            {/* Decoración izquierda */}
            {campaignConfig.type === 'christmas' && <span className="text-lg animate-bounce">🎄</span>}
            {campaignConfig.type === 'black_friday' && <span className="text-lg animate-pulse">🖤</span>}
            {campaignConfig.type === 'summer' && <span className="text-lg animate-spin-slow">☀️</span>}

            {/* Mensaje central */}
            <span className="tracking-wide drop-shadow-md uppercase text-xs md:text-sm">
                {campaignConfig.bannerMessage}
            </span>

            {/* Decoración derecha */}
            {campaignConfig.type === 'christmas' && <span className="text-lg animate-bounce" style={{animationDelay: '0.1s'}}>🎄</span>}
            {campaignConfig.type === 'black_friday' && <span className="text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded font-black transform -rotate-3 shadow-sm">OFICIAL</span>}
            {campaignConfig.type === 'summer' && <span className="text-lg">🏖️</span>}
        </div>
      )}
      {!storeConfig.isOpen && <div className="bg-red-600 text-white p-3 text-center font-bold sticky top-0 z-[60] shadow-md flex items-center justify-center gap-2"><Ban className="w-5 h-5"/>{storeConfig.closedMessage}</div>}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200" style={{top: !storeConfig.isOpen ? '48px' : '0'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-32">
            <div className="flex items-center cursor-pointer" onClick={() => setView('home')}>
                {/* CAMBIO AQUÍ: Forzamos la imagen 'logonegro.png' */}
                <CompanyLogo className="h-40" src="/logonegro.png" />
            </div>
            
            {/* ... resto del menú de navegación (sin cambios) ... */}
            <nav className="hidden md:flex space-x-8">
              {role === 'public' && <><button onClick={() => setView('home')} className="hover:text-emerald-600 font-medium">Inicio</button><button onClick={() => setView('shop')} className="hover:text-emerald-600 font-medium">Tienda</button><button onClick={() => setView('photo-search')} className="hover:text-emerald-600 font-medium">Fotos</button><button onClick={() => setView('tracking')} className="hover:text-emerald-600 font-medium">Seguimiento</button></>}
              {role === 'club' && <button className="text-emerald-600 font-bold">Portal Club: {currentClub.name}</button>}
              {role === 'admin' && <button className="text-emerald-600 font-bold">Panel de Administración</button>}
            </nav>
            <div className="flex items-center gap-4">
              {role === 'public' && <div className="relative cursor-pointer" onClick={() => setView('cart')}><ShoppingCart className="w-6 h-6 text-gray-600 hover:text-emerald-600" />{cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cart.length}</span>}</div>}
              {role !== 'public' ? <button onClick={() => { setRole('public'); setView('home'); setCurrentClub(null); }} className="text-gray-500 hover:text-red-500"><LogOut className="w-5 h-5" /></button> : <button onClick={() => setView('login')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-emerald-600"><User className="w-5 h-5" /><span className="hidden sm:inline">Acceso</span></button>}
            </div>
          </div>
        </div>
      </header>
      {confirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] backdrop-blur-sm animate-fade-in">
              <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-gray-100">
                  <div className="flex items-center gap-2 mb-4 text-emerald-700">
                      <AlertCircle className="w-6 h-6"/>
                      <h3 className="font-bold text-lg text-gray-900">Confirmar Acción</h3>
                  </div>
                  {/* whitespace-pre-line permite que los saltos de línea (\n) se muestren correctamente */}
                  <p className="text-gray-600 mb-6 whitespace-pre-line text-sm leading-relaxed">{confirmation.msg}</p>
                  <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={() => setConfirmation(null)}>Cancelar</Button>
                      <Button variant="primary" onClick={() => { confirmation.onConfirm(); setConfirmation(null); }}>Confirmar</Button>
                  </div>
              </div>
          </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-200px)]">
        {notification && <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-500' : 'bg-gray-800'} transition-all animate-fade-in-down`}>{notification.type === 'success' && <Check className="w-5 h-5 text-emerald-400" />}{notification.type === 'error' && <AlertCircle className="w-5 h-5 text-white" />}<span className="font-medium">{notification.msg}</span></div>}
        {view === 'home' && <HomeView setView={setView} />}
        {view === 'shop' && <ShopView products={products} addToCart={addToCart} clubs={clubs} modificationFee={financialConfig.modificationFee} storeConfig={storeConfig} setConfirmation={setConfirmation} campaignConfig={campaignConfig}/>}
        {view === 'cart' && <CartView 
            cart={cart} 
            removeFromCart={removeFromCart} 
            createOrder={createOrder} 
            // AQUÍ ESTÁ EL CAMBIO: Multiplicamos precio por cantidad
            total={cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0)} 
            clubs={clubs} 
            storeConfig={storeConfig} 
        />}
        {view === 'photo-search' && <PhotoSearchView clubs={clubs} />}
        {view === 'tracking' && <TrackingView orders={orders} />}
        {view === 'login' && <LoginView handleLogin={handleLogin} clubs={clubs} />}
        {view === 'order-success' && <OrderSuccessView setView={setView} />}
        {view === 'right-to-forget' && <RightToForgetView setView={setView} />}
        {view === 'incident-report' && <IncidentReportView setView={setView} db={db} storage={storage} />}
        {view === 'club-dashboard' && role === 'club' && <ClubDashboard club={currentClub} orders={orders} updateOrderStatus={updateOrderStatus} config={financialConfig} seasons={seasons.filter(s => !s.hiddenForClubs)} />}
        {view === 'admin-dashboard' && role === 'admin' && <AdminDashboard products={products} orders={orders} clubs={clubs} updateOrderStatus={updateOrderStatus} financialConfig={financialConfig} setFinancialConfig={setFinancialConfig} updateProduct={updateProduct} addProduct={addProduct} deleteProduct={deleteProduct} createClub={createClub} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} seasons={seasons} addSeason={addSeason} deleteSeason={deleteSeason} toggleSeasonVisibility={toggleSeasonVisibility} storeConfig={storeConfig} setStoreConfig={setStoreConfig} incrementClubGlobalOrder={incrementClubGlobalOrder} decrementClubGlobalOrder={decrementClubGlobalOrder} showNotification={showNotification} createSpecialOrder={createSpecialOrder} addIncident={addIncident} updateIncidentStatus={updateIncidentStatus} updateFinancialConfig={updateFinancialConfig} suppliers={suppliers} createSupplier={createSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} updateProductCostBatch={updateProductCostBatch} incrementClubErrorBatch={incrementClubErrorBatch} campaignConfig={campaignConfig} setCampaignConfig={setCampaignConfig} /> }
        {view === 'privacy' && <PrivacyPolicyView setView={setView} />}
        {view === 'legal' && <LegalNoticeView setView={setView} />}

      </main>
        <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Columna 1: Logo y Descripción */}
            <div>
                <div className="mb-4 text-white">
                <CompanyLogo className="h-40" />
                </div>
                <p className="text-gray-400">Merchandising personalizado para clubes deportivos. Calidad profesional y gestión integral.</p>
            </div>

            {/* Columna 2: Legal (MODIFICADA) */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-gray-400">
                    <li 
                    onClick={() => setView('privacy')}
                    className="hover:text-emerald-400 cursor-pointer transition-colors"
                    >
                    Política de Privacidad
                    </li>
                    <li 
                    onClick={() => setView('legal')}
                    className="hover:text-emerald-400 cursor-pointer transition-colors"
                    >
                    Aviso Legal
                    </li>
                    <li 
                    onClick={() => setView('right-to-forget')} 
                    className="hover:text-emerald-400 text-emerald-600 font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                    <UserX className="w-4 h-4"/> Derecho al Olvido (RGPD)
                    </li>
                </ul>
            </div>

            {/* Columna 3: Contacto y Soporte */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Contacto y Soporte</h3>
                <p className="text-gray-400 mb-6">info@fotoesportmerch.es</p>
                
                <button 
                    onClick={() => setView('incident-report')} 
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700"
                >
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Reportar Incidencia
                </button>
            </div>

        </div>
        </footer>
    </div>
  );
}