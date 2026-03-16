import React, { useState, useEffect } from 'react';
// Importamos los iconos que usa la portada
import { ShoppingCart, Search, Camera, Award, Package, CreditCard, Edit3, ArrowRight, AlertCircle, Send, Mail, Phone, Users } from 'lucide-react';

// Importamos el botón genérico
import { Button } from '../components/ui/Button';

// 2. Importa la base de datos y funciones de Firestore
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/* * ============================================================================
 * 🏠 VISTA: INICIO (HOME)
 * ============================================================================
 * Portada principal de la web. Contiene el carrusel, las estadísticas, 
 * el funcionamiento y los accesos rápidos a las demás secciones.
 */

export function HomeView({ setView }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // NUEVO: Estado para el formulario de contacto de clubes
  const [contactForm, setContactForm] = useState({
    clubName: '',
    contactName: '',
    phone: '',
    email: '',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ loading: false, success: false, error: null });
  
  // Imágenes de alta calidad relacionadas con deporte/merch
  const slides = [
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=1200', // Fútbol/Deporte
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1200', // Estadio/Emoción
    'https://images.unsplash.com/photo-1511512578047-929550a8a23e?auto=format&fit=crop&q=80&w=1200'  // Equipo/Celebración
  ];

  useEffect(() => { 
    const timer = setInterval(() => { 
        setCurrentSlide(prev => (prev + 1) % slides.length); 
    }, 5000); 
    return () => clearInterval(timer); 
  }, []);

  // Función para actualizar los campos mientras el usuario escribe
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({ ...prev, [name]: value }));
  };

  // Función para enviar los datos a Firebase
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ loading: true, success: false, error: null });
    try {
      // Guarda la información en la colección 'club_requests'
      await addDoc(collection(db, 'club_requests'), {
        ...contactForm,
        createdAt: new Date(),
        status: 'pending' // Esto te servirá luego para tu panel de administrador
      });
      
      setFormStatus({ loading: false, success: true, error: null });
      // Limpiamos el formulario
      setContactForm({ clubName: '', contactName: '', phone: '', email: '', message: '' }); 
      
      // Ocultar el mensaje de éxito después de 5 segundos
      setTimeout(() => setFormStatus(prev => ({ ...prev, success: false })), 5000);
    } catch (error) {
      console.error("Error al enviar el formulario:", error);
      setFormStatus({ loading: false, success: false, error: "Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo." });
    }
  };

  return (
    <div className="space-y-16 pb-12 animate-fade-in">
      
      {/* 1. HERO SECTION RENOVADO */}
      <div className="relative bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl min-h-[550px] flex items-center justify-center group">
        {/* Slider Background con Overlay mejorado */}
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
            <Button 
                onClick={() => setView('shop')} 
                className="text-lg px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50 shadow-lg border-0 transform transition-transform hover:-translate-y-1"
            >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ver Catálogo
            </Button>
            <Button 
                onClick={() => setView('photo-search')} 
                variant="outline" 
                className="text-lg px-8 py-4 border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm transform transition-transform hover:-translate-y-1"
            >
                <Search className="w-5 h-5 mr-2" />
                Buscar mis Fotos
            </Button>
          </div>
        </div>
      </div>

{/* 2. STATS BAR (DEFINITIVO) */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 -mt-8 relative z-30 mx-4 lg:mx-12">
          {[
              // CAMBIO AQUÍ: De "Clubes Asociados" a "Fotografía Profesional"
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

      {/* 3. CÓMO FUNCIONA (PROCESO) */}
      <div className="py-8">
          <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">¿Cómo funciona?</h2>
              <p className="text-gray-500 mt-2">Consigue tus recuerdos en 3 sencillos pasos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
              {/* Paso 1 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-shadow text-center relative group">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                      <Search className="w-8 h-8"/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">1. Busca tu Foto</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                      Entra en el área de tu club, filtra por categoría escribe el nombre o dorsal y encuentra esa foto espectacular para tu Merch.
                  </p>
              </div>

              {/* Paso 2 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-shadow text-center relative group">
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                      <Edit3 className="w-8 h-8"/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">2. Personaliza</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                      Elige tazas, camisetas, calendarios y muchos más... Personalizalo a tu gusto para hacerlo aún más exclusivo.
                  </p>
              </div>

              {/* Paso 3 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg hover:shadow-xl transition-shadow text-center relative group">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                      <Package className="w-8 h-8"/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">3. Recíbelo</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                      Realizamos tu merch con la máxima calidad manteninedo este estilo 100 % personalizado y lo podrás recoger directamente en tu club.
                  </p>
              </div>
          </div>
      </div>

        {/* 4. ACCESOS RÁPIDOS (BENTO GRID STYLE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-80">
          
          {/* Card Tienda */}
          <div 
            onClick={() => setView('shop')}
            className="md:col-span-2 bg-gray-100 rounded-3xl relative overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all"
          >
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
              <img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&q=80&w=800" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Tienda" />
              <div className="relative z-20 p-8 h-full flex flex-col justify-end items-start">
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full mb-3 border border-white/30">Novedades</span>
                  <h3 className="text-3xl font-bold text-white mb-2">Tienda Oficial</h3>
                  <p className="text-gray-200 text-sm mb-4 max-w-md">Descubre la nueva colección de productos personalizados para esta temporada.</p>
                  <div className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      Ver Productos <ArrowRight className="w-4 h-4"/>
                  </div>
              </div>
          </div>

          {/* Columna Derecha */}
          <div className="grid grid-rows-2 gap-6">
              {/* Card Incidencias / Ayuda */}
              <div 
                onClick={() => setView('incident-report')}
                className="bg-orange-50 rounded-3xl p-6 border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors flex flex-col justify-center relative overflow-hidden group"
              >
                  <AlertCircle className="w-12 h-12 text-orange-200 absolute top-[-10px] right-[-10px] transform rotate-12 group-hover:scale-150 transition-transform"/>
                  <h4 className="text-lg font-bold text-orange-900 mb-1">¿Algún problema?</h4>
                  <p className="text-xs text-orange-700 mb-3">Gestionar incidencias o devoluciones</p>
                  <div className="flex items-center gap-2 text-orange-800 font-bold text-xs underline">
                      Abrir Soporte <ArrowRight className="w-3 h-3"/>
                  </div>
              </div>

              {/* Card Seguimiento */}
              <div 
                onClick={() => setView('tracking')}
                className="bg-blue-50 rounded-3xl p-6 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors flex flex-col justify-center relative overflow-hidden group"
              >
                  <Package className="w-12 h-12 text-blue-200 absolute top-[-10px] right-[-10px] transform rotate-12 group-hover:scale-150 transition-transform"/>
                  <h4 className="text-lg font-bold text-blue-900 mb-1">Seguimiento</h4>
                  <p className="text-xs text-blue-700 mb-3">Consulta el estado de tu pedido</p>
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs underline">
                      Localizar <Search className="w-3 h-3"/>
                  </div>
              </div>
          </div>
      </div> {/* <-- ESTE DIV FALTABA PARA CERRAR LA SECCIÓN 4 ANTES DEL PANEL */}

      {/* 5. PANEL DE CONTACTO PARA CLUBES (NUEVO) */}
      <div className="bg-gray-900 rounded-3xl p-8 md:p-12 relative overflow-hidden mt-16 shadow-2xl border border-gray-800 mx-4 lg:mx-0">
          {/* Decoración de fondo verde corporativa */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Textos y propuesta de valor */}
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

          {/* Formulario de Captación */}
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
                      {/* Nombre del Club */}
                      <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Club</label>
                      <div className="relative">
                          <Users className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input required type="text" name="clubName" value={contactForm.clubName} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium text-gray-800" placeholder="Ej. CF FotoEsport" />
                      </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Persona de Contacto */}
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Persona de Contacto</label>
                          <input required type="text" name="contactName" value={contactForm.contactName} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium text-gray-800" placeholder="Tu nombre" />
                      </div>
                      {/* Teléfono */}
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                          <div className="relative">
                          <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input required type="tel" name="phone" value={contactForm.phone} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium text-gray-800" placeholder="600 000 000" />
                          </div>
                      </div>
                      </div>

                      {/* Email */}
                      <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
                      <div className="relative">
                          <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                          <input required type="email" name="email" value={contactForm.email} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors font-medium text-gray-800" placeholder="correo@club.com" />
                      </div>
                      </div>

                      {/* Mensaje */}
                      <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Mensaje (Opcional)</label>
                      <textarea name="message" value={contactForm.message} onChange={handleInputChange} rows="3" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none font-medium text-gray-800" placeholder="Cuéntanos un poco sobre tu club (nº de jugadores, categorías...)"></textarea>
                      </div>
                  </div>

                  {formStatus.error && (
                      <p className="text-red-500 text-sm mt-2 font-medium bg-red-50 p-3 rounded-lg border border-red-100">{formStatus.error}</p>
                  )}

                  <Button 
                      type="submit" 
                      disabled={formStatus.loading}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl mt-6 transition-all transform hover:-translate-y-1 shadow-lg shadow-emerald-600/30 flex items-center justify-center text-lg"
                  >
                      {formStatus.loading ? 'Enviando petición...' : (
                      <>
                          Quiero más información <Send className="w-5 h-5 ml-2" />
                      </>
                      )}
                  </Button>
                  </form>
              )}
          </div>
          </div>
      </div>

    </div>
  );
}