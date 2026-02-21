import React from 'react';
import { ChevronLeft } from 'lucide-react';

export function LegalNoticeView({ setView }) {
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