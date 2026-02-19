import React, { useState, useEffect, useMemo } from 'react';
// 1. Iconos
import { Search, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';

// 2. Firebase
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

// 3. Constantes y Componentes
import { LOGO_URL } from '../config/constants';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// --- 1. FUNCIÓN DE AYUDA: NORMALIZAR TEXTO ---
export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .trim();
};

// --- 2. COMPONENTE DE MARCA DE AGUA (SUTIL + INFO LEGAL) ---
export const ProtectedWatermarkImage = ({ imageUrl, logoUrl, fileName }) => {
    
    // 1. Limpieza del nombre del archivo
    // Si no hay nombre, ponemos "Vista Previa". 
    // Reemplaza guiones bajos (_) por espacios y quita la extensión (.jpg, .png)
    const displayName = fileName 
        ? fileName.split('/').pop().replace(/_/g, ' ').replace(/\.[^/.]+$/, "") 
        : 'Vista Previa';

    // Patrón de ruido muy sutil para confundir IA (Opacidad bajada)
    const noisePattern = "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIwLjE1Ii8+PC9zdmc+')";

    return (
        <div 
            className="relative w-full h-auto rounded-xl overflow-hidden shadow-lg bg-gray-50 group select-none border border-gray-100"
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* 1. FOTO ORIGINAL */}
            <img 
                src={imageUrl} 
                alt="Vista protegida"
                className="relative z-0 w-full h-auto object-contain block"
            />

            {/* 2. CAPA RUIDO (Muy transparente para no opacar el fondo) */}
            <div 
                className="absolute inset-0 z-10 opacity-10 pointer-events-none mix-blend-overlay"
                style={{ backgroundImage: noisePattern }}
            ></div>

            {/* 3. CAPA MARCA DE AGUA (Logos sutiles) */}
            <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
                <div 
                    className="absolute top-1/2 left-1/2 flex flex-wrap content-center justify-center"
                    style={{ 
                        width: '3000px',
                        height: '3000px',
                        transform: 'translate(-50%, -50%) rotate(-30deg)',
                        gap: '60px',
                    }}
                >
                    {Array.from({ length: 300 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-center">
                            <img 
                                src={logoUrl} 
                                alt=""
                                className="object-contain"
                                style={{ 
                                    width: '130px',
                                    height: 'auto',
                                    // MEJORA VISUAL: 'overlay' integra el logo con la luz de la foto sin taparla
                                    // Opacidad baja (0.25) para que se vea bien la foto debajo
                                    mixBlendMode: 'overlay', 
                                    opacity: 0.4, 
                                    filter: 'grayscale(100%)'
                                }}
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. CAPA DE TEXTO LEGAL (PIE DE FOTO) */}
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-sm p-3 text-center border-t border-white/10">
                {/* Nombre del archivo limpio */}
                <p className="text-white font-bold text-sm uppercase tracking-wider mb-1">
                    {displayName}
                </p>
                {/* Texto legal */}
                <p className="text-[10px] text-gray-300 leading-tight">
                    © FOTOESPORT MERCH. PROHIBIDA SU VENTA, REPRODUCCIÓN, DESCARGA O USO SIN AUTORIZACIÓN. 
                    IMAGEN PROTEGIDA DIGITALMENTE CON RASTREO ID.
                </p>
            </div>

            {/* 5. CAPA ESCUDO INVISIBLE */}
            <div className="absolute inset-0 z-40 bg-transparent"></div>
        </div>
    );
};

/* * ============================================================================
 * 📸 3. VISTA PRINCIPAL: BUSCADOR DE FOTOS PROTEGIDO
 * ============================================================================
 */
export function PhotoSearchView({ clubs }) {
  const [step, setStep] = useState(1);
  const [clubInput, setClubInput] = useState('');
  const [selectedClub, setSelectedClub] = useState(null);
  
  // Estado de búsqueda y inputs
  const [search, setSearch] = useState({ category: '', name: '', number: '' });
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // ESTADO NUEVO: Categorías reales cargadas desde Firebase
  const [clubCategories, setClubCategories] = useState([]);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Efecto para cargar categorías reales cuando eliges un club
  useEffect(() => {
        const fetchCategories = async () => {
            if (selectedClub) {
                try {
                    // selectedClub ya es el objeto entero, usamos .name
                    const clubRef = ref(storage, selectedClub.name); // <--- CAMBIO (antes selectedClub.id)
                    const res = await listAll(clubRef);
                    setClubCategories(res.prefixes.map(folderRef => folderRef.name));
                } catch (error) {
                    console.error("Error cargando categorías:", error);
                    setClubCategories([]);
                }
            } else {
                setClubCategories([]);
            }
        };
        fetchCategories();
    }, [selectedClub]);

  // Sugerencias Clubs
  const clubSuggestions = useMemo(() => { 
      if (clubInput.length < 2) return []; 
      return clubs.filter(c => c.name.toLowerCase().includes(clubInput.toLowerCase())); 
  }, [clubInput, clubs]);
  
  // Sugerencias Categorías (Ahora usa las reales cargadas)
  const categorySuggestions = useMemo(() => {
      // Si no ha escrito nada, mostramos todas (opcional) o esperamos input
      if (categoryInput.length < 1) return clubCategories; 
      return clubCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()));
  }, [categoryInput, clubCategories]);

  const selectClub = (club) => { 
      setSelectedClub(club); 
      setClubInput(club.name); 
      setStep(2); 
      setError(''); 
      setResult(null); 
      setCategoryInput(''); // Limpiar categoría anterior
  };
  
  const selectCategory = (cat) => {
      setSearch({ ...search, category: cat });
      setCategoryInput(cat);
      setShowCategorySuggestions(false);
  };

  const clearSelection = () => { 
      setSelectedClub(null); 
      setClubInput(''); 
      setStep(1); 
      setSearch({ category: '', name: '', number: '' }); 
      setCategoryInput(''); 
      setResult(null); 
  };
  
  // --- BÚSQUEDA REAL EN FIREBASE ---
  const handleSearch = async (e) => { 
      e.preventDefault(); 
      if (!selectedClub) return; 
      
      if (!search.category) { setError("Debes seleccionar una categoría."); return; }
      if (!search.name && !search.number) { setError("Escribe nombre o dorsal."); return; }

      setLoading(true); 
      setError(''); 
      setResult(null); 
      
      try {
          // 1. Normalizar textos de búsqueda
          const normSearchName = normalizeText(search.name);
          const normSearchDorsal = normalizeText(search.number);

          // 2. Referencia a la carpeta seleccionada
          const folderRef = ref(storage, `${selectedClub.name}/${search.category}`);
          
          // 3. Listar archivos
          const res = await listAll(folderRef);
          
          let foundPhotoUrl = null;

          // 4. Buscar coincidencia
          for (const item of res.items) {
              const fileName = item.name;
              const normFileName = normalizeText(fileName);

              // Lógica de coincidencia (Igual que en el personalizador)
              let nameMatch = true;
              let dorsalMatch = true;

              if (normSearchName) {
                  const cleanName = normFileName.replace(/_/g, ' ');
                  nameMatch = cleanName.includes(normSearchName) || normFileName.includes(normSearchName);
              }

              if (normSearchDorsal) {
                  const dorsalRegex = new RegExp(`[a-z0-9]_${normSearchDorsal}\\.|_${normSearchDorsal}$|_${normSearchDorsal}_`);
                  dorsalMatch = dorsalRegex.test(normFileName) || normFileName.includes(`_${normSearchDorsal}`);
              }

              // Si coincide todo lo que el usuario escribió
              if (nameMatch && dorsalMatch) {
                  foundPhotoUrl = await getDownloadURL(item);
                  var foundFileName = item.name;
                  break; // Encontrado, paramos de buscar
              }
          }

          if (foundPhotoUrl) {
              setResult({ url: foundPhotoUrl, name: foundFileName });
          } else {
              setError(`No hemos encontrado ninguna foto en "${search.category}" que coincida.`);
          }

      } catch (err) {
          console.error("Error en búsqueda:", err);
          setError("Ocurrió un error al buscar en el servidor.");
      }
      
      setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Buscador de Fotos Segura</h2>
            <p className="text-gray-500">Área protegida. Solo para jugadores y familiares.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            <div className={`transition-all duration-300 ${step === 1 ? 'opacity-100' : 'hidden'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2">1. Selecciona tu Club</label>
                <div className="relative">
                    <Input placeholder="Escribe el nombre de tu club..." value={clubInput} onChange={e => setClubInput(e.target.value)} autoFocus />
                    {clubSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                            {clubSuggestions.map(c => (
                                <div key={c.id} onClick={() => selectClub(c)} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex justify-between items-center group">
                                    <span className="font-medium text-gray-700 group-hover:text-emerald-700">{c.name}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500"/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {step === 2 && selectedClub && (
                <div className="animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        <div>
                            <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Club Seleccionado</p>
                            <p className="font-bold text-lg text-emerald-900">{selectedClub.name}</p>
                        </div>
                        <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-red-500 underline">Cambiar Club</button>
                    </div>
                    
                    <form onSubmit={handleSearch} className="space-y-4">
                        
                        {/* BUSCADOR DE CATEGORÍA CONECTADO A STORAGE */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría / Carpeta <span className="text-red-500">*</span></label>
                            <Input 
                                placeholder="Escribe o selecciona carpeta..." 
                                value={categoryInput} 
                                onChange={e => { setCategoryInput(e.target.value); setSearch({...search, category: ''}); setShowCategorySuggestions(true); }}
                                onFocus={() => setShowCategorySuggestions(true)}
                                // Pequeño delay para permitir click en sugerencia antes de cerrar
                                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                            />
                            {showCategorySuggestions && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                    {categorySuggestions.length > 0 ? (
                                        categorySuggestions.map(cat => (
                                            <div key={cat} onClick={() => selectCategory(cat)} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex justify-between items-center group">
                                                <span className="font-medium text-gray-700 group-hover:text-emerald-700">{cat}</span>
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500"/>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-gray-400 text-xs italic">No hay carpetas o coincidencias.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <Input label="Nombre" placeholder="Ej. Juan Perez" value={search.name} onChange={e => setSearch({...search, name: e.target.value})} />
                            </div>
                            <div className="md:col-span-1">
                                <Input label="Dorsal" placeholder="Ej. 10" value={search.number} onChange={e => setSearch({...search, number: e.target.value})} />
                            </div>
                        </div>
                        
                        <div className="mt-2">
                            <Button type="submit" disabled={loading} className="w-full h-[48px] text-lg shadow-emerald-200 shadow-lg flex justify-center items-center gap-2">
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5"/>}
                                {loading ? 'Buscando...' : 'Buscar Fotos'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
            
            {error && (
                <div className="mt-4 bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in">
                    <AlertTriangle className="w-4 h-4"/> {error}
                </div>
            )}
        </div>
        
        {/* RESULTADO DE LA FOTO */}
        {result && (
            <div className="bg-white p-4 rounded-xl shadow-lg animate-fade-in-up border border-gray-100">
                <ProtectedWatermarkImage 
                    imageUrl={result.url}   // Ahora es result.url
                    fileName={result.name}  // Pasamos el nombre para el pie de foto
                    logoUrl={LOGO_URL} 
                />
            </div>
        )}
    </div>
  );
}