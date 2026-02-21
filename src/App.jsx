import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import {  
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';

import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  setDoc,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore';

import {  
  ref, 
  uploadBytes, 
  getDownloadURL,
} from 'firebase/storage';

// --- Logo y colores ---
import { appId } from './config/constants';

// Importamos nuestras herramientas de Firebase desde el archivo independiente
import { auth, db, storage } from './config/firebase';

// Importamos plantillas de emails desde el archivo independiente
import { generateInvoiceEmailHTML } from './utils/emailTemplates';

// --- 🧩 COMPONENTES VISUALES (Nuestras "piezas de Lego" de diseño) ---
// Importamos los botones y etiquetas genéricas. Al estar separados, 
// mantenemos este archivo principal mucho más limpio y enfocado en la lógica.
import { ConfirmModal } from './components/ui/ConfirmModal';
import { NotificationToast } from './components/ui/NotificationToast';

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

import { OrderSuccessView } from './pages/OrderSuccessView';
import { PrivacyPolicyView } from './pages/PrivacyPolicyView';
import { LegalNoticeView } from './pages/LegalNoticeView';

// --- COMPONENTES DE ESTRUCTURA Y COMPARTIDOS ---
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { TopBanners } from './components/layout/TopBanners';

// --- COMPONENTES DE ESTRUCTURA Y COMPARTIDOS ---
import { CampaignDecorations } from './components/shared/CampaignDecorations';

// --- HOOKS ---
import { useFirebaseData } from './hooks/useFirebaseData';
import { useAdminActions } from './hooks/useAdminActions';

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





export default function App() {
  // 1. PRIMERO TODOS LOS ESTADOS (Variables de React)
  const [user, setUser] = useState(null); 
  const navigate = useNavigate();
  const location = useLocation();
  const [cart, setCart] = useState([]);
  const [role, setRole] = useState('public'); 
  const [currentClub, setCurrentClub] = useState(null); 
  const [notification, setNotification] = useState(null); 
  const [confirmation, setConfirmation] = useState(null); 
  const [storeConfig, setStoreConfig] = useState({ isOpen: true, closedMessage: "Tienda cerrada temporalmente por mantenimiento. Disculpen las molestias." });

  // 2. LA FUNCIÓN DE NOTIFICAR (La necesita el hook de abajo)
  const showNotification = (msg, type = 'success') => { 
      setNotification({ msg, type }); 
      setTimeout(() => setNotification(null), 4000); 
  };

  // 3. LOS HOOKS DE DATOS (Después de los estados)
  const { 
    orders, products, clubs, seasons, suppliers, 
    financialConfig, campaignConfig, setCampaignConfig, setFinancialConfig 
  } = useFirebaseData(user);

  // 4. EL HOOK DE ADMINISTRADOR (Ya puede usar setConfirmation y showNotification)
  const {
      addProduct, updateProduct, deleteProduct,
      createClub, updateClub, deleteClub, toggleClubBlock,
      incrementClubGlobalOrder, incrementClubErrorBatch, decrementClubGlobalOrder,
      createSupplier, updateSupplier, deleteSupplier, updateProductCostBatch,
      addSeason, deleteSeason, toggleSeasonVisibility,
      updateFinancialConfig
  } = useAdminActions(showNotification, setConfirmation, clubs);

  // Adaptador al español
  const setView = (targetView) => {
    const rutas = {
      'home': '/',
      'shop': '/tienda',
      'cart': '/carrito',
      'photo-search': '/fotos',
      'tracking': '/seguimiento',
      'login': '/acceso',
      'success': '/pedido-completado',
      'order-success': '/pedido-completado',
      'right-to-forget': '/derecho-al-olvido',
      'incident-report': '/incidencias',
      'privacy': '/privacidad',
      'legal': '/aviso-legal',
      'club-dashboard': '/panel-club',
      'admin-dashboard': '/panel-admin'
    };
    navigate(rutas[targetView] || '/');
    window.scrollTo(0, 0); 
  };

  // Autenticación
  useEffect(() => { 
    const initAuth = async () => { 
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
            await signInWithCustomToken(auth, __initial_auth_token); 
        } else { 
            await signInAnonymously(auth); 
        } 
    }; 
    initAuth(); 
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u)); 
    return () => unsubscribe(); 
  }, []);
  
  // Detectar si venimos desde un email con ID de ticket
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get('ticketId');
    if (ticketId) {
       navigate('/incidencias'); 
    }
  }, [navigate]);

  const getThemeClass = () => {
      if (!campaignConfig?.active) return 'bg-gray-50';
      if (campaignConfig.type === 'black_friday') return 'bg-slate-900 text-slate-100'; 
      if (campaignConfig.type === 'christmas') return 'bg-red-50';
      return 'bg-gray-50';
  };

  const addToCart = (product, customization, finalPrice) => { 
      if (!storeConfig.isOpen) { showNotification('La tienda está cerrada temporalmente.', 'error'); return; } 
      setCart([...cart, { ...product, ...customization, price: finalPrice, cartId: Date.now() }]); 
      showNotification('Producto añadido al carrito'); 
  };
  
  const removeFromCart = (cartId) => { 
      setCart(cart.filter(item => item.cartId !== cartId)); 
  };
  
  // --- FUNCIÓN CREAR PEDIDO ---
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
              globalBatch: 'SPECIAL', 
              incidents: [] 
          }); 
          showNotification('Pedido especial registrado con éxito'); 
      } catch(e) { 
          showNotification('Error al crear pedido especial', 'error'); 
      } 
  };

  // --- FUNCIÓN ACTUALIZAR ESTADO ---
  const updateOrderStatus = async (orderId, newStatus, visibleStatus, orderData) => {
      try {
          const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
          
          await updateDoc(orderRef, { 
              status: newStatus, 
              visibleStatus: visibleStatus 
          });

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

  const addIncident = async (orderId, incidentData) => { try { const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); await updateDoc(orderRef, { incidents: arrayUnion(incidentData) }); showNotification('Incidencia/Reimpresión registrada'); } catch (e) { showNotification('Error registrando incidencia', 'error'); } };
  
  const updateIncidentStatus = async (orderId, incidents) => { try { const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); await updateDoc(orderRef, { incidents }); showNotification('Estado de incidencia actualizado'); } catch(e) { showNotification('Error actualizando incidencia', 'error'); } };

  const handleLogin = (username, password) => { 
      if (username === 'admin' && password === 'admin123') { 
          setRole('admin'); 
          setView('admin-dashboard'); 
          showNotification('Bienvenido Administrador'); 
      } else { 
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
  
  return (
    <div className={`min-h-screen font-sans text-gray-800 transition-colors duration-500 ${getThemeClass()} flex flex-col`}>
      <CampaignDecorations config={campaignConfig} />
      
      {/* 1. Banners y Navegación */}
      <TopBanners campaignConfig={campaignConfig} storeConfig={storeConfig} />
      <Navbar setView={setView} role={role} currentClub={currentClub} cart={cart} storeConfig={storeConfig} setRole={setRole} setCurrentClub={setCurrentClub} />

      {/* 2. Modales y Alertas globales */}
      <ConfirmModal confirmation={confirmation} setConfirmation={setConfirmation} />
      
      {/* 3. Contenido Principal (Rutas) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow relative">
        <NotificationToast notification={notification} />
        
        <Routes>
          <Route path="/" element={<HomeView setView={setView} />} />
          <Route path="/tienda" element={<ShopView products={products} addToCart={addToCart} clubs={clubs} modificationFee={financialConfig.modificationFee} storeConfig={storeConfig} setConfirmation={setConfirmation} campaignConfig={campaignConfig}/>} />
          <Route path="/carrito" element={<CartView cart={cart} removeFromCart={removeFromCart} createOrder={createOrder} total={cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0)} clubs={clubs} storeConfig={storeConfig} />} />
          <Route path="/fotos" element={<PhotoSearchView clubs={clubs} />} />
          <Route path="/seguimiento" element={<TrackingView orders={orders} />} />
          <Route path="/acceso" element={<LoginView handleLogin={handleLogin} clubs={clubs} />} />
          <Route path="/pedido-completado" element={<OrderSuccessView setView={setView} />} />
          <Route path="/derecho-al-olvido" element={<RightToForgetView setView={setView} />} />
          <Route path="/incidencias" element={<IncidentReportView setView={setView} db={db} storage={storage} />} />
          <Route path="/privacidad" element={<PrivacyPolicyView setView={setView} />} />
          <Route path="/aviso-legal" element={<LegalNoticeView setView={setView} />} />
          
          <Route path="/panel-club" element={role === 'club' ? <ClubDashboard club={currentClub} orders={orders} updateOrderStatus={updateOrderStatus} config={financialConfig} seasons={seasons.filter(s => !s.hiddenForClubs)} /> : <Navigate to="/acceso" />} />
          <Route path="/panel-admin" element={role === 'admin' ? <AdminDashboard products={products} orders={orders} clubs={clubs} updateOrderStatus={updateOrderStatus} financialConfig={financialConfig} setFinancialConfig={setFinancialConfig} updateProduct={updateProduct} addProduct={addProduct} deleteProduct={deleteProduct} createClub={createClub} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} seasons={seasons} addSeason={addSeason} deleteSeason={deleteSeason} toggleSeasonVisibility={toggleSeasonVisibility} storeConfig={storeConfig} setStoreConfig={setStoreConfig} incrementClubGlobalOrder={incrementClubGlobalOrder} decrementClubGlobalOrder={decrementClubGlobalOrder} showNotification={showNotification} createSpecialOrder={createSpecialOrder} addIncident={addIncident} updateIncidentStatus={updateIncidentStatus} updateFinancialConfig={updateFinancialConfig} suppliers={suppliers} createSupplier={createSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} updateProductCostBatch={updateProductCostBatch} incrementClubErrorBatch={incrementClubErrorBatch} campaignConfig={campaignConfig} setCampaignConfig={setCampaignConfig} />  : <Navigate to="/acceso" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* 4. Pie de página */}
      <Footer setView={setView} />
    </div>
  );
}