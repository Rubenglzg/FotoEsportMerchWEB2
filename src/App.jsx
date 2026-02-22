import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { auth, db, storage } from './config/firebase';

// Hooks personalizados
import { useCart } from './hooks/useCart';
import { useFirebaseData } from './hooks/useFirebaseData';
import { useAdminActions } from './hooks/useAdminActions';
import { useOrderActions } from './hooks/useOrderActions';

// Componentes de Layout y UI
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { TopBanners } from './components/layout/TopBanners';
import { ConfirmModal } from './components/ui/ConfirmModal';
import { NotificationToast } from './components/ui/NotificationToast';
import { CampaignDecorations } from './components/shared/CampaignDecorations';

// Vistas / Páginas
import { HomeView } from './pages/HomeView';
import { ShopView } from './pages/ShopView';
import { CartView } from './pages/CartView';
import { PhotoSearchView } from './pages/PhotoSearchView';
import { TrackingView } from './pages/TrackingView';
import { LoginView } from './pages/LoginView';
import { OrderSuccessView } from './pages/OrderSuccessView';
import { RightToForgetView } from './pages/RightToForgetView';
import { IncidentReportView } from './pages/IncidentReportView';
import { PrivacyPolicyView } from './pages/PrivacyPolicyView';
import { LegalNoticeView } from './pages/LegalNoticeView';
import { ClubDashboard } from './pages/ClubDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

export default function App() {
  // 1. ESTADOS BÁSICOS (Variables de React)
  const [user, setUser] = useState(null); 
  const navigate = useNavigate();
  const [role, setRole] = useState('public'); 
  const [currentClub, setCurrentClub] = useState(null); 
  const [notification, setNotification] = useState(null); 
  const [confirmation, setConfirmation] = useState(null); 
  const [storeConfig, setStoreConfig] = useState({ 
    isOpen: true, 
    closedMessage: "Tienda cerrada temporalmente por mantenimiento. Disculpen las molestias." 
  });

  // 2. FUNCIONES BASE (No dependen de Firebase, se declaran primero)
  const showNotification = (msg, type = 'success') => { 
      setNotification({ msg, type }); 
      setTimeout(() => setNotification(null), 4000); 
  };

  const setView = (targetView) => {
    const rutas = {
      'home': '/', 'shop': '/tienda', 'cart': '/carrito', 'photo-search': '/fotos',
      'tracking': '/seguimiento', 'login': '/acceso', 'success': '/pedido-completado',
      'order-success': '/pedido-completado', 'right-to-forget': '/derecho-al-olvido',
      'incident-report': '/incidencias', 'privacy': '/privacidad', 'legal': '/aviso-legal',
      'club-dashboard': '/panel-club', 'admin-dashboard': '/panel-admin'
    };
    navigate(rutas[targetView] || '/');
    window.scrollTo(0, 0); 
  };

  // 3. HOOK DEL CARRITO (Ya puede usar showNotification)
  const { cart, setCart, addToCart, removeFromCart } = useCart(storeConfig, showNotification);

  // 4. HOOKS DE DATOS FIREBASE
  const { 
    orders, products, clubs, seasons, suppliers, 
    financialConfig, campaignConfig, setCampaignConfig, setFinancialConfig 
  } = useFirebaseData(user);

  // 5. HOOK DE ADMINISTRADOR (Ya puede usar clubs, showNotification y setConfirmation)
  const {
      addProduct, updateProduct, deleteProduct,
      createClub, updateClub, deleteClub, toggleClubBlock,
      incrementClubGlobalOrder, decrementClubGlobalOrder,
      createSupplier, updateSupplier, deleteSupplier, updateProductCostBatch,
      addSeason, deleteSeason, toggleSeasonVisibility,
      updateFinancialConfig
  } = useAdminActions(showNotification, setConfirmation, clubs);

  // 6. HOOK DE PEDIDOS E INCIDENCIAS (Ya puede usar setCart, setView, clubs, etc.)
  const { 
      createOrder, createSpecialOrder, updateOrderStatus, 
  } = useOrderActions(showNotification, setCart, setView, clubs, seasons);

  // 7. AUTENTICACIÓN Y OTROS EFECTOS
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
  
  // 8. RENDERIZADO VISUAL
  return (
    <div className={`min-h-screen font-sans text-gray-800 transition-colors duration-500 ${getThemeClass()} flex flex-col`}>
      <CampaignDecorations config={campaignConfig} />
      
      {/* Banners y Navegación */}
      <TopBanners campaignConfig={campaignConfig} storeConfig={storeConfig} />
      <Navbar setView={setView} role={role} currentClub={currentClub} cart={cart} storeConfig={storeConfig} setRole={setRole} setCurrentClub={setCurrentClub} />

      {/* Modales y Alertas globales */}
      <ConfirmModal confirmation={confirmation} setConfirmation={setConfirmation} />
      
      {/* Contenido Principal (Rutas) */}
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
          <Route path="/panel-admin" element={role === 'admin' ? <AdminDashboard products={products} orders={orders} clubs={clubs} updateOrderStatus={updateOrderStatus} financialConfig={financialConfig} setFinancialConfig={setFinancialConfig} updateProduct={updateProduct} addProduct={addProduct} deleteProduct={deleteProduct} createClub={createClub} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} seasons={seasons} addSeason={addSeason} deleteSeason={deleteSeason} toggleSeasonVisibility={toggleSeasonVisibility} storeConfig={storeConfig} setStoreConfig={setStoreConfig} incrementClubGlobalOrder={incrementClubGlobalOrder} decrementClubGlobalOrder={decrementClubGlobalOrder} showNotification={showNotification} createSpecialOrder={createSpecialOrder} updateFinancialConfig={updateFinancialConfig} suppliers={suppliers} createSupplier={createSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} updateProductCostBatch={updateProductCostBatch} campaignConfig={campaignConfig} setCampaignConfig={setCampaignConfig} />  : <Navigate to="/acceso" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Pie de página */}
      <Footer setView={setView} />
    </div>
  );
}