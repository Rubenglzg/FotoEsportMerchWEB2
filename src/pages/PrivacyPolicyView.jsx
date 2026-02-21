import React from 'react';
import { ChevronLeft } from 'lucide-react';

export function PrivacyPolicyView({ setView }) {
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