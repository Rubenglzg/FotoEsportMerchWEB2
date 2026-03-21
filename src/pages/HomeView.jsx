import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Search, Camera, Award, Package, CreditCard, Edit3, ArrowRight, AlertCircle, Send, Mail, Phone, Users, Instagram } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/* * ============================================================================
 * 🏠 VISTA: INICIO (HOME)
 * ============================================================================
 */

// IMPORTANTE: Ahora recibimos products y orders para calcular los top ventas
export function HomeView({ setView, products = [], orders = [] }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Estado para el formulario de contacto
  const [contactForm, setContactForm] = useState({
    clubName: '',
    contactName: '',
    phone: '',
    email: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: null });
  
  // Estado para los posts de Instagram
  const [igPosts, setIgPosts] = useState([]);

  // Carrusel principal
  const slides = [
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=1200', 
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1200', 
    'https://images.unsplash.com/photo-1511512578047-929550a8a23e?auto=format&fit=crop&q=80&w=1200'  
  ];

  useEffect(() => { 
    const timer = setInterval(() => { 
        setCurrentSlide(prev => (prev + 1) % slides.length); 
    }, 5000); 
    return () => clearInterval(timer); 
  }, []);

// 🔴 CONEXIÓN FÁCIL A INSTAGRAM MEDIANTE BEHOLD.SO
  useEffect(() => {
    const fetchInstagramPosts = async () => {
      const BEHOLD_URL = 'https://feeds.behold.so/9H06mprNZ7Rgvd6Z9Zdj'; 
      
    try {
        const response = await fetch(BEHOLD_URL);
        const data = await response.json();
        
        // Behold V2: ahora las fotos vienen dentro de "data.posts"
        if (data.posts && Array.isArray(data.posts)) {
          setIgPosts(data.posts.slice(0, 4));
        } else if (Array.isArray(data)) {
          // Por si acaso algún día vuelve al formato antiguo V1
          setIgPosts(data.slice(0, 4));
        }
      } catch (error) {
        console.error("Error al cargar el feed de Instagram:", error);
      }
    };

    fetchInstagramPosts();
  }, []);

  // 🌟 PRODUCTOS ESTRELLA (Tus productos reales de la Base de Datos)
  const topProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    return [...products]
      .filter(p => !p.visibility || p.visibility.status !== 'hidden')
      .slice(0, 4); // Coge los primeros 4 productos reales de tu catálogo
  }, [products]);

  // Manejo del formulario de contacto
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });
    try {
      await addDoc(collection(db, 'club_requests'), {
        ...contactForm,
        createdAt: new Date(),
        status: 'pending'
      });
      setFormStatus({ loading: false, success: true, error: null });
      setContactForm({ clubName: '', contactName: '', phone: '', email: '', message: '' }); 
      setTimeout(() => setFormStatus(prev => ({ ...prev, success: false })), 5000);
    } catch (error) {
      setFormStatus({ loading: false, success: false, error: "Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo." });
    }
  };

  // Posts de ejemplo por si aún no pones la URL de Behold
  const fallbackPosts = [
    { id: 1, mediaUrl: "https://images.unsplash.com/photo-1518605368461-1ee7c512d7c0?auto=format&fit=crop&q=80&w=300", permalink: "https://www.instagram.com/fotoesportmerch/" },
    { id: 2, mediaUrl: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=80&w=300", permalink: "https://www.instagram.com/fotoesportmerch/" },
    { id: 3, mediaUrl: "https://images.unsplash.com/photo-1574629810360-7efbb1b3769e?auto=format&fit=crop&q=80&w=300", permalink: "https://www.instagram.com/fotoesportmerch/" },
    { id: 4, mediaUrl: "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&q=80&w=300", permalink: "https://www.instagram.com/fotoesportmerch/" }
  ];

  const displayPosts = igPosts.length > 0 ? igPosts : fallbackPosts;

  return (
    <div className="space-y-16 pb-12 animate-fade-in">
      
      {/* 1. HERO SECTION */}
      <div className="relative bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl min-h-[550px] flex items-center justify-center group mx-4 lg:mx-0">
        <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent z-10"></div>
            <img 
                src={slides[currentSlide]} 
                className="w-full h-full object-cover opacity-60 transition-all duration-[2000ms] ease-in-out transform scale-105 group-hover:scale-110" 
                alt="Hero background"
            />
        </div>

        <div className="relative z-20 px-6 max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-900/30 backdrop-blur-md text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
            ⚽ La tienda oficial de tu club
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight drop-shadow-xl">
            Tu Pasión,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                Tu Recuerdo.
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-gray-200 max-w-2xl mx-auto font-light leading-relaxed">
            <span className="hidden md:inline"> Recuerdos únicos que capturan los mejores momentos de una temporada inolvidable.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button onClick={() => setView('shop')} className="text-lg px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50 shadow-lg border-0 transform transition-transform hover:-translate-y-1">
                <ShoppingCart className="w-5 h-5 mr-2" /> Ver Catálogo
            </Button>
            <Button onClick={() => setView('photo-search')} variant="outline" className="text-lg px-8 py-4 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm transform transition-transform hover:-translate-y-1">
                <Search className="w-5 h-5 mr-2" /> Buscar mis Fotos
            </Button>
          </div>
        </div>
      </div>

      {/* 2. STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 -mt-8 relative z-30 mx-4 lg:mx-12">
          {[
              { label: "Fotografía", value: "Profesional", icon: Camera }, 
              { label: "Calidad", value: "Premium", icon: Award },
              { label: "Productos Únicos", value: "100%", icon: Package },
              { label: "Pago Protegido", value: "100% Seguro", icon: CreditCard },
          ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center text-center p-2">
                  <stat.icon className="w-6 h-6 text-emerald-600 mb-2 opacity-80"/>
                  <span className="text-2xl font-black text-gray-800">{stat.value}</span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">{stat.label}</span>
              </div>
          ))}
      </div>

      {/* 3. CÓMO FUNCIONA */}
      <div className="py-8">
          <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">¿Cómo funciona?</h2>
              <p className="text-gray-500 mt-2">Consigue tus recuerdos en 3 sencillos pasos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-shadow text-center relative group">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                      <Search className="w-8 h-8"/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">1. Busca tu Foto</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Entra en el área de tu club, filtra por categoría escribe el nombre o dorsal y encuentra esa foto espectacular para tu Merch.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-shadow text-center relative group">
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                      <Edit3 className="w-8 h-8"/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">2. Personaliza</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Elige tazas, calendarios, llaveros y muchos más... Personalizalo a tu gusto para hacerlo aún más exclusivo.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-shadow text-center relative group">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                      <Package className="w-8 h-8"/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">3. Recíbelo</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Realizamos tu merch con la máxima calidad manteniendo este estilo 100 % personalizado y lo podrás recoger directamente en tu club.</p>
              </div>
          </div>
      </div>

      {/* 4. PRODUCTOS ESTRELLA (DINÁMICOS BASADOS EN VENTAS REALES) */}
      {topProducts.length > 0 && (
          <div className="py-8 relative">
              <div className="text-center mb-12">
                  <span className="text-emerald-600 font-bold text-sm tracking-wider uppercase mb-2 block">Catálogo Exclusivo</span>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900">Nuestros Productos Estrella</h2>
                  <p className="text-gray-500 mt-3 max-w-2xl mx-auto">Los favoritos de nuestra comunidad. Totalmente personalizados con foto, nombre, dorsal y escudo de tu equipo.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-4 lg:px-12">
                  {topProducts.map((product, index) => (
                      <div key={product.id || index} onClick={() => setView('shop')} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col h-full">
                          <div className="bg-gray-50 rounded-2xl h-48 md:h-56 mb-5 overflow-hidden relative flex items-center justify-center">
                              {/* Etiqueta de Top Ventas (solo para los 2 primeros) */}
                              {index < 2 && (
                                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-gray-900 text-[10px] font-black px-2 py-1 rounded-md shadow-sm uppercase tracking-wider border border-gray-200 z-20">
                                      🔥 Top Ventas
                                  </div>
                              )}
                              <img 
                                  src={product.image || "https://via.placeholder.com/400"} 
                                  alt={product.name} 
                                  className="object-contain h-full w-full group-hover:scale-110 transition-transform duration-700 p-4 z-10" 
                              />
                          </div>
                          <h4 className="font-bold text-lg text-gray-900 leading-tight">{product.name}</h4>
                          <p className="text-xs text-gray-500 mt-2 flex-grow line-clamp-2">
                              {product.description || "Personaliza este producto a tu gusto."}
                          </p>
                          <div className="mt-3 font-black text-emerald-600">
                              {product.price?.toFixed(2)}€
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

    {/* 5. PANEL DE INSTAGRAM CONECTADO A API */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-14 border border-gray-100 shadow-sm mx-4 lg:mx-12 mt-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500"></div>
          
          <div className="relative z-10 max-w-3xl mx-auto">
              <a href="https://www.instagram.com/fotoesportmerch/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-[1.5rem] mb-6 text-white shadow-xl shadow-purple-500/20 transform hover:scale-110 transition-transform cursor-pointer rotate-3 hover:rotate-6">
                  <Instagram className="w-10 h-10" />
              </a>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Únete a la comunidad</h2>
              <p className="text-gray-600 text-lg md:text-xl mb-10 leading-relaxed">
                  Sigue nuestro trabajo en <a href="https://www.instagram.com/fotoesportmerch/" target="_blank" rel="noopener noreferrer" className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-80 transition-opacity">@fotoesportmerch</a> para ver cómo quedan los diseños, participar en sorteos y no perderte ninguna novedad.
              </p>
          </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {displayPosts.map((post) => {
                  // 1. Buscar la mejor resolución posible
                  let imgUrl = '';
                  
                  // Si Behold nos da la imagen en tamaño grande optimizado, la usamos
                  if (post.sizes && post.sizes.large) {
                      imgUrl = post.sizes.large.mediaUrl;
                  } 
                  // Si es un vídeo (.mp4), tenemos que usar la portada obligatoriamente
                  else if (post.mediaType === 'VIDEO' || post.media_type === 'VIDEO' || (post.mediaUrl && post.mediaUrl.includes('.mp4'))) {
                      imgUrl = post.thumbnailUrl || post.thumbnail_url || post.mediaUrl;
                  } 
                  // Si es foto o carrusel, usamos el archivo original de Instagram
                  else {
                      imgUrl = post.mediaUrl || post.media_url || post.thumbnailUrl;
                  }
                  
                  return (
                  <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer" className="aspect-square bg-gray-100 rounded-2xl overflow-hidden group cursor-pointer relative shadow-sm block">
                      <img src={imgUrl} alt="Post de Instagram" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                          <Instagram className="w-8 h-8 mb-2 transform -translate-y-4 group-hover:translate-y-0 transition-transform duration-300" />
                          <span className="font-bold text-sm tracking-wide transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">Ver en Instagram</span>
                      </div>
                  </a>
                  )
              })}
          </div>

          <a href="https://www.instagram.com/fotoesportmerch/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-lg transition-all transform hover:-translate-y-1 shadow-lg shadow-gray-900/20">
              <Instagram className="w-5 h-5 mr-2" /> Seguir en Instagram
          </a>
      </div>

      {/* 6. ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-80 mx-4 lg:mx-12">
          <div onClick={() => setView('shop')} className="md:col-span-2 bg-gray-100 rounded-3xl relative overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all">
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
              <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Tienda" />
              <div className="relative z-20 p-8 h-full flex flex-col justify-end items-start">
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full mb-3 border border-white/30">Catálogo Completo</span>
                  <h3 className="text-3xl font-bold text-white mb-2">Tienda Oficial</h3>
                  <p className="text-gray-200 text-sm mb-4 max-w-md">Descubre todos los productos personalizados que hemos preparado para ti esta temporada.</p>
                  <div className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      Ver Productos <ArrowRight className="w-4 h-4"/>
                  </div>
              </div>
          </div>

          <div className="grid grid-rows-2 gap-6">
              <div onClick={() => setView('incident-report')} className="bg-orange-50 rounded-3xl p-6 border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors flex flex-col justify-center relative overflow-hidden group">
                  <AlertCircle className="w-12 h-12 text-orange-200 absolute top-[-10px] right-[-10px] transform rotate-12 group-hover:scale-150 transition-transform"/>
                  <h4 className="text-lg font-bold text-orange-900 mb-1">¿Algún problema?</h4>
                  <p className="text-xs text-orange-700 mb-3">Gestionar incidencias o devoluciones</p>
                  <div className="flex items-center gap-2 text-orange-800 font-bold text-xs underline">
                      Abrir Soporte <ArrowRight className="w-3 h-3"/>
                  </div>
              </div>

              <div onClick={() => setView('tracking')} className="bg-blue-50 rounded-3xl p-6 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors flex flex-col justify-center relative overflow-hidden group">
                  <Package className="w-12 h-12 text-blue-200 absolute top-[-10px] right-[-10px] transform rotate-12 group-hover:scale-150 transition-transform"/>
                  <h4 className="text-lg font-bold text-blue-900 mb-1">Seguimiento</h4>
                  <p className="text-xs text-blue-700 mb-3">Consulta el estado de tu pedido</p>
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs underline">
                      Localizar <Search className="w-3 h-3"/>
                  </div>
              </div>
          </div>
      </div>

      {/* 7. PANEL DE CONTACTO PARA CLUBES */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-12 relative overflow-hidden mt-16 shadow-2xl border border-gray-800 mx-4 lg:mx-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-white space-y-6">
              <div className="inline-block px-4 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-900/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  Trabaja con nosotros
              </div>
              <h2 className="text-3xl md:text-5xl font-black leading-tight drop-shadow-md">
                  ¿Quieres tener tu propio Merch personalizado?
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed font-light">
                  Ofrecemos un servicio integral y profesional: enviamos a nuestro fotógrafo, montamos vuestra tienda online exclusiva y producimos los artículos bajo demanda. ¡Sin inversión ni riesgo para el club!
              </p>
              <ul className="space-y-4 pt-4">
                  <li className="flex items-center text-gray-200">
                    <div className="bg-gray-800 p-2 rounded-lg mr-4"><Camera className="w-5 h-5 text-emerald-400"/></div>
                    Fotógrafo profesional certificado
                  </li>
                  <li className="flex items-center text-gray-200">
                    <div className="bg-gray-800 p-2 rounded-lg mr-4"><Package className="w-5 h-5 text-emerald-400"/></div>
                    Merchandising 100% personalizado
                  </li>
                  <li className="flex items-center text-gray-200">
                    <div className="bg-gray-800 p-2 rounded-lg mr-4"><Award className="w-5 h-5 text-emerald-400"/></div>
                    Beneficios directos para tu entidad
                  </li>
              </ul>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl">
              {formStatus.success ? (
                  <div className="text-center py-10 space-y-4 animate-fade-in">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner">
                      <Send className="w-10 h-10 ml-1" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">¡Solicitud Enviada!</h3>
                  <p className="text-gray-500 font-medium">Nos pondremos en contacto con vosotros lo antes posible para explicaros cómo empezar a trabajar juntos.</p>
                  </div>
              ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Solicitar Información</h3>
                  
                  <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Club</label>
                        <div className="relative">
                            <Users className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input required type="text" name="clubName" value={contactForm.clubName} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium text-gray-800" placeholder="Ej. CF FotoEsport" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Persona de Contacto</label>
                          <input required type="text" name="contactName" value={contactForm.contactName} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium text-gray-800" placeholder="Tu nombre" />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                          <div className="relative">
                          <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input required type="tel" name="phone" value={contactForm.phone} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium text-gray-800" placeholder="600 000 000" />
                          </div>
                      </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input required type="email" name="email" value={contactForm.email} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium text-gray-800" placeholder="correo@club.com" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Mensaje (Opcional)</label>
                        <textarea name="message" value={contactForm.message} onChange={handleInputChange} rows="3" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none font-medium text-gray-800" placeholder="Cuéntanos un poco sobre tu club (nº de jugadores, categorías...)"></textarea>
                      </div>
                  </div>

                  {formStatus.error && <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-3 rounded-lg border border-red-100">{formStatus.error}</p>}

                  <Button type="submit" disabled={formStatus.loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl mt-6 transition-all transform hover:-translate-y-1 shadow-lg shadow-emerald-600/30 flex items-center justify-center text-lg">
                      {formStatus.loading ? 'Enviando petición...' : <><Send className="w-5 h-5 mr-2" /> Solicitar Información</>}
                  </Button>
                  </form>
              )}
          </div>
          </div>
      </div>

    </div>
  );
}