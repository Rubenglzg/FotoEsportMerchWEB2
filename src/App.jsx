import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Search, User, Package, Menu, X, Check, 
  CreditCard, Banknote, AlertCircle, BarChart3, Settings, 
  Image as ImageIcon, Trash2, ShieldCheck, Truck, LogOut,
  ChevronRight, ChevronLeft, Plus, Minus, Euro, LayoutDashboard,
  Filter, Upload, Save, Eye, FileText, UserX, Download, Mail, MessageSquare,
  Edit3, ToggleLeft, ToggleRight, Lock, Unlock, EyeOff, Folder, FileImage, CornerDownRight,
  ArrowRight, Calendar, Ban, Store, Calculator, DollarSign, FileSpreadsheet,
  Layers, Archive, Globe, AlertTriangle, RefreshCw, Briefcase, RotateCcw, MoveLeft,
  Landmark, Printer, FileDown, Users, Table,
  Hash
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
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
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  listAll,
  deleteObject
} from 'firebase/storage';

import ExcelJS from 'exceljs';



// --- 1. CONFIGURACIÓN FIREBASE CON TUS DATOS ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicialización segura
let app, auth, db, storage;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Error inicializando Firebase:", error);
}

// --- CONFIGURACIÓN GLOBAL ---
const LOGO_URL = '/logo.png'; 
const appId = 'fotoesport-merch'; // Usamos tu ID de proyecto como referencia

// --- CONSTANTE DE COLORES VISUALES (NUEVO) ---
const AVAILABLE_COLORS = [
  { id: 'white', label: 'Blanco', hex: '#FFFFFF', border: 'border-gray-300' },
  { id: 'black', label: 'Negro', hex: '#000000', border: 'border-black' },
  { id: 'red', label: 'Rojo', hex: '#DC2626', border: 'border-red-600' },
  { id: 'blue', label: 'Azul', hex: '#2563EB', border: 'border-blue-600' },
  { id: 'green', label: 'Verde', hex: '#16A34A', border: 'border-green-600' },
  { id: 'yellow', label: 'Amarillo', hex: '#FACC15', border: 'border-yellow-400' },
  { id: 'orange', label: 'Naranja', hex: '#EA580C', border: 'border-orange-500' },
  { id: 'purple', label: 'Morado', hex: '#9333EA', border: 'border-purple-600' },
  { id: 'navy', label: 'Marino', hex: '#1E3A8A', border: 'border-blue-900' },
  { id: 'gray', label: 'Gris', hex: '#4B5563', border: 'border-gray-500' },
];

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

// --- FUNCIÓN DE AYUDA: NORMALIZAR TEXTO ---
const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .trim();
};

const generateBatchExcel = (batchId, orders, clubName) => {
    try {
        const today = new Date().toLocaleDateString();
        
        // Usamos \ufeff para BOM (Byte Order Mark) para que Excel reconozca acentos correctamente
        let csvBody = '\ufeff'; 
        
        // Encabezado
        csvBody += `REPORTE DETALLADO DE PEDIDO GLOBAL\n`;
        csvBody += `LOTE NUMERO:;${batchId || 'N/A'}\n`;
        csvBody += `CLUB:;${clubName || 'Desconocido'}\n`;
        csvBody += `FECHA EMISION:;${today}\n`;
        csvBody += `TOTAL PEDIDOS:;${orders ? orders.length : 0}\n\n`;

        // Columnas (Usamos punto y coma ; que es el estándar de Excel en español/europeo para CSV)
        csvBody += "ID Pedido;Fecha Pedido;Cliente;Tipo Pedido;Producto;Cantidad;Precio Unit.;Subtotal;Pers. Nombre;Pers. Dorsal;Talla;Color;Estado Actual\n";

        let grandTotal = 0;

        if (orders && orders.length > 0) {
            orders.forEach(order => {
                const orderDate = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : '-';
                
                order.items.forEach(item => {
                    const quantity = item.quantity || 1;
                    const price = item.price || 0;
                    const lineTotal = quantity * price;
                    grandTotal += lineTotal;

                    // Limpieza de datos: quitar puntos y comas para no romper el CSV, y comillas
                    const clean = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;

                    const row = [
                        clean(order.id ? order.id.slice(0,8) : 'ID-ERROR'),
                        clean(orderDate),
                        clean(order.customer ? order.customer.name : 'Sin Nombre'),
                        clean(order.type === 'special' ? 'ESPECIAL' : 'WEB'),
                        clean(item.name),
                        quantity,
                        price.toFixed(2).replace('.', ','), // Formato europeo 10,00
                        lineTotal.toFixed(2).replace('.', ','),
                        clean(item.playerName),
                        clean(item.playerNumber),
                        clean(item.size),
                        clean(item.color),
                        clean(order.status)
                    ].join(";");
                    csvBody += row + "\n";
                });
            });
        }

        csvBody += `\n;;;;;;;TOTAL LOTE:;${grandTotal.toFixed(2).replace('.', ',')} €\n`;

        // CREAR BLOB (Solución robusta para descarga)
        const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Lote_Global_${batchId}_${clubName ? clubName.replace(/\s+/g, '_') : 'Club'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Limpiar memoria

    } catch (e) {
        console.error("Error generando Excel:", e);
        alert("Hubo un error al generar el Excel. Por favor revisa la consola.");
    }
};

const printBatchAlbaran = (batchId, orders, clubName, commissionPct) => {
    const printWindow = window.open('', '_blank');
    const today = new Date().toLocaleDateString();
    
    // Totales
    const totalAmount = orders.reduce((sum, o) => sum + o.total, 0);
    const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.quantity || 1), 0), 0);
    
    // Cálculos Financieros Claros
    const commissionAmount = totalAmount * commissionPct;
    const netAmount = totalAmount - commissionAmount;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Albarán Lote Global #${batchId}</title>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #111; max-width: 900px; margin: 0 auto; }
                .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
                .logo-text { font-size: 28px; font-weight: 900; letter-spacing: -1px; }
                .logo-sub { color: #10b981; }
                .batch-title { text-align: right; }
                .batch-title h1 { margin: 0; font-size: 22px; color: #111; text-transform: uppercase; }
                .batch-title p { margin: 5px 0 0; font-size: 14px; color: #666; }
                
                .summary-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between; border: 1px solid #e5e7eb; }
                .summary-item strong { display: block; font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 2px; }
                .summary-item span { font-size: 16px; font-weight: bold; color: #111; }

                table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px; }
                th { background: #10b981; color: white; padding: 10px; text-align: left; text-transform: uppercase; font-size: 11px; }
                td { padding: 8px 10px; border-bottom: 1px solid #eee; }
                .order-sep { background-color: #f0fdf4; font-weight: bold; color: #064e3b; border-top: 2px solid #ccc; }
                .text-right { text-align: right; }
                
                /* Nueva Sección de Totales Financieros Mejorada */
                .financial-section { display: flex; justify-content: flex-end; margin-bottom: 50px; }
                .financial-table { width: 400px; border-collapse: collapse; border: 1px solid #ddd; }
                .financial-table td { padding: 12px; border-bottom: 1px solid #eee; }
                .f-label { text-align: left; color: #555; }
                .f-value { text-align: right; font-weight: bold; font-family: monospace; font-size: 14px; }
                .f-row-total td { border-top: 2px solid #333; font-weight: 900; font-size: 18px; background: #ecfdf5; color: #047857; }
                .f-subtext { display: block; font-size: 10px; color: #999; font-weight: normal; margin-top: 2px;}

                .signature-section { margin-top: 20px; page-break-inside: avoid; border: 2px dashed #9ca3af; border-radius: 8px; padding: 30px; height: 100px; position: relative; }
                .signature-label { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #6b7280; position: absolute; top: 10px; left: 10px; }
                .signature-line { position: absolute; bottom: 30px; left: 30px; right: 30px; border-bottom: 1px solid #333; }
                .signature-text { position: absolute; bottom: 10px; width: 100%; text-align: center; font-size: 11px; color: #6b7280; }

                @media print {
                    body { -webkit-print-color-adjust: exact; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="logo-text">FOTOESPORT<span class="logo-sub">MERCH</span></div>
                    <p style="font-size: 12px; margin: 5px 0 0; color: #666;">Albarán de Entrega y Liquidación</p>
                </div>
                <div class="batch-title">
                    <h1>Lote Global #${batchId}</h1>
                    <p><strong>${clubName}</strong></p>
                    <p style="font-size: 12px;">Fecha Emisión: ${today}</p>
                </div>
            </div>

            <div class="summary-box">
                <div class="summary-item"><strong>Club Destino</strong><span>${clubName}</span></div>
                <div class="summary-item"><strong>Pedidos Totales</strong><span>${orders.length}</span></div>
                <div class="summary-item"><strong>Artículos</strong><span>${totalItems}</span></div>
                <div class="summary-item text-right"><strong>Valor Mercancía</strong><span>${totalAmount.toFixed(2)}€</span></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="45%">Producto</th>
                        <th width="30%">Detalle / Personalización</th>
                        <th width="10%" class="text-right">Cant.</th>
                        <th width="15%" class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr class="order-sep">
                            <td colspan="4">
                                🔹 Pedido Ref: <strong>#${order.id.slice(0,6)}</strong> - ${order.customer.name}
                                <span style="font-size:10px; color:#666; margin-left:10px;">(${order.type === 'special' ? 'Especial' : 'Web'})</span>
                            </td>
                        </tr>
                        ${order.items.map(item => `
                            <tr>
                                <td style="padding-left: 20px;">${item.name}</td>
                                <td style="color: #555; font-size: 11px;">
                                    ${[
                                        item.playerName ? `Nom: ${item.playerName}` : '',
                                        item.playerNumber ? `Num: ${item.playerNumber}` : '',
                                        item.size ? `Talla: ${item.size}` : '',
                                        item.color ? `Color: ${item.color}` : ''
                                    ].filter(Boolean).join(' | ')}
                                </td>
                                <td class="text-right">${item.quantity || 1}</td>
                                <td class="text-right">${((item.quantity || 1) * item.price).toFixed(2)}€</td>
                            </tr>
                        `).join('')}
                    `).join('')}
                </tbody>
            </table>

            <div class="financial-section">
                <table class="financial-table">
                    <tr>
                        <td class="f-label">
                            Importe Total Pedido
                            <span class="f-subtext">(Suma valor venta de todos los productos)</span>
                        </td>
                        <td class="f-value">${totalAmount.toFixed(2)}€</td>
                    </tr>
                    <tr>
                        <td class="f-label" style="color: #dc2626;">
                            (-) Retención / Comisión Club
                            <span class="f-subtext">Beneficio retenido para el club (${(commissionPct * 100).toFixed(0)}%)</span>
                        </td>
                        <td class="f-value" style="color: #dc2626;">-${commissionAmount.toFixed(2)}€</td>
                    </tr>
                    <tr class="f-row-total">
                        <td class="f-label" style="color: #065f46;">
                            IMPORTE A COBRAR
                            <span class="f-subtext">(Neto a pagar a FotoEsport Merch)</span>
                        </td>
                        <td class="f-value">${netAmount.toFixed(2)}€</td>
                    </tr>
                </table>
            </div>

            <div class="signature-section">
                <div class="signature-label">Conformidad de Entrega (Sello y Firma):</div>
                <div class="signature-line"></div>
                <div class="signature-text">Recibido por: _____________________________ Fecha: ___/___/_____</div>
            </div>

            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

// --- COMPONENTES AUXILIARES Y VISTAS (Definidos ANTES de App) ---

// --- COMPONENTE LOGO ACTUALIZADO ---
const CompanyLogo = ({ className = "h-10", src }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        {/* Si pasamos una imagen específica (src) la usamos, si no usamos la global (LOGO_URL) */}
        {(src || LOGO_URL) ? (
            <img src={src || LOGO_URL} alt="FotoEsport Merch" className="h-full w-auto object-contain" />
        ) : (
            <div className="flex items-center">
                <div className="relative flex items-center justify-center bg-white border-4 border-emerald-700 rounded-lg w-12 h-10 mr-2 shadow-sm">
                    <div className="absolute -top-1.5 right-2 w-3 h-1.5 bg-emerald-700 rounded-t-sm"></div>
                    <div className="w-8 h-8 bg-gray-100 rounded-full border-2 border-emerald-700 flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full relative bg-white">
                            <div className="absolute inset-0 border border-gray-900 rounded-full"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gray-900 rotate-45"></div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-900"></div>
                            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-gray-900"></div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col leading-none">
                    <span className="font-black text-xl tracking-tighter text-gray-900">FOTOESPORT</span>
                    <span className="font-black text-xl tracking-tighter text-emerald-600">MERCH</span>
                </div>
            </div>
        )}
    </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, size = 'md' }) => {
  const baseStyle = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const sizes = { xs: "px-2 py-1 text-[10px]", sm: "px-2 py-1 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    outline: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    warning: "bg-orange-500 text-white hover:bg-orange-600",
    dark: "bg-gray-900 text-white hover:bg-gray-800",
    ghost: "text-gray-500 hover:text-emerald-600 hover:bg-gray-50"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
};

const Input = ({ label, ...props }) => (
  <div className="mb-3 w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100" {...props} />
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    'recopilando': 'bg-blue-100 text-blue-800',
    'pendiente_validacion': 'bg-yellow-100 text-yellow-800',
    'en_produccion': 'bg-purple-100 text-purple-800',
    'entregado_club': 'bg-green-100 text-green-800',
    'special_order': 'bg-indigo-100 text-indigo-800',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100'}`}>{status.replace(/_/g, ' ').toUpperCase()}</span>;
};

const StatCard = ({ title, value, color, highlight }) => (
    <div className={`bg-white p-4 md:p-6 rounded-xl shadow border-l-4 ${highlight ? 'ring-2 ring-emerald-500' : ''}`} style={{ borderLeftColor: color }}>
        <p className="text-gray-500 text-xs md:text-sm mb-1 uppercase tracking-wide font-bold">{title}</p>
        <p className={`text-xl md:text-2xl font-bold text-gray-900`}>{value}</p>
    </div>
);

const ColorPicker = ({ selectedColor, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    // Buscamos el color actual o ponemos blanco por defecto
    const current = AVAILABLE_COLORS.find(c => c.id === selectedColor) || AVAILABLE_COLORS[0];

    return (
        <div className="relative">
            {/* Botón Principal */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 border rounded px-3 py-2 bg-white hover:bg-gray-50 transition-colors w-32 justify-between"
                title="Seleccionar color oficial"
            >
                <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border ${current.border} shadow-sm`} style={{ backgroundColor: current.hex }}></div>
                    <span className="text-sm text-gray-700 font-medium truncate">{current.label}</span>
                </div>
                <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {/* Dropdown Visual */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-3 w-48 grid grid-cols-5 gap-2 animate-fade-in-down">
                        {AVAILABLE_COLORS.map(c => (
                            <button
                                key={c.id}
                                onClick={() => { onChange(c.id); setIsOpen(false); }}
                                className={`w-6 h-6 rounded-full border ${c.border} hover:scale-110 transition-transform relative group shadow-sm`}
                                style={{ backgroundColor: c.hex }}
                                title={c.label}
                            >
                                {selectedColor === c.id && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className={`w-1.5 h-1.5 rounded-full ${['white', 'yellow'].includes(c.id) ? 'bg-black' : 'bg-white'}`}></div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// --- COMPONENTE FILA DE CLUB (ACTUALIZADO CON CAMBIO DE FOTO) ---
const ClubEditorRow = ({ club, updateClub, deleteClub, toggleClubBlock }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ 
        name: club.name, 
        pass: club.pass, 
        username: club.username || '', 
        color: club.color || 'white',
        commission: club.commission || 0.12 
    });
    const [showPass, setShowPass] = useState(false);
    const [newLogo, setNewLogo] = useState(null); // Estado para el nuevo logo

    const handleSave = () => { 
        // Pasamos editData y el archivo newLogo a la función updateClub
        updateClub({ ...club, ...editData, commission: parseFloat(editData.commission) }, newLogo); 
        setIsEditing(false); 
        setNewLogo(null);
    };

    const colorInfo = AVAILABLE_COLORS.find(c => c.id === (isEditing ? editData.color : (club.color || 'white'))) || AVAILABLE_COLORS[0];

    if (isEditing) {
        return (
            <div className="bg-white p-5 rounded-xl border-2 border-emerald-500 shadow-lg animate-fade-in space-y-4 mb-4 relative">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">Editando Club</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Columna Izquierda: Datos Básicos */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nombre del Club</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-200 outline-none" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                        </div>
                        <div className="flex gap-2">
                             <div className="flex-1">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Usuario</label>
                                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} />
                            </div>
                            <div className="flex-1 relative">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Contraseña</label>
                                <input type={showPass ? "text" : "password"} className="w-full border rounded-lg px-3 py-2 text-sm pr-8" value={editData.pass} onChange={e => setEditData({...editData, pass: e.target.value})} />
                                <button onClick={() => setShowPass(!showPass)} className="absolute right-2 top-7 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Configuración Visual y Eco */}
                    <div className="space-y-3">
                         <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Color Oficial</label>
                            <div className="flex items-center gap-2">
                                <ColorPicker selectedColor={editData.color} onChange={(val) => setEditData({...editData, color: val})} />
                                <div className={`w-8 h-8 rounded-full border-2 ${colorInfo.border}`} style={{backgroundColor: colorInfo.hex}}></div>
                            </div>
                        </div>
                        
                        <div>
                             <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cambiar Escudo (Opcional)</label>
                             <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 bg-white group transition-colors">
                                <Upload className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform"/>
                                <span className="text-sm text-gray-600 truncate flex-1">{newLogo ? newLogo.name : 'Subir nueva imagen...'}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setNewLogo(e.target.files[0])} />
                             </label>
                        </div>
                    </div>
                </div>

                {/* Pie: Comisión y Botones */}
                <div className="flex justify-between items-end border-t pt-4 mt-2">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Comisión Venta</label>
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded border">
                            <input type="number" step="1" className="w-12 bg-transparent text-right text-sm font-bold outline-none" value={(editData.commission * 100).toFixed(0)} onChange={e => setEditData({...editData, commission: parseFloat(e.target.value) / 100})} />
                            <span className="text-xs font-bold">%</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => setIsEditing(false)} variant="secondary">Cancelar</Button>
                        <Button size="sm" onClick={handleSave} className="bg-emerald-600 text-white shadow-md hover:bg-emerald-700">
                            <Save className="w-4 h-4 mr-1"/> Guardar Cambios
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`flex justify-between items-center p-4 rounded-xl border mb-3 transition-all group ${club.blocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md'}`}>
            <div className="flex items-center gap-5">
                {/* LOGO DEL CLUB */}
                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 p-2 shadow-inner">
                    {club.logoUrl ? (
                        <img src={club.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                        <span className="font-bold text-2xl text-gray-300">{club.name.charAt(0)}</span>
                    )}
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-lg ${club.blocked ? 'text-red-700 line-through' : 'text-gray-800'}`}>{club.name}</h4>
                        <div className={`w-3 h-3 rounded-full border shadow-sm ${colorInfo.border}`} style={{ backgroundColor: colorInfo.hex }} title={`Color: ${colorInfo.label}`}></div>
                        {club.blocked && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Bloqueado</span>}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"><User className="w-3 h-3 text-gray-400"/> {club.username}</span>
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded font-bold">Comisión: {(club.commission * 100).toFixed(0)}%</span>
                         <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded font-bold">Lote Activo: #{club.activeGlobalOrderId || 1}</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleClubBlock(club.id)} className={`p-2 rounded-lg border transition-colors ${club.blocked ? 'bg-white text-green-600 border-green-200 hover:bg-green-50' : 'bg-white text-red-400 border-red-200 hover:bg-red-50 hover:text-red-600'}`} title={club.blocked ? "Desbloquear" : "Bloquear acceso"}>
                    {club.blocked ? <Unlock className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
                </button>
                <button onClick={() => setIsEditing(true)} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors shadow-sm" title="Editar Club">
                    <Edit3 className="w-4 h-4"/>
                </button>
                <button onClick={() => deleteClub(club.id)} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors shadow-sm" title="Eliminar Definitivamente">
                    <Trash2 className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );
};

// --- SUSTITUIR COMPONENTE ProductEditorRow COMPLETO ---
const ProductEditorRow = ({ product, updateProduct, deleteProduct }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Valores por defecto
    const features = product.features || { name: true, number: true, photo: true, shield: true, color: true };
    const defaults = product.defaults || { name: true, number: true, photo: false, shield: true };
    const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };

    const toggleFeature = (key) => updateProduct({ ...product, features: { ...features, [key]: !features[key] } });
    const toggleDefault = (key) => updateProduct({ ...product, defaults: { ...defaults, [key]: !defaults[key] } });
    const toggleModifiable = (key) => updateProduct({ ...product, modifiable: { ...modifiable, [key]: !modifiable[key] } });

    return (
        <div className={`bg-white rounded-xl transition-all duration-300 overflow-hidden group mb-3 ${isExpanded ? 'border-2 border-emerald-500 shadow-xl ring-4 ring-emerald-50/50 z-10 transform scale-[1.01]' : 'border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md'}`}>
            
            {/* 1. CABECERA (Siempre visible) */}
            <div className="p-4 flex items-center gap-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                
                {/* Miniatura */}
                <div className="relative w-14 h-14 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                    {product.image ? (
                        <img src={product.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6 opacity-50"/></div>
                    )}
                </div>
                
                {/* Info Texto */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-base truncate mb-1 group-hover:text-emerald-700 transition-colors">
                        {product.name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                            PVP: {product.price.toFixed(2)}€
                        </span>
                        <span className="text-gray-400">
                            Coste: {product.cost.toFixed(2)}€
                        </span>
                    </div>
                </div>

                {/* BOTONES ACCIÓN (A la derecha) */}
                <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
                    {/* Botón Configurar */}
                    <button 
                        className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                        title="Configurar"
                    >
                        {isExpanded ? <ChevronRight className="w-5 h-5 rotate-90"/> : <Settings className="w-5 h-5"/>}
                    </button>
                    
                    {/* Botón Eliminar (Visible siempre, con stopPropagation) */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }} 
                        className="p-2 rounded-lg bg-white border border-transparent text-gray-300 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
                        title="Eliminar Producto"
                    >
                        <Trash2 className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            {/* 2. PANEL EXPANDIDO (CONFIGURACIÓN) */}
            {isExpanded && (
                <div className="bg-gray-50/80 border-t border-gray-100 p-6 animate-fade-in-down">
                    
                    {/* SECCIÓN SUPERIOR: IMAGEN Y DATOS BÁSICOS */}
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                        
                        {/* A. IMAGEN GRANDE */}
                        <div className="w-full md:w-56 shrink-0 flex flex-col gap-3">
                            <div className="w-full h-56 bg-white rounded-xl border border-gray-200 shadow-sm p-2 flex items-center justify-center relative overflow-hidden group/img">
                                {product.image ? (
                                    <img src={product.image} className="w-full h-full object-contain" alt="" />
                                ) : (
                                    <ImageIcon className="w-16 h-16 text-gray-200"/>
                                )}
                            </div>
                            
                            <label className="w-full cursor-pointer flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 py-2.5 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95">
                                <Upload className="w-4 h-4"/>
                                <span>Cambiar Imagen</span>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if(file) updateProduct(product, file); 
                                    }} 
                                />
                            </label>
                        </div>

                        {/* B. INPUTS DE TEXTO (Al lado de la imagen) */}
                        <div className="flex-1 space-y-5">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nombre del Producto</label>
                                    <input 
                                        className="w-full border-b-2 border-gray-100 focus:border-emerald-500 outline-none py-2 font-bold text-gray-800 text-lg bg-transparent transition-colors placeholder-gray-300"
                                        value={product.name} 
                                        onChange={(e) => updateProduct({...product, name: e.target.value})}
                                        placeholder="Ej. Taza Personalizada"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-5 pt-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Precio Venta (PVP)</label>
                                        <div className="relative">
                                            <input type="number" step="0.5" className="w-full bg-emerald-50/50 border border-emerald-100 rounded-lg py-2 pl-3 pr-8 text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-200 outline-none" value={product.price} onChange={e => updateProduct({...product, price: parseFloat(e.target.value)})} />
                                            <span className="absolute right-3 top-2 text-emerald-600 text-xs font-bold">€</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Coste Producción</label>
                                        <div className="relative">
                                            <input type="number" step="0.5" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-sm font-bold text-gray-600 focus:ring-2 focus:ring-gray-200 outline-none" value={product.cost} onChange={e => updateProduct({...product, cost: parseFloat(e.target.value)})} />
                                            <span className="absolute right-3 top-2 text-gray-400 text-xs font-bold">€</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-xs flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 shrink-0 text-blue-500"/>
                                <p>Recuerda: Los cambios en el nombre o precio se aplicarán inmediatamente a los nuevos pedidos. La configuración de abajo determina qué puede personalizar el cliente.</p>
                            </div>
                        </div>
                    </div>

                    {/* --- BLOQUE 1: TABLA DE PERSONALIZACIÓN (TALLA Y FOTO ESTRICTOS) --- */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-6">
                        <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                                <Settings className="w-4 h-4"/> Reglas de Personalización
                            </h4>
                            <div className="flex gap-8 pr-4 opacity-60">
                                <span className="text-[9px] font-bold uppercase w-12 text-center">Activo</span>
                                <span className="text-[9px] font-bold uppercase w-12 text-center">Defecto</span>
                                <span className="text-[9px] font-bold uppercase w-12 text-center">Edit</span>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-50 p-4">
                            
                            {/* 1. TALLA (MODIFICADO: Estricto como Foto) */}
                            <div className="flex flex-col gap-2 py-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${features.size ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                            <Hash className="w-5 h-5"/> 
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">Talla</span>
                                    </div>
                                    
                                    <div className="flex gap-8 pr-2">
                                        {/* Activo: Al activar, forzamos defaults=true y modifiable=false */}
                                        <div className="flex justify-center w-12">
                                            <input 
                                                type="checkbox" 
                                                checked={features.size} 
                                                onChange={() => {
                                                    const newState = !features.size;
                                                    updateProduct({ 
                                                        ...product, 
                                                        features: { ...features, size: newState },
                                                        defaults: { ...defaults, size: newState ? true : defaults.size }, // Si activo, force default true
                                                        modifiable: { ...modifiable, size: newState ? false : modifiable.size } // Si activo, force edit false
                                                    });
                                                }} 
                                                className="rounded text-emerald-600 cursor-pointer"
                                            />
                                        </div>
                                        
                                        {/* Defecto: SIEMPRE CHECKED Y DISABLED si está activo */}
                                        <div className="flex justify-center w-12">
                                            <input 
                                                type="checkbox" 
                                                checked={features.size ? true : defaults.size} 
                                                disabled={true} 
                                                className="rounded text-blue-600 opacity-50 cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Edit: SIEMPRE CANDADO ROJO Y DISABLED si está activo */}
                                        <div className="flex justify-center w-12">
                                            <button disabled={true} className="opacity-50 cursor-not-allowed">
                                                <Lock className="w-5 h-5 text-red-400"/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Input opciones talla */}
                                {features.size && (
                                    <div className="ml-12 bg-gray-50 p-2 rounded border border-gray-200 animate-fade-in">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Opciones de Talla (Separadas por comas)</label>
                                        <input 
                                            type="text" 
                                            className="w-full border rounded p-1.5 text-xs bg-white focus:ring-1 focus:ring-emerald-500 outline-none" 
                                            placeholder="Ej: S, M, L, XL, XXL (Dejar vacío para texto libre)"
                                            value={product.sizes ? product.sizes.join(', ') : ''}
                                            onChange={(e) => updateProduct({
                                                ...product, 
                                                sizes: e.target.value.split(',').map(s => s.trim())
                                            })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 2. NOMBRE */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.name ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                        <FileText className="w-5 h-5"/>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Nombre</span>
                                </div>
                                <div className="flex gap-8 pr-2">
                                    <div className="flex justify-center w-12"><input type="checkbox" checked={features.name} onChange={() => toggleFeature('name')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="flex justify-center w-12"><input type="checkbox" checked={defaults.name} onChange={() => toggleDefault('name')} disabled={!features.name} className="rounded text-blue-600 cursor-pointer"/></div>
                                    <div className="flex justify-center w-12"><button onClick={() => toggleModifiable('name')} disabled={!features.name}>{modifiable.name ? <Unlock className="w-5 h-5 text-emerald-500"/> : <Lock className="w-5 h-5 text-red-400"/>}</button></div>
                                </div>
                            </div>

                            {/* 3. DORSAL */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.number ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                        <Hash className="w-5 h-5"/>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Dorsal</span>
                                </div>
                                <div className="flex gap-8 pr-2">
                                    <div className="flex justify-center w-12"><input type="checkbox" checked={features.number} onChange={() => toggleFeature('number')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="flex justify-center w-12"><input type="checkbox" checked={defaults.number} onChange={() => toggleDefault('number')} disabled={!features.number} className="rounded text-blue-600 cursor-pointer"/></div>
                                    <div className="flex justify-center w-12"><button onClick={() => toggleModifiable('number')} disabled={!features.number}>{modifiable.number ? <Unlock className="w-5 h-5 text-emerald-500"/> : <Lock className="w-5 h-5 text-red-400"/>}</button></div>
                                </div>
                            </div>

                            {/* 4. ESCUDO */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.shield ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                        <ShieldCheck className="w-5 h-5"/>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Escudo</span>
                                </div>
                                <div className="flex gap-8 pr-2">
                                    <div className="flex justify-center w-12"><input type="checkbox" checked={features.shield} onChange={() => toggleFeature('shield')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="flex justify-center w-12"><input type="checkbox" checked={defaults.shield} onChange={() => toggleDefault('shield')} disabled={!features.shield} className="rounded text-blue-600 cursor-pointer"/></div>
                                    <div className="flex justify-center w-12"><button onClick={() => toggleModifiable('shield')} disabled={!features.shield}>{modifiable.shield ? <Unlock className="w-5 h-5 text-emerald-500"/> : <Lock className="w-5 h-5 text-red-400"/>}</button></div>
                                </div>
                            </div>

                            {/* 5. FOTO (Lógica Estricta) */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.photo ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                                        <ImageIcon className="w-5 h-5"/>
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">Foto</span>
                                </div>
                                <div className="flex gap-8 pr-2">
                                    <div className="flex justify-center w-12">
                                        <input 
                                            type="checkbox" 
                                            checked={features.photo} 
                                            onChange={() => {
                                                const newState = !features.photo;
                                                updateProduct({ 
                                                    ...product, 
                                                    features: { ...features, photo: newState },
                                                    defaults: { ...defaults, photo: newState ? true : defaults.photo },
                                                    modifiable: { ...modifiable, photo: newState ? false : modifiable.photo }
                                                });
                                            }} 
                                            className="rounded text-emerald-600 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex justify-center w-12">
                                        <input 
                                            type="checkbox" 
                                            checked={features.photo ? true : defaults.photo} 
                                            disabled={true} 
                                            className="rounded text-blue-600 opacity-50 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="flex justify-center w-12">
                                        <button disabled={true} className="opacity-50 cursor-not-allowed">
                                            <Lock className="w-5 h-5 text-red-400"/>
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE DE MARCA DE AGUA (SUTIL + INFO LEGAL) ---
const ProtectedWatermarkImage = ({ imageUrl, logoUrl, fileName }) => {
    
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

function HomeView({ setView }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = ['https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=1200','https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1200','https://images.unsplash.com/photo-1511512578047-929550a8a23e?auto=format&fit=crop&q=80&w=1200'];
  useEffect(() => { const timer = setInterval(() => { setCurrentSlide(prev => (prev + 1) % slides.length); }, 5000); return () => clearInterval(timer); }, []);
  return (
    <div className="space-y-12">
      <div className="relative bg-emerald-900 rounded-3xl overflow-hidden shadow-2xl h-[500px] flex items-center">
        <div className="absolute inset-0 transition-all duration-700 ease-in-out"><img src={slides[currentSlide]} className="w-full h-full object-cover opacity-40 hover:scale-105 transition-transform duration-[10s]" /></div>
        <div className="relative z-10 px-8 py-20 text-center text-white w-full">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight drop-shadow-lg">Tu Pasión, Tu Marca</h1>
          <p className="text-xl md:text-2xl text-emerald-100 mb-8 max-w-2xl mx-auto drop-shadow-md">Merchandising oficial personalizado.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center"><Button onClick={() => setView('shop')} className="text-lg px-8 py-4 bg-white text-emerald-900 hover:bg-gray-100 shadow-xl border-0">Ver Catálogo</Button><Button onClick={() => setView('photo-search')} variant="outline" className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm">Buscar mis Fotos</Button></div>
        </div>
      </div>
    </div>
  );
}

function ShopView({ products, addToCart, clubs, modificationFee, storeConfig, setConfirmation }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Tienda Oficial</h2>
      {!selectedProduct ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedProduct(product)}>
              <div className="h-48 overflow-hidden bg-gray-100 relative"><img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /></div>
              <div className="p-4"><h3 className="font-bold text-lg">{product.name}</h3><div className="flex justify-between items-center mt-4"><span className="text-xl font-bold">{product.price.toFixed(2)}€</span></div></div>
            </div>
          ))}
        </div>
      ) : (

        // Pasar setConfirmation al ProductCustomizer
        <ProductCustomizer 
            product={selectedProduct} 
            onBack={() => setSelectedProduct(null)} 
            onAdd={addToCart} 
            clubs={clubs} 
            modificationFee={modificationFee} 
            storeConfig={storeConfig} 
            setConfirmation={setConfirmation} 
        />
      )}
    </div>
  );
}

function ProductCustomizer({ product, onBack, onAdd, clubs, modificationFee, storeConfig, setConfirmation }) {
  const defaults = product.defaults || {};
  const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };
  const features = product.features || {};
  
  // Estados para los inputs del buscador
  const [clubInput, setClubInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [showClubSuggestions, setShowClubSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const [customization, setCustomization] = useState({ 
      clubId: '', 
      category: '', 
      playerName: '', 
      playerNumber: '', 
      color: 'white', 
      selectedPhoto: '',
      includeName: defaults.name ?? true, 
      includeNumber: defaults.number ?? true, 
      includePhoto: defaults.photo ?? false, 
      includeShield: defaults.shield ?? true 
  });

// --- ESTADOS Y LÓGICA DE BÚSQUEDA DE FOTOS ---
  const [searchName, setSearchName] = useState('');
  const [searchDorsal, setSearchDorsal] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
      if (features.photo && !customization.includePhoto) {
          setCustomization(prev => ({ ...prev, includePhoto: true }));
      }
  }, [features.photo, customization.includePhoto]);

  const handleSearchPhoto = async () => {
      if (!customization.clubId) { setSearchError("Primero selecciona un club arriba."); return; }
      if (!searchName && !searchDorsal) { setSearchError("Escribe nombre o dorsal."); return; }

      setIsSearching(true); setSearchError(''); setSearchResults([]);

      try {
          const clubId = customization.clubId;
          const normalizedSearchName = normalizeText(searchName);
          const normalizedSearchDorsal = normalizeText(searchDorsal);

          // 1. Obtener carpetas del club
          const clubRef = ref(storage, clubId);
          const categoriesRes = await listAll(clubRef);
          let foundPhotos = [];

          // 2. Buscar en paralelo
          await Promise.all(categoriesRes.prefixes.map(async (categoryRef) => {
              const filesRes = await listAll(categoryRef);
              for (const item of filesRes.items) {
                  const fileName = item.name;
                  const normalizedFileName = normalizeText(fileName);
                  
                  let nameMatch = true;
                  let dorsalMatch = true;

                  if (normalizedSearchName) {
                      const cleanName = normalizedFileName.replace(/_/g, ' ');
                      nameMatch = cleanName.includes(normalizedSearchName) || normalizedFileName.includes(normalizedSearchName);
                  }

                  if (normalizedSearchDorsal) {
                      // Regex para asegurar que el número está aislado (ej: _12_ o _12.)
                      const dorsalRegex = new RegExp(`[a-z0-9]_${normalizedSearchDorsal}\\.|_${normalizedSearchDorsal}$|_${normalizedSearchDorsal}_`);
                      dorsalMatch = dorsalRegex.test(normalizedFileName) || normalizedFileName.includes(`_${normalizedSearchDorsal}`);
                  }

                  if (nameMatch && dorsalMatch) {
                      const url = await getDownloadURL(item);
                      foundPhotos.push({ name: fileName, url: url, fullPath: item.fullPath });
                  }
              }
          }));

          setSearchResults(foundPhotos);
          if (foundPhotos.length === 0) setSearchError("No se encontraron fotos.");

      } catch (error) {
          console.error("Error:", error);
          setSearchError("Error al buscar.");
      }
      setIsSearching(false);
  };

  // Sugerencias de Clubes
  const clubSuggestions = useMemo(() => {
      if (clubInput.length < 2) return [];
      return clubs.filter(c => c.name.toLowerCase().includes(clubInput.toLowerCase()));
  }, [clubInput, clubs]);

  // --- NUEVO: Estado para guardar las categorías reales ---
  const [availableCategories, setAvailableCategories] = useState([]);

  // --- NUEVO: Cargar categorías desde Storage cuando cambia el club ---
    useEffect(() => {
        const fetchCategories = async () => {
            if (customization.clubId) {
                try {
                    // BUSCAMOS EL OBJETO CLUB COMPLETO
                    const club = clubs.find(c => c.id === customization.clubId);
                    const rootFolder = club ? club.name : customization.clubId;
                    if (club) {
                        // Usamos club.name
                        const clubRef = ref(storage, club.name); // <--- CAMBIO
                        const res = await listAll(clubRef);
                        setAvailableCategories(res.prefixes.map(p => p.name));
                    }
                } catch (error) {
                    console.error("Error cargando categorías:", error);
                    setAvailableCategories([]);
                }
            } else {
                setAvailableCategories([]);
            }
        };
        fetchCategories();
    }, [customization.clubId, clubs]); // Añadir clubs a dependencias

  // Sugerencias de Categorías
  const categorySuggestions = useMemo(() => {
      if (categoryInput.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()));
  }, [categoryInput, availableCategories]);

    // Selección de Club
  const handleSelectClub = (club) => {
      setCustomization({ 
          ...customization, 
          clubId: club.id, 
          category: '',
          color: club.color || 'white' // <--- AHORA SE ASIGNA EL COLOR DEL CLUB AUTOMÁTICAMENTE
      });
      setClubInput(club.name);
      setCategoryInput(''); 
      setShowClubSuggestions(false);
  };

  // Selección de Categoría
  const handleSelectCategory = (cat) => {
      setCustomization({ ...customization, category: cat });
      setCategoryInput(cat);
      setShowCategorySuggestions(false);
  };

    // --- CAMBIO: Contar modificaciones en lugar de solo detectar si existen ---
    const modificationCount = useMemo(() => {
        let count = 0;
        const checkDiff = (key) => {
            // Si la característica no está activa o no es modificable, no la contamos
            if (!features[key]) return false; 
            if (!modifiable[key]) return false; 
            // Comparamos el valor actual con el valor por defecto
            return customization[`include${key.charAt(0).toUpperCase() + key.slice(1)}`] !== defaults[key];
        };

        if (checkDiff('name')) count++;
        if (checkDiff('number')) count++;
        if (checkDiff('photo')) count++;
        if (checkDiff('shield')) count++;

        return count;
    }, [customization, defaults, features, modifiable]);

    const isModified = modificationCount > 0;
    // Multiplicamos el coste de modificación por la cantidad de cambios
    const finalPrice = product.price + (modificationCount * modificationFee);
  
  const handleSubmit = (e) => { 
      e.preventDefault(); 
      if (!storeConfig.isOpen) return; 
      
      // Validaciones
      if (!customization.clubId) { alert("Debes seleccionar un club válido de la lista."); return; }
      // if (!customization.category) { alert("Debes seleccionar una categoría (archivo) de la lista."); return; }
      if (customization.includeName && !customization.playerName) { alert("El nombre es obligatorio."); return; }
      if (customization.includeNumber && !customization.playerNumber) { alert("El dorsal es obligatorio."); return; }

      // --- MENSAJE PARA EL MODAL ---
      let confirmMsg = "Por favor, verifica los datos de tu pedido:\n\n";
      confirmMsg += `• Club: ${clubInput}\n`;
      confirmMsg += `• Categoría: ${customization.category}\n`;
      if (customization.includeName) confirmMsg += `• Nombre: ${customization.playerName}\n`;
      if (customization.includeNumber) confirmMsg += `• Dorsal: ${customization.playerNumber}\n`;
      
      confirmMsg += "\nIMPORTANTE: El nombre y dorsal indicados serán los que aparezcan en el producto final (revisar mayúsculas y acentos).\n\n¿Son correctos estos datos?";

      // USAR MODAL VISUAL
      setConfirmation({
          msg: confirmMsg,
          onConfirm: () => {
              onAdd(product, customization, finalPrice); 
              onBack(); 
          }
      });
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row">
      <div className="md:w-1/2 bg-gray-100 p-8 flex items-center justify-center relative"><img src={product.image} className="max-w-full h-auto rounded-lg shadow-md" /></div>
      <div className="md:w-1/2 p-8 overflow-y-auto max-h-[90vh]">
        <button onClick={onBack} className="text-gray-500 mb-4 hover:text-gray-700 flex items-center gap-1"><ChevronLeft className="rotate-180 w-4 h-4" /> Volver</button>
        <h2 className="text-2xl font-bold mb-2">Personalizar {product.name}</h2>
        <div className="flex items-end gap-2 mb-6">
            <p className="text-emerald-600 font-bold text-3xl">{finalPrice.toFixed(2)}€</p>
            {isModified && (
                <span className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-1 rounded mb-1 border border-orange-200">
                    +{ (modificationCount * modificationFee).toFixed(2) }€ ({modificationCount} modif.)
                </span>
            )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* BUSCADOR DE CLUB (Estilo Autocomplete) */}
          <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona tu Club <span className="text-red-500">*</span></label>
              <Input 
                  placeholder="Escribe para buscar club..." 
                  value={clubInput} 
                  onChange={e => { setClubInput(e.target.value); setCustomization({...customization, clubId: ''}); setShowClubSuggestions(true); }}
                  onFocus={() => setShowClubSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowClubSuggestions(false), 200)}
              />
              {showClubSuggestions && clubSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {clubSuggestions.map(c => (
                          <div key={c.id} onClick={() => handleSelectClub(c)} className={`px-4 py-3 hover:bg-emerald-50 cursor-pointer flex justify-between items-center group ${c.blocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <span className="font-medium text-gray-700 group-hover:text-emerald-700">{c.name}</span>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500"/>
                          </div>
                      ))}
                  </div>
              )}
          </div>

            {customization.clubId && (() => {
                const selectedClub = clubs.find(c => c.id === customization.clubId);
                if (selectedClub && selectedClub.nextBatchDate) {
                    const closeDate = new Date(selectedClub.nextBatchDate);
                    const today = new Date();
                    const daysLeft = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24));
                    
                    // FUNCIÓN: Sumar días hábiles (Lunes a Viernes)
                    const addBusinessDays = (startDate, daysToAdd) => {
                        let currentDate = new Date(startDate);
                        let businessDaysAdded = 0;
                        
                        while (businessDaysAdded < daysToAdd) {
                            currentDate.setDate(currentDate.getDate() + 1);
                            const dayOfWeek = currentDate.getDay();
                            // 0 = Domingo, 6 = Sábado
                            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                                businessDaysAdded++;
                            }
                        }
                        return currentDate;
                    };

                    // Cálculo EXACTO de 7 y 10 días hábiles
                    const deliveryEstStart = addBusinessDays(closeDate, 7);
                    const deliveryEstEnd = addBusinessDays(closeDate, 10);

                    return (
                        <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4 animate-fade-in shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="bg-white p-2 rounded-lg text-emerald-600 border border-emerald-100 shadow-sm">
                                    <Calendar className="w-5 h-5"/>
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-900 text-sm uppercase mb-1">Información de Pedido</h4>
                                    <div className="text-sm text-emerald-800 space-y-1.5">
                                        <p>
                                            <span className="font-bold">Cierre de Lote:</span> {closeDate.toLocaleDateString()} 
                                            {daysLeft > 0 ? (
                                                <span className="text-xs ml-2 bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                                                    Quedan {daysLeft} días
                                                </span>
                                            ) : (
                                                <span className="text-xs ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-md font-bold">
                                                    Cierra hoy
                                                </span>
                                            )}
                                        </p>
                                        <p>
                                            <span className="font-bold">Entrega Estimada:</span> Del {deliveryEstStart.toLocaleDateString()} al {deliveryEstEnd.toLocaleDateString()}
                                        </p>
                                    </div>
                                    
                                    <div className="mt-3 pt-2 border-t border-emerald-200/50">
                                        <p className="text-xs font-semibold text-emerald-700 italic flex items-start gap-1">
                                            <span>*</span>
                                            Plazo de entrega de 7 a 10 días hábiles a contar desde la fecha de cierre indicada arriba.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}
          

          {/* BUSCADOR DE CATEGORÍA (Visible solo si hay club) */}
          {customization.clubId && !features.photo && (
              <div className="relative animate-fade-in">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona Categoría <span className="text-red-500">*</span></label>
                  <Input 
                      placeholder="Escribe para buscar categoría..." 
                      value={categoryInput}
                      onChange={e => { setCategoryInput(e.target.value); setCustomization({...customization, category: ''}); setShowCategorySuggestions(true); }}
                      onFocus={() => setShowCategorySuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                  />
                  {showCategorySuggestions && categorySuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                          {categorySuggestions.map(cat => (
                              <div key={cat} onClick={() => handleSelectCategory(cat)} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex justify-between items-center group">
                                  <span className="font-medium text-gray-700 group-hover:text-emerald-700">{cat}</span>
                                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500"/>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {features.name && (
                <div className={`${!customization.includeName ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">Nombre <span className="text-red-500">*</span></label>
                        <input type="checkbox" disabled={!modifiable.name} checked={customization.includeName} onChange={e => setCustomization({...customization, includeName: e.target.checked})} className="accent-emerald-600 disabled:opacity-50" />
                    </div>
                    <Input disabled={!customization.includeName} required={customization.includeName} placeholder="Ej. García" value={customization.playerName} onChange={e => setCustomization({...customization, playerName: e.target.value})}/>
                </div>
            )}
            {features.number && (
                <div className={`${!customization.includeNumber ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">Dorsal <span className="text-red-500">*</span></label>
                        <input type="checkbox" disabled={!modifiable.number} checked={customization.includeNumber} onChange={e => setCustomization({...customization, includeNumber: e.target.checked})} className="accent-emerald-600 disabled:opacity-50" />
                    </div>
                    <Input disabled={!customization.includeNumber} required={customization.includeNumber} type="number" placeholder="10" value={customization.playerNumber} onChange={e => setCustomization({...customization, playerNumber: e.target.value})}/>
                </div>
            )}
          </div>
          
          {/* SECCIÓN DE COLOR AUTOMÁTICO (CORREGIDO: Sin parpadeo y en gris) */}
          {features.color && (
              <div className="animate-fade-in">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Oficial del Club</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      
                      {customization.clubId ? (
                          // CASO A: HAY CLUB SELECCIONADO -> MUESTRA EL COLOR
                          (() => {
                              const colorInfo = AVAILABLE_COLORS.find(c => c.id === customization.color) || { label: customization.color, hex: customization.color, border: 'border-gray-300' };
                              return (
                                  <>
                                      <div 
                                          className={`w-10 h-10 rounded-full border-2 ${colorInfo.border} shadow-sm`} 
                                          style={{ backgroundColor: colorInfo.hex }} 
                                      />
                                      <div>
                                          <p className="text-sm font-bold text-gray-800 capitalize">
                                              {colorInfo.label}
                                          </p>
                                          <p className="text-xs text-gray-500">Asignado automáticamente</p>
                                      </div>
                                  </>
                              );
                          })()
                      ) : (
                          // CASO B: NO HAY CLUB -> MUESTRA AVISO (GRIS Y ESTÁTICO)
                          <>
                              <div className="w-10 h-10 rounded-full border-2 border-gray-300 bg-gray-100 flex items-center justify-center shadow-inner">
                                  <span className="text-gray-400 font-bold text-lg">?</span>
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-gray-600">
                                      Pendiente de Club
                                  </p>
                                  <p className="text-xs text-gray-500 font-medium">
                                      Selecciona tu club para visualizar
                                  </p>
                              </div>
                          </>
                      )}
                      
                      <Lock className="w-4 h-4 text-gray-400 ml-auto" />
                  </div>
              </div>
          )}

          {/* --- SECCIÓN DE BÚSQUEDA DE FOTO (INTEGRADA) --- */}
          {/* --- SECCIÓN DE FOTO (SIMPLIFICADA - SOLO CHECKBOX) --- */}
          {features.photo && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                      <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-emerald-600"/> Tu Foto
                      </label>
                      
                      {/* Casilla marcada por defecto y deshabilitada (Visualmente activa) */}
                      <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-700 font-bold uppercase">Incluida</span>
                          <input 
                              type="checkbox" 
                              checked={true} 
                              disabled={true} 
                              className="accent-emerald-600 w-5 h-5 cursor-not-allowed opacity-80"
                          />
                      </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic border-t border-slate-200 pt-2">
                      * La selección de la foto se realizará internamente por el club/organización.
                  </p>
              </div>
          )}
          
          {/* AVISO LEGAL VISUAL (Nuevo) */}
          {(features.name || features.number) && (
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-800 flex gap-2 items-start animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                      El nombre y dorsal que se indique en el pedido será el que aparezca en el producto final. 
                      Por favor comprueba escribir correctamente indicando mayúsculas, acentos, etc.
                  </p>
              </div>
          )}

          <div className="pt-2 border-t"><Button type="submit" disabled={!storeConfig.isOpen} className="w-full py-4 text-lg shadow-lg shadow-emerald-200">{storeConfig.isOpen ? `Añadir al Carrito (${finalPrice.toFixed(2)}€)` : 'TIENDA CERRADA'}</Button></div>
        </form>
      </div>
    </div>
  );
}

function CartView({ cart, removeFromCart, createOrder, total, clubs, storeConfig }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', notification: 'email', rgpd: false });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const handleSubmit = (e) => { e.preventDefault(); createOrder({ items: cart, customer: formData, total: total, paymentMethod, clubId: cart[0]?.clubId || 'generic', clubName: clubs.find(c => c.id === (cart[0]?.clubId))?.name || 'Club Generico' }); };
  if (cart.length === 0) return <div className="text-center py-20 text-gray-500 font-bold text-xl flex flex-col items-center"><ShoppingCart className="w-16 h-16 mb-4 text-gray-300"/>Tu carrito está vacío</div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4"><h2 className="text-2xl font-bold mb-4">Resumen</h2>{cart.map(item => (<div key={item.cartId} className="flex gap-4 bg-white p-4 rounded-lg shadow-sm"><img src={item.image} className="w-20 h-20 object-cover rounded" /><div className="flex-1"><h3 className="font-bold">{item.name}</h3><p className="text-sm text-gray-500">{item.playerName} #{item.playerNumber}</p><p className="text-emerald-600 font-bold mt-1">{item.price.toFixed(2)}€</p></div><button onClick={() => removeFromCart(item.cartId)} className="text-red-400 p-2 hover:bg-red-50 rounded"><Trash2 className="w-5 h-5" /></button></div>))}</div>
      <div className="bg-white p-6 rounded-xl shadow-md h-fit sticky top-24"><h3 className="text-xl font-bold mb-4">Finalizar Compra</h3><form onSubmit={handleSubmit} className="space-y-4"><Input label="Nombre" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /><Input label="Email" type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /><Input label="Teléfono" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /><div className="mb-3"><label className="block text-sm font-medium mb-1">Notificaciones</label><div className="flex gap-4 text-sm bg-gray-50 p-3 rounded-lg"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.notification === 'email'} onChange={() => setFormData({...formData, notification: 'email'})} /> Email</label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.notification === 'sms'} onChange={() => setFormData({...formData, notification: 'sms'})} /> SMS</label></div></div><div className="border-t pt-4"><label className="block text-sm font-medium mb-2">Pago</label><div className="grid grid-cols-2 gap-2 mb-4"><div className={`p-3 border rounded-lg cursor-pointer text-center flex flex-col items-center gap-1 ${paymentMethod === 'card' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200'}`} onClick={() => setPaymentMethod('card')}><CreditCard className="w-5 h-5"/> Tarjeta</div><div className={`p-3 border rounded-lg cursor-pointer text-center flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200'}`} onClick={() => setPaymentMethod('cash')}><Banknote className="w-5 h-5"/> Efectivo</div></div>{paymentMethod === 'cash' && <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mb-4 border border-yellow-200">El pedido quedará marcado como "Pendiente" hasta que abones el importe en tu club.</p>}</div><div className="flex items-start gap-2 mb-4"><input type="checkbox" required checked={formData.rgpd} onChange={e => setFormData({...formData, rgpd: e.target.checked})} className="mt-1" /><span className="text-xs text-gray-500">He leído y acepto la Política de Privacidad y el tratamiento de datos.</span></div><Button type="submit" disabled={!storeConfig.isOpen} className="w-full py-3 text-lg">{storeConfig.isOpen ? `Pagar ${total.toFixed(2)}€` : 'TIENDA CERRADA'}</Button></form></div>
    </div>
  );
}

function PhotoSearchView({ clubs }) {
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
                                <Input label="Nombre (Opcional)" placeholder="Ej. Juan Perez" value={search.name} onChange={e => setSearch({...search, name: e.target.value})} />
                            </div>
                            <div className="md:col-span-1">
                                <Input label="Dorsal (Opcional)" placeholder="Ej. 10" value={search.number} onChange={e => setSearch({...search, number: e.target.value})} />
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

function TrackingView({ orders }) {
  const [searchId, setSearchId] = useState('');
  const [foundOrder, setFoundOrder] = useState(null);
  const handleTrack = (e) => { e.preventDefault(); const order = orders.find(o => o.id === searchId || o.id.startsWith(searchId)); if (order) setFoundOrder(order); else alert("Pedido no encontrado. Intenta con un ID válido."); };
  return (
    <div className="max-w-xl mx-auto text-center py-12"><Package className="w-16 h-16 text-emerald-600 mx-auto mb-4" /><h2 className="text-3xl font-bold mb-6">Seguimiento de Pedido</h2><form onSubmit={handleTrack} className="flex gap-2 mb-12"><input type="text" placeholder="ID de Pedido (ej. 7A2B...)" className="flex-1 px-4 py-3 border rounded-lg" value={searchId} onChange={e => setSearchId(e.target.value)} /><Button type="submit">Consultar</Button></form>{foundOrder && (<div className="bg-white p-8 rounded-xl shadow-lg text-left animate-fade-in-up"><div className="flex justify-between items-center mb-6 border-b pb-4"><div><p className="text-sm text-gray-500">Pedido #{foundOrder.id.slice(0,6)}</p><p className="font-bold text-xl">{foundOrder.visibleStatus}</p></div><Badge status={foundOrder.status} /></div><div className="space-y-6"><div className={`flex gap-4 ${foundOrder.status === 'recopilando' ? 'opacity-100' : 'opacity-50'}`}><div className="bg-blue-100 p-2 rounded-full h-fit"><FileText className="w-5 h-5 text-blue-600"/></div><div><h4 className="font-bold">Recopilando</h4><p className="text-sm text-gray-500">Tu pedido está siendo procesado por el club.</p></div></div><div className={`flex gap-4 ${foundOrder.status === 'en_produccion' ? 'opacity-100' : 'opacity-50'}`}><div className="bg-purple-100 p-2 rounded-full h-fit"><Settings className="w-5 h-5 text-purple-600"/></div><div><h4 className="font-bold">En Producción</h4><p className="text-sm text-gray-500">Fabricando tus productos personalizados.</p></div></div><div className={`flex gap-4 ${foundOrder.status === 'entregado_club' ? 'opacity-100' : 'opacity-50'}`}><div className="bg-green-100 p-2 rounded-full h-fit"><Check className="w-5 h-5 text-green-600"/></div><div><h4 className="font-bold">Listo para Recoger</h4><p className="text-sm text-gray-500">Ya está disponible en las oficinas de {foundOrder.clubName || 'tu club'}.</p></div></div></div></div>)}</div>
  );
}

function RightToForgetView({ setView }) {
    const handleSubmit = (e) => { e.preventDefault(); alert("Solicitud enviada. Procederemos al borrado de tus datos en 24-48h conforme al RGPD."); setView('home'); }
    return (<div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow mt-8"><h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-600"><UserX className="w-6 h-6"/> Derecho al Olvido (RGPD)</h2><p className="text-gray-600 mb-6 text-sm">De acuerdo con el Reglamento General de Protección de Datos, utiliza este formulario para solicitar la eliminación completa de tus fotografías y datos personales de nuestra base de datos.</p><form onSubmit={handleSubmit} className="space-y-4"><Input label="Email asociado al pedido" type="email" required /><Input label="DNI / Identificación del Tutor" required /><Input label="Motivo (Opcional)" placeholder="Solicito la baja de mis fotos..." /><Button type="submit" variant="danger" className="w-full">Solicitar Borrado Definitivo</Button></form><button onClick={() => setView('home')} className="mt-4 text-sm text-gray-500 underline text-center w-full">Cancelar</button></div>)
}

function LoginView({ handleLogin, clubs }) {
  const [user, setUser] = useState(''); const [pass, setPass] = useState('');
  return (<div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-lg border border-gray-100"><div className="text-center mb-8"><h2 className="text-2xl font-bold text-gray-800">Acceso Privado</h2><p className="text-gray-400 text-sm">Gestión para Clubes y Administración</p></div><form onSubmit={(e) => { e.preventDefault(); handleLogin(user, pass); }} className="space-y-4"><Input label="Usuario / ID" value={user} onChange={e => setUser(e.target.value)} /><Input label="Contraseña" type="password" value={pass} onChange={e => setPass(e.target.value)} /><Button type="submit" className="w-full">Entrar al Portal</Button></form><div className="mt-8 pt-6 border-t text-center space-y-3 bg-gray-50 -mx-8 -mb-8 p-6 rounded-b-xl"><p className="text-xs text-gray-500 font-bold uppercase">Accesos Rápidos (Demo)</p><div className="flex justify-center gap-2 flex-wrap"><button onClick={() => handleLogin('club-demo', 'club123')} className="text-xs bg-white border border-gray-200 px-3 py-2 rounded hover:border-emerald-500 text-gray-600">Club Demo</button><button onClick={() => handleLogin('admin', 'admin123')} className="text-xs bg-white border border-gray-200 px-3 py-2 rounded hover:border-purple-500 text-gray-600">Admin (Dueño)</button></div></div></div>);
}

function ClubDashboard({ club, orders, updateOrderStatus, config, seasons }) {
    const [selectedSeasonId, setSelectedSeasonId] = useState(seasons[seasons.length - 1]?.id || 'all');
    const pendingCashOrders = orders.filter(o => o.clubId === club.id && o.status === 'pendiente_validacion');
    const filteredHistory = useMemo(() => { let result = orders.filter(o => o.clubId === club.id); if (selectedSeasonId !== 'all') { const season = seasons.find(s => s.id === selectedSeasonId); if (season) { const start = new Date(season.startDate).getTime(); const end = new Date(season.endDate).getTime(); result = result.filter(o => { const orderDate = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now(); return orderDate >= start && orderDate <= end; }); } } return result.filter(o => o.status !== 'pendiente_validacion'); }, [orders, club.id, selectedSeasonId, seasons]);
    const totalSales = filteredHistory.reduce((sum, o) => sum + o.total, 0);
    const commission = totalSales * config.clubCommissionPct;
    const batches = useMemo(() => { const groups = {}; filteredHistory.forEach(order => { const batchId = order.globalBatch || 1; if (!groups[batchId]) groups[batchId] = []; groups[batchId].push(order); }); return Object.entries(groups).map(([id, orders]) => ({ id: parseInt(id), orders })).sort((a, b) => b.id - a.id); }, [filteredHistory]);
    
  return (
    <div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-4"><div><h1 className="text-2xl font-bold text-gray-900">Portal Club: {club.name}</h1><p className="text-emerald-600 font-medium">{club.code}</p></div><div className="flex flex-col items-end gap-2"><div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg"><Calendar className="w-4 h-4 text-emerald-600"/><select className="bg-transparent border-none text-sm font-medium text-emerald-700 focus:ring-0 cursor-pointer" value={selectedSeasonId} onChange={(e) => setSelectedSeasonId(e.target.value)}><option value="all">Todo el Histórico</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div className="text-right"><p className="text-sm text-gray-500 mb-1">Comisiones Totales ({(config.clubCommissionPct * 100).toFixed(0)}%)</p><p className="text-4xl font-bold text-emerald-600">{commission.toFixed(2)}€</p></div></div></div>
      <div className="mb-10"><h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-orange-600"><AlertCircle className="w-5 h-5"/> Validar Pagos en Efectivo</h3>{pendingCashOrders.length === 0 ? (<div className="bg-gray-50 p-4 rounded-lg text-center text-gray-400 text-sm border border-dashed border-gray-300">No hay pagos pendientes.</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{pendingCashOrders.map(order => (<div key={order.id} className="bg-white p-4 rounded-xl shadow border-l-4 border-orange-500 flex justify-between items-center"><div><p className="font-bold text-gray-800">#{order.id.slice(0,6)} - {order.customer.name}</p><p className="text-xs text-gray-500">Pedido Global #{order.globalBatch || 1}</p></div><div className="text-right"><span className="block font-bold text-xl mb-1">{order.total}€</span><Button size="sm" onClick={() => updateOrderStatus(order.id, 'recopilando', 'Pago validado', order)} className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm"><Check className="w-4 h-4 mr-1"/> Validar</Button></div></div>))}</div>)}</div>
      <div><h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2"><Layers className="w-5 h-5"/> Historial por Pedidos Globales</h3><div className="space-y-6">{batches.map(batch => { const batchTotal = batch.orders.reduce((sum, o) => sum + o.total, 0); const batchStatus = batch.orders[0]?.status || 'recopilando'; return (<div key={batch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"><div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center"><div><h4 className="font-bold text-lg text-gray-800">Pedido Global #{batch.id}</h4><div className="flex gap-2 mt-1"><Badge status={batchStatus} /><span className="text-xs bg-white border px-2 py-0.5 rounded text-gray-500">{batch.orders.length} pedidos</span></div></div><div className="text-right"><p className="text-xs text-gray-500">Total Pedido</p><p className="font-bold text-xl">{batchTotal.toFixed(2)}€</p></div></div><div className="divide-y">{batch.orders.map(order => (<div key={order.id} className="p-4 flex justify-between items-center hover:bg-gray-50 text-sm"><div><span className="font-bold">#{order.id.slice(0,6)}</span><span className="mx-2 text-gray-400">|</span><span>{order.customer.name}</span></div><span>{order.total}€</span></div>))}</div></div>) })} {batches.length === 0 && <p className="text-center text-gray-400 py-8">No hay historial disponible.</p>}</div></div></div>
  );
}

// --- GESTOR DE ARCHIVOS (CORREGIDO: BOTÓN DE SELECCIÓN EXACTO) ---
const FilesManager = ({ clubs }) => {
    const [level, setLevel] = useState('clubs'); 
    const [selectedClub, setSelectedClub] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [items, setItems] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // Estados para subida
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFiles, setUploadFiles] = useState([]); 
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [uploadMode, setUploadMode] = useState('smart'); 
    
    // Estado para Drag & Drop
    const [isDragging, setIsDragging] = useState(false);

    // --- UTILS PARA DRAG & DROP RECURSIVO ---
    const traverseFileTree = async (item, path = '') => {
        if (item.isFile) {
            const file = await new Promise((resolve) => item.file(resolve));
            Object.defineProperty(file, 'webkitRelativePath', {
                value: path + file.name,
                writable: true,
                configurable: true
            });
            return [file];
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            let entries = [];
            const readEntries = async () => {
                const results = await new Promise((resolve) => dirReader.readEntries(resolve));
                if (results.length > 0) {
                    entries = entries.concat(results);
                    await readEntries(); 
                }
            };
            await readEntries();
            
            let files = [];
            for (const entry of entries) {
                files = [...files, ...(await traverseFileTree(entry, path + item.name + '/'))];
            }
            return files;
        }
        return [];
    };

    // --- HANDLERS DRAG & DROP ---
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedClub && !isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget)) return; 
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (!selectedClub) {
            alert("Primero selecciona un club para subir archivos.");
            return;
        }

        const items = e.dataTransfer.items;
        if (!items) return;

        setLoading(true);
        let allFiles = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) {
                const files = await traverseFileTree(item);
                allFiles = [...allFiles, ...files];
            }
        }

        if (allFiles.length > 0) {
            setUploadFiles(allFiles);
            setIsUploading(true);
            const hasFolders = allFiles.some(f => f.webkitRelativePath.includes('/'));
            setUploadMode(hasFolders ? 'smart' : 'single');
        }
        setLoading(false);
    };

    // CARGAS
    const loadCategories = async (clubId) => {
        setLoading(true);
        try {
            // BUSCAMOS EL CLUB POR ID PARA OBTENER SU NOMBRE
            const club = clubs.find(c => c.id === clubId);
            // Usamos el nombre si existe, si no el ID por seguridad
            const rootFolder = club ? club.name : clubId;
            
            const clubRef = ref(storage, rootFolder); // <--- CAMBIO AQUÍ
            const res = await listAll(clubRef);
            setItems(res.prefixes);
            setLevel('categories');
        } catch (error) {
            console.error("Error:", error);
            setItems([]);
            setLevel('categories');
        }
        setLoading(false);
    };

    const loadPhotos = async (categoryRef) => {
        setLoading(true);
        try {
            // categoryRef ya viene de la lista anterior, pero si necesitamos reconstruirlo:
            // const storagePath = `${selectedClub.name}/${selectedCategory}`;
            // En este caso, 'categoryRef' que viene de listAll ya trae la ruta correcta (nombre/categoria)
            // así que NO suele hacer falta cambiar nada aquí si 'loadCategories' ya usó el nombre.
            
            // PERO por seguridad, si usabas ref textual manual en algún sitio:
            // const photosRef = ref(storage, `${selectedClub.name}/${selectedCategory}`);
            
            // El código original usaba 'res = await listAll(categoryRef)', eso sigue funcionando bien 
            // porque categoryRef es hijo de la referencia creada en loadCategories.
            
            const res = await listAll(categoryRef);
            const photosWithUrls = await Promise.all(res.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return { name: itemRef.name, fullPath: itemRef.fullPath, url, ref: itemRef };
            }));
            setItems(photosWithUrls);
            setLevel('files');
        } catch (error) {
            console.error("Error:", error);
        }
        setLoading(false);
    };

    // SUBIDA
    const handleBulkUpload = async () => {
        if (uploadFiles.length === 0 || !selectedClub) return;

        setLoading(true);
        setUploadProgress({ current: 0, total: uploadFiles.length });
        let successCount = 0;

        const filesArray = Array.from(uploadFiles);

        try {
            for (let i = 0; i < filesArray.length; i++) {
                const file = filesArray[i];
                let targetFolderName = '';

                // ... lógica de carpetas smart/single igual ...
                if (uploadMode === 'smart') {
                    const pathParts = file.webkitRelativePath.split('/');
                    if (pathParts.length >= 2) {
                        targetFolderName = pathParts[pathParts.length - 2]; 
                    } else {
                        targetFolderName = 'General';
                    }
                } else {
                    targetFolderName = selectedCategory || 'General';
                }

                const cleanFolderName = targetFolderName.trim().replace(/\s+/g, '_');
                
                // --- CAMBIO IMPORTANTE AQUÍ ---
                // Usamos selectedClub.name en lugar de selectedClub.id
                const finalPath = `${selectedClub.name}/${cleanFolderName}/${file.name}`; 
                
                if (!file.name.startsWith('.')) {
                    const fileRef = ref(storage, finalPath);
                    await uploadBytes(fileRef, file);
                    successCount++;
                }

                setUploadProgress(prev => ({ ...prev, current: i + 1 }));
            }
            
            // ... resto de la función (alert, limpieza, recarga) ...
            // Al recargar, asegúrate de usar el ID que loadCategories transformará a nombre internamente:
            if (level === 'categories') loadCategories(selectedClub.id);
            else if (level === 'files') {
                // Aquí sí debemos construir la referencia manualmente si recargamos directo
                const photosRef = ref(storage, `${selectedClub.name}/${selectedCategory}`);
                loadPhotos(photosRef);
            } else {
                loadCategories(selectedClub.id);
            }

        } catch (error) {
            console.error("Error subida:", error);
            alert("Error en la subida. Revisa permisos.");
        }
        setLoading(false);
    };

    const handleDelete = async (fileItem) => {
        if (!window.confirm(`¿Eliminar ${fileItem.name}?`)) return;
        try {
            await deleteObject(fileItem.ref);
            setItems(prev => prev.filter(i => i.fullPath !== fileItem.fullPath));
        } catch (error) {
            console.error("Error borrando:", error);
        }
    };

    return (
        <div 
            className={`bg-white p-6 rounded-xl shadow h-full min-h-[500px] flex flex-col relative transition-colors ${isDragging ? 'bg-blue-50 border-2 border-blue-400 border-dashed' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* OVERLAY DRAG & DROP */}
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-100/90 rounded-xl backdrop-blur-sm pointer-events-none">
                    <div className="text-center animate-bounce">
                        <Upload className="w-16 h-16 text-blue-600 mx-auto mb-2"/>
                        <h3 className="text-2xl font-bold text-blue-700">¡Suelta los archivos aquí!</h3>
                    </div>
                </div>
            )}

            {/* CABECERA */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div className="flex items-center gap-2 text-sm">
                    <button onClick={() => { setLevel('clubs'); setSelectedClub(null); setSelectedCategory(null); }} className={`font-bold hover:text-emerald-600 ${level === 'clubs' ? 'text-gray-800' : 'text-gray-400'}`}>Clubes</button>
                    {level !== 'clubs' && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-300"/>
                            <button onClick={() => loadCategories(selectedClub.id)} className={`font-bold hover:text-emerald-600 ${level === 'categories' ? 'text-gray-800' : 'text-gray-400'}`}>{selectedClub.name}</button>
                        </>
                    )}
                    {level === 'files' && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-300"/>
                            <span className="font-bold text-emerald-600">{selectedCategory}</span>
                        </>
                    )}
                </div>
                
                {selectedClub && !isUploading && (
                    <button onClick={() => setIsUploading(true)} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-sm transition-transform active:scale-95">
                        <Upload className="w-4 h-4"/> Subir / Arrastrar
                    </button>
                )}
            </div>

            {/* PANEL DE SUBIDA */}
            {isUploading && (
                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 mb-6 animate-fade-in shadow-inner relative z-10">
                    <button onClick={() => { setIsUploading(false); setUploadFiles([]); }} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
                    
                    <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5"/> Preparado para Subir
                    </h4>

                    {loading && uploadProgress.total > 0 ? (
                        <div className="text-center py-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                            </div>
                            <p className="text-sm font-bold text-emerald-700">Subiendo {uploadProgress.current} de {uploadProgress.total}...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {uploadFiles.length > 0 && (
                                <div className="bg-white p-3 rounded border border-emerald-200 text-sm mb-2">
                                    <p className="font-bold text-gray-700">✅ {uploadFiles.length} archivos detectados</p>
                                    <p className="text-xs text-gray-500 truncate mt-1">
                                        Ej: {uploadFiles[0].name} {uploadFiles.length > 1 && `... y ${uploadFiles.length - 1} más`}
                                    </p>
                                </div>
                            )}

                            {/* Selector de Modo */}
                            <div className="flex gap-4 border-b border-emerald-200 pb-4">
                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-emerald-100 transition-colors flex-1 border border-transparent hover:border-emerald-200">
                                    <input type="radio" name="mode" checked={uploadMode === 'smart'} onChange={() => setUploadMode('smart')} className="mt-1 text-emerald-600"/>
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 block">Modo Estructura / Carpeta</span>
                                        <span className="text-xs text-gray-600">Crear categorías automáticamente (Recomendado).</span>
                                    </div>
                                </label>
                                
                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-emerald-100 transition-colors flex-1 border border-transparent hover:border-emerald-200">
                                    <input type="radio" name="mode" checked={uploadMode === 'single'} onChange={() => setUploadMode('single')} className="mt-1 text-emerald-600"/>
                                    <div>
                                        <span className="text-sm font-bold text-gray-800 block">Modo Simple</span>
                                        <span className="text-xs text-gray-600">Todo a: <b>{selectedCategory || 'General'}</b></span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* BOTÓN PERSONALIZADO (AQUÍ ESTÁ EL ARREGLO) */}
                                <div className="flex-1 flex items-center gap-3">
                                    <label className="cursor-pointer flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold text-xs hover:bg-emerald-200 transition-colors shadow-sm border border-emerald-200 active:scale-95">
                                        <Upload className="w-4 h-4" />
                                        {uploadMode === 'smart' ? 'Seleccionar Carpeta' : 'Seleccionar Fotos'}
                                        <input 
                                            type="file" 
                                            multiple 
                                            className="hidden" // INPUT OCULTO
                                            {...(uploadMode === 'smart' ? { webkitdirectory: "", directory: "" } : {})}
                                            onChange={e => setUploadFiles(e.target.files)} 
                                        />
                                    </label>
                                    <span className="text-sm text-gray-400 italic">
                                        {uploadFiles.length === 0 ? 'O arrastra aquí...' : ''}
                                    </span>
                                </div>

                                <button 
                                    onClick={handleBulkUpload} 
                                    disabled={uploadFiles.length === 0} 
                                    className="bg-emerald-600 text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all active:scale-95"
                                >
                                    Confirmar Subida
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CONTENIDO */}
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-4 overflow-y-auto custom-scrollbar relative z-0">
                {level === 'clubs' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {clubs.map(c => (
                            <div key={c.id} onClick={() => { setSelectedClub(c); loadCategories(c.id); }} className="bg-white p-4 rounded-lg shadow-sm border hover:border-emerald-500 cursor-pointer flex items-center gap-3 hover:shadow-md transition-all">
                                <div className="bg-emerald-100 p-2 rounded text-emerald-600"><Folder className="w-6 h-6"/></div>
                                <div><p className="font-bold text-sm text-gray-700">{c.name}</p></div>
                            </div>
                        ))}
                    </div>
                )}
                {level === 'categories' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {items.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                <Folder className="w-16 h-16 mb-4 opacity-20"/>
                                <p className="font-medium">Carpeta vacía</p>
                            </div>
                        ) : (
                            items.map(ref => (
                                <div key={ref.name} onClick={() => { setSelectedCategory(ref.name); loadPhotos(ref); }} className="bg-white p-4 rounded-lg shadow-sm border hover:border-blue-500 cursor-pointer text-center hover:shadow-md">
                                    <Folder className="w-12 h-12 mx-auto text-blue-200 mb-2"/>
                                    <p className="font-bold text-sm text-gray-700 truncate">{ref.name}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {level === 'files' && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {items.map(photo => (
                            <div key={photo.fullPath} className="group relative bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg">
                                <div className="aspect-square bg-gray-100 relative">
                                    <img src={photo.url} className="w-full h-full object-cover" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                        <a href={photo.url} target="_blank" className="p-2 bg-white rounded-full hover:text-blue-600"><Eye className="w-4 h-4"/></a>
                                        <button onClick={() => handleDelete(photo)} className="p-2 bg-white rounded-full hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                <p className="p-2 text-[10px] font-medium text-gray-600 truncate">{photo.name}</p>
                            </div>
                        ))}
                    </div>
                )}
                {loading && !isUploading && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 absolute inset-0 bg-white/80 z-20">
                        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-emerald-500"/>
                        <span className="text-sm font-medium">Cargando...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

function AdminDashboard({ products, orders, clubs, updateOrderStatus, financialConfig, setFinancialConfig, updateFinancialConfig, updateProduct, addProduct, deleteProduct, createClub, deleteClub, updateClub, toggleClubBlock, modificationFee, setModificationFee, seasons, addSeason, deleteSeason, toggleSeasonVisibility, storeConfig, setStoreConfig, incrementClubGlobalOrder, decrementClubGlobalOrder, updateGlobalBatchStatus, createSpecialOrder, addIncident, updateIncidentStatus }) {
  const [tab, setTab] = useState('management');
  const [showNewClubPass, setShowNewClubPass] = useState(false);
  const [financeSeasonId, setFinanceSeasonId] = useState(seasons[seasons.length - 1]?.id || 'all');
  // Modificamos el estado de mover temporada para que acepte lotes completos
  const [moveSeasonModal, setMoveSeasonModal] = useState({ active: false, target: null, type: 'batch' }); // type: 'batch' | 'order'
  const [isEditingActiveBatch, setIsEditingActiveBatch] = useState(false);
  const [tempBatchValue, setTempBatchValue] = useState(1);
  const [filterClubId, setFilterClubId] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState(clubs[0]?.id || '');
  const [selectedClubFiles, setSelectedClubFiles] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [statsClubFilter, setStatsClubFilter] = useState('all');
  const [newClubColor, setNewClubColor] = useState('white');
  // --- ESTADOS PARA EDICIÓN Y MOVIMIENTOS ---
  const [editOrderModal, setEditOrderModal] = useState({ 
      active: false, 
      original: null, 
      modified: null 
  });

    // Estado para controlar qué fecha se está editando (Lógica del Lápiz)
    const [editingDate, setEditingDate] = useState({ clubId: null, date: '' });

    // EFECTO: AUTOMATIZACIÓN DE CIERRE (Con margen de 5 minutos + Avanzar Lote)
    useEffect(() => {
        const checkAndAutoCloseBatches = async () => {
            if (!orders || orders.length === 0 || !clubs || clubs.length === 0) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (const club of clubs) {
                if (club.nextBatchDate) {
                    const closeDate = new Date(club.nextBatchDate);
                    
                    // Calculamos si estamos en "Tregua" (5 mins)
                    const lastReopen = club.lastBatchReopenTime || 0;
                    const minutesSinceReopen = (Date.now() - lastReopen) / 1000 / 60;
                    const inGracePeriod = minutesSinceReopen < 5; 

                    // Solo actuamos si la fecha venció Y NO estamos en tregua
                    if (closeDate < today && !inGracePeriod) {
                        
                        const activeBatchId = club.activeGlobalOrderId;
                        
                        // Buscamos pedidos del lote activo que sigan "recopilando"
                        const ordersToUpdate = orders.filter(o => 
                            o.clubId === club.id && 
                            o.globalBatch === activeBatchId && 
                            o.status === 'recopilando'
                        );

                        // Si hay pedidos o si simplemente queremos cerrar el lote vacío por fecha:
                        if (ordersToUpdate.length > 0) {
                            try {
                                const batch = writeBatch(db);
                                
                                // 1. Actualizar los pedidos a "En Producción"
                                ordersToUpdate.forEach(order => {
                                    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                                    batch.update(ref, { 
                                        status: 'en_produccion', 
                                        visibleStatus: 'En Producción (Automático)' 
                                    });
                                });

                                // 2. NUEVO: Cerrar Lote actual, abrir el siguiente y limpiar fecha
                                const clubRef = doc(db, 'clubs', club.id);
                                batch.update(clubRef, { 
                                    activeGlobalOrderId: activeBatchId + 1, // Abrir siguiente
                                    nextBatchDate: null // Quitar la fecha vencida
                                });

                                await batch.commit();
                                showNotification(`📅 Lote #${activeBatchId} de ${club.name} cerrado y procesado.`, 'warning');
                            } catch (error) {
                                console.error("Error cierre automático:", error);
                            }
                        }
                    }
                }
            }
        };

        const timer = setTimeout(checkAndAutoCloseBatches, 3000);
        return () => clearTimeout(timer);
    }, [clubs, orders]);

  const [confirmation, setConfirmation] = useState(null); // Nuevo estado local para confirmaciones
  
  const [newSpecialOrder, setNewSpecialOrder] = useState({ 
      clubId: '', 
      items: [{ description: '', quantity: 1, price: 0, cost: 0 }], 
      paymentMethod: 'invoice', 
      globalBatch: 1 
  });
  
  const [expandedOrderId, setExpandedOrderId] = useState(null);
// --- ESTADO MEJORADO PARA INCIDENCIAS ---
  const [incidentForm, setIncidentForm] = useState({ 
      active: false, 
      order: null,      // El pedido original completo
      item: null,       // El producto afectado
      qty: 1,           // Cantidad a reponer
      cost: 0,          // Coste de reimpresión
      reason: '', 
      responsibility: 'internal', // 'internal' o 'club'
      internalOrigin: 'us',
      recharge: false,  // Si es fallo del club, ¿se cobra?
      targetBatch: ''   // A qué lote va la reposición
  });

  // Estado para Creación de Pedido Manual
    const [manualOrderModal, setManualOrderModal] = useState(false);
    const [manualOrderForm, setManualOrderForm] = useState({
        clubId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        paymentMethod: 'transfer', // manual, bizum, cash, transfer
        targetBatch: '', // Se rellenará automáticamente al elegir club
        items: [], // Lista de productos añadidos
        // Estado temporal para el producto que se está añadiendo ahora
        tempItem: { productId: '', size: '', name: '', number: '', price: 0, quantity: 1 } 
    });

  // --- FUNCIÓN PARA ABRIR EL MODAL ---
    const handleOpenIncident = (order, item) => {
        // Calculamos el coste inicial (1 unidad * coste unitario del producto)
        const unitCost = item.cost || 0; 

        setIncidentForm({
            active: true,
            order,
            item,
            qty: 1,
            cost: unitCost, // <--- ASIGNACIÓN AUTOMÁTICA INICIAL
            reason: '',
            responsibility: 'internal',
            internalOrigin: 'us',
            recharge: false,
            targetBatch: order.globalBatch === 'INDIVIDUAL' ? 'INDIVIDUAL' : (selectedClub?.activeGlobalOrderId || '')
        });
    };
  const [revertModal, setRevertModal] = useState({ active: false, clubId: null, currentBatchId: null, ordersCount: 0 });



  const selectedClub = clubs.find(c => c.id === selectedClubId) || clubs[0];

// --- FILTRADO POR TEMPORADA ---
  const financialOrders = useMemo(() => {
      if (financeSeasonId === 'all') return orders;
      const season = seasons.find(s => s.id === financeSeasonId);
      if (!season) return orders;
      
      const start = new Date(season.startDate).getTime();
      const end = new Date(season.endDate).getTime();
      
      return orders.filter(o => {
          // 1. Si tiene temporada manual, esta manda sobre la fecha
          if (o.manualSeasonId) return o.manualSeasonId === financeSeasonId;
          
          // 2. Si tiene temporada manual asignada a OTRA temporada, no debe salir aquí
          if (o.manualSeasonId && o.manualSeasonId !== financeSeasonId) return false;
          
          // 3. Si no hay manual, usamos la fecha
          const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
          return d >= start && d <= end;
      });
  }, [orders, financeSeasonId, seasons]);

// --- FUNCIÓN: ELIMINAR PEDIDO (Corregida) ---
  const handleDeleteOrder = (orderId) => {
      setConfirmation({
          msg: "⚠️ ¿Estás seguro de ELIMINAR este pedido definitivamente?",
          onConfirm: async () => {
              try {
                  await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
                  showNotification('Pedido eliminado correctamente');
              } catch (e) {
                  showNotification('Error al eliminar pedido', 'error');
              }
          }
      });
  };

  // --- FUNCIÓN: ELIMINAR LOTE GLOBAL (Corregida) ---
  const handleDeleteGlobalBatch = (clubId, batchId) => {
      const ordersInBatch = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId);
      setConfirmation({
          msg: `⚠️ PELIGRO: Vas a eliminar el LOTE GLOBAL #${batchId} con ${ordersInBatch.length} pedidos.\n\nEsta acción borrará TODOS los pedidos de este lote definitivamente.`,
          onConfirm: async () => {
              try {
                  const batch = writeBatch(db);
                  ordersInBatch.forEach(o => {
                      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
                      batch.delete(ref);
                  });
                  await batch.commit();
                  showNotification(`Lote #${batchId} eliminado correctamente`);
              } catch (e) {
                  showNotification('Error al eliminar el lote', 'error');
              }
          }
      });
  };

    // --- FUNCIÓN: PREPARAR Y GUARDAR EDICIÓN (Con Resumen) ---
  const handlePreSaveOrder = () => {
      const { original, modified } = editOrderModal;
      if (!original || !modified) return;

      const changes = [];

      // 1. Detectar cambios en cliente
      if(original.customer.name !== modified.customer.name) 
          changes.push(`👤 Cliente: "${original.customer.name}" ➝ "${modified.customer.name}"`);
      if(original.customer.email !== modified.customer.email) 
          changes.push(`📧 Email: "${original.customer.email}" ➝ "${modified.customer.email}"`);

      // 2. Detectar cambios en productos
      modified.items.forEach((mItem, idx) => {
          const oItem = original.items[idx];
          const prodName = mItem.name || 'Producto';
          
          if (!oItem) {
               changes.push(`➕ Nuevo producto: ${prodName}`);
          } else {
               if(oItem.name !== mItem.name) changes.push(`📦 Nombre (${idx+1}): "${oItem.name}" ➝ "${mItem.name}"`);
               if(oItem.quantity !== mItem.quantity) changes.push(`🔢 Cantidad (${prodName}): ${oItem.quantity} ➝ ${mItem.quantity}`);
               if(oItem.playerNumber !== mItem.playerNumber) changes.push(`Shirt # (${prodName}): ${oItem.playerNumber || '-'} ➝ ${mItem.playerNumber || '-'}`);
               if(oItem.playerName !== mItem.playerName) changes.push(`Shirt Name (${prodName}): ${oItem.playerName || '-'} ➝ ${mItem.playerName || '-'}`);
               if(oItem.price !== mItem.price) changes.push(`💶 Precio (${prodName}): ${oItem.price}€ ➝ ${mItem.price}€`);
          }
      });

      if (changes.length === 0) {
          showNotification('No se han detectado cambios', 'warning');
          return;
      }

      // 3. Pedir Confirmación con Resumen
      setConfirmation({
          title: "Confirmar Modificaciones",
          msg: "Estás a punto de aplicar los siguientes cambios:",
          details: changes, // Pasamos la lista de cambios
          onConfirm: async () => {
              try {
                  // Recalcular total
                  const newTotal = modified.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                  
                  await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', modified.id), {
                      customer: modified.customer,
                      items: modified.items,
                      total: newTotal
                  });
                  showNotification('Cambios aplicados correctamente');
                  setEditOrderModal({ active: false, original: null, modified: null });
              } catch (e) {
                  showNotification('Error al guardar cambios', 'error');
              }
          }
      });
  };

// --- FUNCIÓN: MOVER LOTE DE TEMPORADA ---
  const handleMoveBatchSeasonSubmit = async (newSeasonId) => {
      if (!moveSeasonModal.target) return;
      const { clubId, batchId } = moveSeasonModal.target;
      
      const ordersInBatch = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId);
      
      try {
          const batch = writeBatch(db);
          ordersInBatch.forEach(o => {
              const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
              batch.update(ref, { manualSeasonId: newSeasonId });
          });
          await batch.commit();
          showNotification(`Lote #${batchId} movido a la nueva temporada`);
          setMoveSeasonModal({ active: false, target: null });
      } catch (e) {
          showNotification('Error al mover el lote', 'error');
      }
  };

  // --- FUNCIÓN: GUARDAR EDICIÓN DE PEDIDO ---
  const handleSaveOrderEdit = async () => {
      if (!editOrderModal.order) return;
      try {
          const o = editOrderModal.order;
          // Recalcular total por si se cambiaron precios
          const newTotal = o.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
          
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), {
              customer: o.customer,
              items: o.items,
              total: newTotal
          });
          showNotification('Pedido modificado correctamente');
          setEditOrderModal({ active: false, order: null });
      } catch (e) {
          showNotification('Error al guardar cambios', 'error');
      }
  };

// --- FUNCIÓN PARA EDITAR LOTE ACTIVO (CON REACTIVACIÓN SEGURA) ---
  const saveActiveBatchManually = () => {
      if (!selectedClubId) return;
      
      const targetBatchId = parseInt(tempBatchValue);
      if (isNaN(targetBatchId) || targetBatchId < 1) {
          showNotification('Número de lote inválido', 'error');
          return;
      }

      // 1. Buscamos si existen pedidos en ese lote destino
      const batchOrders = orders.filter(o => 
          o.clubId === selectedClubId && 
          o.globalBatch === targetBatchId &&
          o.status !== 'pendiente_validacion'
      );

      // 2. Comprobamos si el lote está "cerrado" (tiene pedidos que no están recopilando)
      const needsReopening = batchOrders.some(o => o.status !== 'recopilando');

      const performUpdate = async (shouldReopenOrders) => {
          try {
              // A. Si hay que reactivar, actualizamos los pedidos en Firebase
              if (shouldReopenOrders && batchOrders.length > 0) {
                  const batch = writeBatch(db);
                  batchOrders.forEach(order => {
                      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                      // Forzamos estado 'recopilando'
                      batch.update(ref, { status: 'recopilando', visibleStatus: 'Recopilando (Reabierto)' });
                  });
                  await batch.commit();
              }

              // B. Actualizamos el puntero del Club (Estado Local)
              const club = clubs.find(c => c.id === selectedClubId);
              updateClub({ ...club, activeGlobalOrderId: targetBatchId });
              
              setIsEditingActiveBatch(false);
              showNotification(shouldReopenOrders 
                  ? `Lote #${targetBatchId} reactivado y establecido como actual.` 
                  : `Lote activo actualizado a #${targetBatchId}`
              );
          } catch (e) {
              console.error(e);
              showNotification('Error al actualizar el lote', 'error');
          }
      };

      // 3. Lógica de Confirmación
      if (needsReopening) {
          setConfirmation({
              title: "⚠️ ¿Reactivar Lote Cerrado?",
              msg: `El Lote Global #${targetBatchId} contiene pedidos que ya están EN PRODUCCIÓN o ENTREGADOS.\n\nSi lo seleccionas como ACTIVO, todos sus pedidos volverán al estado "RECOPILANDO" para aceptar cambios o nuevos añadidos.\n\n¿Estás seguro?`,
              onConfirm: () => performUpdate(true)
          });
      } else {
          // Si el lote está vacío o ya está recopilando, cambiamos directamente
          performUpdate(false);
      }
  };
  

// --- LÓGICA AVANZADA DE ESTADÍSTICAS ---
  const statsData = useMemo(() => {
      // 1. Filtrar pedidos por temporada y club
      let filteredOrders = financialOrders;
      if (statsClubFilter !== 'all') {
          filteredOrders = filteredOrders.filter(o => o.clubId === statsClubFilter);
      }

      const categorySales = {}; // Ahora guardará { total, subCats: Set }
      const productSales = {};  
      const monthlySales = {};  
      const paymentStats = {}; 

      filteredOrders.forEach(order => {
          // A. Métodos de Pago
          const pMethod = order.paymentMethod || 'card';
          if (!paymentStats[pMethod]) paymentStats[pMethod] = { amount: 0, count: 0 };
          paymentStats[pMethod].amount += order.total;
          paymentStats[pMethod].count += 1;

          // B. Acumular por Mes
          const date = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
          const monthKey = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
          const sortKey = date.getFullYear() * 100 + date.getMonth();
          
          if (!monthlySales[monthKey]) monthlySales[monthKey] = { total: 0, sort: sortKey };
          monthlySales[monthKey].total += order.total;

          // C. Items del pedido
          order.items.forEach(item => {
              const qty = item.quantity || 1;
              const subtotal = qty * item.price;

              // --- Categoría Equipo ---
              let teamCat = item.category || 'General';
              // Normalizamos: "Alevin A" -> "Alevin"
              const normalizedTeamCat = teamCat.trim().replace(/\s+[A-Z0-9]$/i, ''); 
              
              if (!categorySales[normalizedTeamCat]) {
                  // Usamos un Set para contar categorías únicas (ej: Alevin A Demo, Alevin B Demo, Alevin Atletico...)
                  categorySales[normalizedTeamCat] = { total: 0, subCats: new Set() };
              }
              
              categorySales[normalizedTeamCat].total += subtotal;
              // Añadimos identificador único: Club + NombreCarpetaReal
              categorySales[normalizedTeamCat].subCats.add(`${order.clubId}-${teamCat}`);

              // --- Producto Individual ---
              if (!productSales[item.name]) productSales[item.name] = { qty: 0, total: 0 };
              productSales[item.name].qty += qty;
              productSales[item.name].total += subtotal;
          });
      });

      // Procesar Arrays
      const sortedCategories = Object.entries(categorySales)
          .map(([name, data]) => ({ 
              name, 
              value: data.total,
              count: data.subCats.size // Cantidad de categorías reales
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

      const sortedProducts = Object.entries(productSales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.qty - a.qty) 
          .slice(0, 5); 

      // Ordenar Métodos de Pago
      const sortedPaymentMethods = Object.entries(paymentStats)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => {
              const priorities = { card: 1, cash: 2 };
              return (priorities[a.name] || 99) - (priorities[b.name] || 99);
          });

      const sortedMonths = Object.entries(monthlySales)
          .map(([name, data]) => ({ name, value: data.total, sort: data.sort }))
          .sort((a, b) => a.sort - b.sort);

      // Tabla Financiera (ACTUALIZADA con comisión individual)
      const clubFinancials = clubs.map(club => {
        const clubOrders = financialOrders.filter(o => o.clubId === club.id);
        let grossSales = 0;
        let supplierCost = 0;
        let gatewayCost = 0; // NUEVA VARIABLE ACUMULADORA

        clubOrders.forEach(order => {
            grossSales += order.total;
            const orderCost = order.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 1)), 0);
            const incidentCost = order.incidents?.reduce((sum, inc) => sum + (inc.cost || 0), 0) || 0;
            supplierCost += (orderCost + incidentCost);

            // CÁLCULO GASTO PASARELA
            // Si no tiene método definido, asumimos tarjeta ('card')
            if ((order.paymentMethod || 'card') === 'card') {
                const fee = (order.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee;
                gatewayCost += fee;
            }
        });

        const currentClubCommission = club.commission !== undefined ? club.commission : 0.12;
        const commClub = grossSales * currentClubCommission;
        const commCommercial = grossSales * financialConfig.commercialCommissionPct; 
        
        // RESTAR GASTO DE PASARELA AL NETO
        const netIncome = grossSales - supplierCost - commClub - commCommercial - gatewayCost;

        return {
            id: club.id, name: club.name, ordersCount: clubOrders.length,
            grossSales, supplierCost, commClub, commCommercial, 
            gatewayCost, // RETORNAR ESTE VALOR
            netIncome
        };
      }).sort((a, b) => b.grossSales - a.grossSales);

      return { sortedCategories, sortedProducts, sortedPaymentMethods, sortedMonths, clubFinancials };
  }, [financialOrders, statsClubFilter, clubs, financialConfig, products]);

  // Función auxiliar para calcular porcentajes de ancho en gráficas
  const getWidth = (val, max) => max > 0 ? `${(val / max) * 100}%` : '0%';

// Lógica de agrupación de pedidos (V4 - Con Lote Activo siempre visible)
  const accountingData = useMemo(() => {
      const visibleClubs = filterClubId === 'all' 
          ? clubs 
          : clubs.filter(c => c.id === filterClubId);

      return visibleClubs.map(club => {
          const clubOrders = financialOrders.filter(o => o.clubId === club.id);
          const batches = {};
          
          clubOrders.forEach(order => {
              let batchId = order.globalBatch || 1;
              if (order.type === 'special') batchId = 'SPECIAL';
              if (batchId === 'INDIVIDUAL') batchId = 'INDIVIDUAL';
              
              if (!batches[batchId]) batches[batchId] = [];
              batches[batchId].push(order);
          });

          // --- NUEVO: Asegurar que el Lote Activo aparece aunque esté vacío ---
          if (club.activeGlobalOrderId && !batches[club.activeGlobalOrderId]) {
              batches[club.activeGlobalOrderId] = [];
          }

          const sortedBatches = Object.entries(batches)
              .map(([id, orders]) => ({ id: (id === 'SPECIAL' || id === 'INDIVIDUAL') ? id : parseInt(id), orders }))
              .sort((a, b) => {
                  if (a.id === 'SPECIAL') return -1;
                  if (b.id === 'SPECIAL') return 1;
                  if (a.id === 'INDIVIDUAL') return -1;
                  if (b.id === 'INDIVIDUAL') return 1;
                  return b.id - a.id; 
              });

          return { club, batches: sortedBatches };
      });
  }, [clubs, financialOrders, filterClubId]);

  // 1. Estado para el modal de detalles
  const [accDetailsModal, setAccDetailsModal] = useState({ active: false, title: '', items: [], type: '' });

  // 2. Lógica de cálculo de totales
  const globalAccountingStats = useMemo(() => {
      const stats = {
        cardTotal: 0,
        cardFees: 0,
        cash: { collected: 0, pending: 0, listPending: [], listCollected: [] },
        supplier: { paid: 0, pending: 0, listPending: [], listPaid: [] },
        commercial: { paid: 0, pending: 0, listPending: [], listPaid: [] },
        club: { paid: 0, pending: 0, listPending: [], listPaid: [] }
    };

    accountingData.forEach(({ club, batches }) => {
        batches.forEach(batch => {
            const log = club.accountingLog?.[batch.id] || {};
            
            const cardOrders = batch.orders.filter(o => o.paymentMethod !== 'cash');
            const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
            
            const cardTotal = cardOrders.reduce((sum, o) => sum + o.total, 0);
            const cashTotal = cashOrders.reduce((sum, o) => sum + o.total, 0);
            const totalBatch = cardTotal + cashTotal;

            const cost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
            
            const commComm = totalBatch * financialConfig.commercialCommissionPct;
            const currentClubComm = club.commission !== undefined ? club.commission : 0.12; 
            const commClub = totalBatch * currentClubComm;

            // CALCULAR COMISIÓN TARJETA EN ESTE LOTE
            const fees = cardOrders.reduce((sum, o) => {
                return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
            }, 0);

            // ACUMULADORES
            stats.cardTotal += cardTotal;
            stats.cardFees += fees;

            const cashVal = cashTotal + (log.cashUnder || 0) - (log.cashOver || 0);
            if (log.cashCollected) {
                stats.cash.collected += cashVal;
                if(cashVal > 0) stats.cash.listCollected.push({ club: club.name, batch: batch.id, amount: cashVal });
            } else {
                stats.cash.pending += cashVal;
                if(cashVal > 0) stats.cash.listPending.push({ club: club.name, batch: batch.id, amount: cashVal });
            }

            const suppVal = cost + (log.supplierUnder || 0) - (log.supplierOver || 0);
            if (log.supplierPaid) {
                stats.supplier.paid += suppVal;
                if(suppVal > 0) stats.supplier.listPaid.push({ club: club.name, batch: batch.id, amount: suppVal });
            } else {
                stats.supplier.pending += suppVal;
                if(suppVal > 0) stats.supplier.listPending.push({ club: club.name, batch: batch.id, amount: suppVal });
            }

            const commVal = commComm + (log.commercialUnder || 0) - (log.commercialOver || 0);
            if (log.commercialPaid) {
                stats.commercial.paid += commVal;
                if(commVal > 0) stats.commercial.listPaid.push({ club: club.name, batch: batch.id, amount: commVal });
            } else {
                stats.commercial.pending += commVal;
                if(commVal > 0) stats.commercial.listPending.push({ club: club.name, batch: batch.id, amount: commVal });
            }

            const clubVal = commClub + (log.clubUnder || 0) - (log.clubOver || 0);
            if (log.clubPaid) {
                stats.club.paid += clubVal;
                if(clubVal > 0) stats.club.listPaid.push({ club: club.name, batch: batch.id, amount: clubVal });
            } else {
                stats.club.pending += clubVal;
                if(clubVal > 0) stats.club.listPending.push({ club: club.name, batch: batch.id, amount: clubVal });
            }
        });
    });
    return stats;
  }, [accountingData, financialConfig]);

  const totalRevenue = financialOrders.reduce((sum, o) => sum + o.total, 0);
  const totalIncidentCosts = financialOrders.reduce((sum, o) => {
      return sum + (o.incidents?.reduce((iSum, inc) => iSum + (inc.cost || 0), 0) || 0);
  }, 0);

  // Cálculo de beneficio neto global (ACTUALIZADO)
  const netProfit = financialOrders.reduce((total, o) => {
      const club = clubs.find(c => c.id === o.clubId);
      const clubCommPct = club && club.commission !== undefined ? club.commission : 0.12;
      
      const cost = o.items ? o.items.reduce((s, i) => s + ((i.cost || 0) * (i.quantity || 1)), 0) : (o.cost || 0);
      const incidentCost = o.incidents?.reduce((iSum, inc) => iSum + (inc.cost || 0), 0) || 0;
      
      const commClub = o.total * clubCommPct;
      const commComm = o.total * financialConfig.commercialCommissionPct;
      
      return total + (o.total - cost - incidentCost - commClub - commComm);
  }, 0);
  
  const averageTicket = totalRevenue / (financialOrders.length || 1);
  
  const handleAddSpecialItem = () => {
      setNewSpecialOrder({
          ...newSpecialOrder,
          items: [...newSpecialOrder.items, { description: '', quantity: 1, price: 0, cost: 0 }]
      });
  };

  const handleRemoveSpecialItem = (index) => {
      const updatedItems = newSpecialOrder.items.filter((_, i) => i !== index);
      setNewSpecialOrder({ ...newSpecialOrder, items: updatedItems });
  };

  const updateSpecialItem = (index, field, value) => {
      const updatedItems = [...newSpecialOrder.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      setNewSpecialOrder({ ...newSpecialOrder, items: updatedItems });
  };

  const calculateSpecialTotals = () => {
      const total = newSpecialOrder.items.reduce((acc, item) => acc + (parseFloat(item.price || 0) * parseFloat(item.quantity || 1)), 0);
      const totalCost = newSpecialOrder.items.reduce((acc, item) => acc + (parseFloat(item.cost || 0) * parseFloat(item.quantity || 1)), 0);
      return { total, totalCost };
  };

  const handleCreateSpecialOrder = (e) => {
      e.preventDefault();
      const club = clubs.find(c => c.id === newSpecialOrder.clubId);
      if(!club) return;

      const { total } = calculateSpecialTotals();

      const orderItems = newSpecialOrder.items.map(item => ({
          name: item.description,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          cost: parseFloat(item.cost),
          category: 'Servicios',
          image: '', 
          cartId: Date.now() + Math.random() 
      }));

      createSpecialOrder({
          clubId: newSpecialOrder.clubId,
          clubName: club.name,
          customer: { name: club.name, email: 'club@admin.com', phone: '-', notification: 'email' },
          items: orderItems,
          total: total,
          paymentMethod: newSpecialOrder.paymentMethod, 
          globalBatch: club.activeGlobalOrderId
      });
      
      setNewSpecialOrder({ 
          clubId: '', 
          items: [{ description: '', quantity: 1, price: 0, cost: 0 }], 
          paymentMethod: 'invoice', 
          globalBatch: 1 
      });
  };

// --- LÓGICA DE CREACIÓN DE REPOSICIÓN (V2 - Soporte Individual) ---
    const submitIncident = async () => {
        if (!incidentForm.item || !incidentForm.order) return;

        const { order, item, qty, cost, reason, responsibility, internalOrigin, recharge, targetBatch } = incidentForm;
        
        // 1. Calcular PRECIO DE VENTA (Lo que paga el cliente/club)
        // Solo cobramos si es culpa del club y marcamos "Cobrar de nuevo"
        const finalPrice = (responsibility === 'club' && recharge) ? item.price : 0;
        
        // 2. Calcular COSTE (Lo que pagamos nosotros al proveedor)
        // Si es fallo 'internal':
        //    - 'supplier': El proveedor asume el coste -> Coste para nosotros = 0
        //    - 'us': Nosotros asumimos el coste -> Coste = El coste de reimpresión introducido
        // Si es fallo 'club':
        //    - Nosotros pagamos la reimpresión (aunque luego se la cobremos al club en el precio) -> Coste = input cost
        let finalCost = parseFloat(cost);
        if (responsibility === 'internal' && internalOrigin === 'supplier') {
            finalCost = 0;
        }

        const totalOrder = finalPrice * qty;
        const batchIdToSave = targetBatch === 'INDIVIDUAL' ? 'INDIVIDUAL' : parseInt(targetBatch);

        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
                createdAt: serverTimestamp(),
                clubId: order.clubId,
                clubName: order.clubName || 'Club',
                customer: { 
                    name: `${order.customer.name} (REPOSICIÓN)`, 
                    email: order.customer.email, 
                    phone: order.customer.phone 
                },
                items: [{
                    ...item,
                    quantity: parseInt(qty),
                    price: finalPrice,
                    cost: finalCost, // <--- COSTE AJUSTADO
                    name: `${item.name} [REP]`
                }],
                total: totalOrder,
                status: targetBatch === 'INDIVIDUAL' ? 'en_produccion' : 'recopilando',
                visibleStatus: 'Reposición / Incidencia',
                type: 'replacement',
                paymentMethod: 'incident', 
                globalBatch: batchIdToSave,
                relatedOrderId: order.id,
                incidentDetails: {
                    originalItemId: item.cartId,
                    reason: reason,
                    responsibility: responsibility,
                    internalOrigin: responsibility === 'internal' ? internalOrigin : null // Guardamos el detalle
                },
                incidents: []
            });

            // Marcar incidencia resuelta en el original
            const originalRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
            await updateDoc(originalRef, {
                incidents: arrayUnion({
                    id: Date.now(),
                    itemId: item.cartId,
                    itemName: item.name,
                    date: new Date().toISOString(),
                    resolved: true,
                    note: `Reposición generada (${targetBatch === 'INDIVIDUAL' ? 'Entr. Individual' : 'Lote ' + targetBatch})`
                })
            });

            showNotification('Pedido de reposición generado correctamente');
            setIncidentForm({ ...incidentForm, active: false });

        } catch (e) {
            console.error(e);
            showNotification('Error al generar la reposición', 'error');
        }
    };

    const submitManualOrder = async () => {
    // Validaciones básicas
    if (!manualOrderForm.clubId || !manualOrderForm.customerName || manualOrderForm.items.length === 0) {
        showNotification('Faltan datos (Club, Cliente o Productos)', 'error');
        return;
    }

    const selectedClub = clubs.find(c => c.id === manualOrderForm.clubId);
    const totalOrder = manualOrderForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const batchId = manualOrderForm.targetBatch ? parseInt(manualOrderForm.targetBatch) : selectedClub.activeGlobalOrderId;

    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
            createdAt: serverTimestamp(),
            clubId: selectedClub.id,
            clubName: selectedClub.name,
            customer: { 
                name: manualOrderForm.customerName, 
                email: manualOrderForm.customerEmail || 'manual@pedido.com', 
                phone: manualOrderForm.customerPhone || '' 
            },
            items: manualOrderForm.items.map(item => ({
                ...item,
                // Aseguramos campos mínimos para que no falle el renderizado
                cartId: Date.now() + Math.random(),
                image: products.find(p => p.id === item.productId)?.image || null
            })),
            total: totalOrder,
            status: 'recopilando', // Estado inicial por defecto
            visibleStatus: 'Pedido Manual (Admin)',
            type: 'manual', // Marca especial para identificarlo
            paymentMethod: manualOrderForm.paymentMethod, 
            globalBatch: batchId,
            incidents: []
        });

        showNotification('Pedido manual creado correctamente');
        setManualOrderModal(false);
        // Resetear formulario
        setManualOrderForm({
            clubId: '', customerName: '', customerEmail: '', customerPhone: '',
            paymentMethod: 'transfer', targetBatch: '', items: [],
            tempItem: { productId: '', size: '', name: '', number: '', price: 0, quantity: 1 }
        });

    } catch (error) {
        console.error("Error creando pedido manual:", error);
        showNotification('Error al crear el pedido', 'error');
    }
};

    // Función auxiliar para añadir producto a la lista temporal
    const addManualItemToOrder = () => {
        // Extraemos todos los flags, incluyendo Talla (activeSize) y Escudo (activeShield)
        const { productId, size, name, number, quantity, activeName, activeNumber, activeSize, activeShield } = manualOrderForm.tempItem;
        if (!productId) return;

        const productDef = products.find(p => p.id === productId);
        
        // Configuración completa (con defaults seguros)
        const defaults = productDef.defaults || { name: false, number: false, size: false, shield: true };
        const modifiable = productDef.modifiable || { name: true, number: true, size: true, shield: true };
        const fee = financialConfig.modificationFee || 0;

        let unitPrice = productDef.price;

        // --- LÓGICA DE COBRO EXACTA ---
        // Se cobra si:
        // 1. Es modificable.
        // 2. El estado actual (activo/inactivo) es DIFERENTE al estado por defecto.
        // Ejemplo: Viene Escudo (true). Lo quito (activeShield = false). true != false -> COBRA.
        // Ejemplo: No viene Nombre (false). Lo pongo (activeName = true). false != true -> COBRA.

        if (modifiable.size && (activeSize !== defaults.size)) unitPrice += fee;
        if (modifiable.name && (activeName !== defaults.name)) unitPrice += fee;
        if (modifiable.number && (activeNumber !== defaults.number)) unitPrice += fee;
        if (modifiable.shield && (activeShield !== defaults.shield)) unitPrice += fee;

        const newItem = {
            productId,
            name: productDef.name, 
            // Si la talla está activa guardamos la talla, si no vacio
            size: activeSize ? (size || 'Única') : '',
            personalization: { 
                name: activeName ? (name || '') : '', 
                number: activeNumber ? (number || '') : '',
                shield: activeShield // true/false
            },
            price: unitPrice, 
            quantity: parseInt(quantity),
            cost: productDef.cost || 0,
            image: productDef.image
        };

        setManualOrderForm({
            ...manualOrderForm,
            items: [...manualOrderForm.items, newItem],
            // Resetear formulario temporal
            tempItem: { 
                productId: '', size: '', name: '', number: '', price: 0, quantity: 1, 
                activeName: false, activeNumber: false, activeSize: false, activeShield: false 
            } 
        });
    };

  const toggleIncidentResolved = (order, incidentId) => {
      const updatedIncidents = order.incidents.map(inc => 
          inc.id === incidentId ? { ...inc, resolved: !inc.resolved } : inc
      );
      updateIncidentStatus(order.id, updatedIncidents);
  };

  const handleRevertGlobalBatch = (clubId) => {
      const club = clubs.find(c => c.id === clubId);
      if (!club || club.activeGlobalOrderId <= 1) return;
      const currentBatchId = club.activeGlobalOrderId;
      const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === currentBatchId);

      if (batchOrders.length === 0) {
          decrementClubGlobalOrder(clubId, currentBatchId - 1);
      } else {
          setRevertModal({ active: true, clubId, currentBatchId, ordersCount: batchOrders.length });
      }
  };

  const processRevertBatch = async (action) => {
      const { clubId, currentBatchId } = revertModal;
      if (!clubId) return;
      const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === currentBatchId);
      
      try {
          const batch = writeBatch(db);
          batchOrders.forEach(order => {
              if (action === 'delete') {
                  batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id));
              } else {
                  batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { globalBatch: currentBatchId - 1 });
              }
          });
          await batch.commit();
          decrementClubGlobalOrder(clubId, currentBatchId - 1);
          setRevertModal({ active: false, clubId: null, currentBatchId: null, ordersCount: 0 });
      } catch (e) {
          console.error("Error processing revert:", e);
          alert("Error al procesar la acción. Inténtalo de nuevo.");
      }
  };

  const renderProductDetails = (item) => {
      const details = [];
      if(item.playerName && item.includeName) details.push(`Nombre: ${item.playerName}`);
      if(item.playerNumber && item.includeNumber) details.push(`Dorsal: ${item.playerNumber}`);
      if(item.color) details.push(`Color: ${item.color}`);
      return details.join(', ');
  };

  const toggleBatchPaymentStatus = (club, batchId, field) => {
      const currentLog = club.accountingLog || {};
      const batchLog = currentLog[batchId] || { supplierPaid: false, clubPaid: false, commercialPaid: false, fullCollection: false };
      
      const newBatchLog = { 
          ...batchLog, 
          [field]: !batchLog[field] 
      };

      updateClub({
          ...club,
          accountingLog: {
              ...currentLog,
              [batchId]: newBatchLog
          }
      });
  };

  // --- Función para guardar ajustes numéricos (Deudas/Cambios) ---
  const updateBatchValue = (club, batchId, field, value) => {
      const currentLog = club.accountingLog || {};
      const batchLog = currentLog[batchId] || {};
      
      updateClub({
          ...club,
          accountingLog: {
              ...currentLog,
              [batchId]: { ...batchLog, [field]: parseFloat(value) || 0 }
          }
      });
  };

// ---------------------------------------------------------
  // NUEVO: LÓGICA DE GESTIÓN DE DATOS Y EXCEL
  // ---------------------------------------------------------
  
  // Estado local para el selector de temporada en esta sección
  const [dataManageSeasonId, setDataManageSeasonId] = useState(seasons[seasons.length - 1]?.id || '');

// --- FUNCIONES AUXILIARES PARA EXCEL ---

  const escapeXml = (unsafe) => {
      return unsafe ? unsafe.toString().replace(/[<>&'"]/g, c => {
          switch (c) { case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;'; case '\'': return '&apos;'; case '"': return '&quot;'; }
      }) : '';
  };

  const handleExportSeasonExcel = async (seasonId) => {
      const season = seasons.find(s => s.id === seasonId);
      if (!season) return;

      const start = new Date(season.startDate).getTime();
      const end = new Date(season.endDate).getTime();
      
      const seasonOrders = orders.filter(o => {
          if (o.manualSeasonId) return o.manualSeasonId === season.id;
          const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
          return d >= start && d <= end;
      });

      if (seasonOrders.length === 0) {
          showNotification('No hay pedidos en esta temporada', 'error');
          return;
      }

      // --- CÁLCULO DE ESTADÍSTICAS ---
      const calculateStats = (ordersToProcess) => {
          let grossSales = 0;
          let supplierCost = 0;
          const monthly = {};
          const payment = {};
          const categories = {};
          const productsStats = {};

          ordersToProcess.forEach(order => {
              grossSales += order.total;
              
              const orderCost = order.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 1)), 0);
              const incidentCost = order.incidents?.reduce((sum, inc) => sum + (inc.cost || 0), 0) || 0;
              supplierCost += (orderCost + incidentCost);

              // Mensual
              const date = new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : Date.now());
              const monthKey = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
              const sortKey = date.getFullYear() * 100 + date.getMonth();
              if (!monthly[monthKey]) monthly[monthKey] = { total: 0, count: 0, sort: sortKey };
              monthly[monthKey].total += order.total;
              monthly[monthKey].count += 1;

              // Pago
              const method = order.paymentMethod || 'card';
              if (!payment[method]) payment[method] = { total: 0, count: 0 };
              payment[method].total += order.total;
              payment[method].count += 1;

              // Items
              order.items.forEach(item => {
                  const qty = item.quantity || 1;
                  const subtotal = qty * item.price;
                  let catName = item.category || 'General';
                  const normCat = catName.trim().replace(/\s+[A-Z0-9]$/i, '');
                  if (!categories[normCat]) categories[normCat] = { total: 0, subCats: new Set() };
                  categories[normCat].total += subtotal;
                  categories[normCat].subCats.add(`${order.clubId}-${catName}`);
                  if (!productsStats[item.name]) productsStats[item.name] = { qty: 0, total: 0 };
                  productsStats[item.name].qty += qty;
                  productsStats[item.name].total += subtotal;
              });
          });

          const commClub = grossSales * financialConfig.clubCommissionPct;
          const commCommercial = grossSales * financialConfig.commercialCommissionPct;
          const netIncome = grossSales - supplierCost - commClub - commCommercial;
          const avgTicket = ordersToProcess.length > 0 ? grossSales / ordersToProcess.length : 0;

          return { 
              count: ordersToProcess.length, 
              grossSales, supplierCost, commClub, commCommercial, netIncome, avgTicket,
              sortedMonths: Object.entries(monthly).map(([k,v]) => ({name: k, ...v})).sort((a,b) => a.sort - b.sort),
              sortedPayment: Object.entries(payment).map(([k,v]) => ({name: k, ...v})).sort((a,b) => b.total - a.total),
              sortedCats: Object.entries(categories).map(([k,v]) => ({name: k, total: v.total, count: v.subCats.size})).sort((a,b) => b.total - a.total),
              sortedProds: Object.entries(productsStats).map(([k,v]) => ({name: k, ...v})).sort((a,b) => b.qty - a.qty).slice(0, 10)
          };
      };

      // --- HELPER: AUTOFIT INTELIGENTE ---
      const adjustColumnWidths = (worksheet) => {
          worksheet.columns.forEach(column => {
              let maxLength = 0;
              column.eachCell({ includeEmpty: true }, (cell) => {
                  if (cell.isMerged) return; 
                  const v = cell.value ? cell.value.toString() : '';
                  if (v.length > maxLength) maxLength = v.length;
              });
              column.width = Math.max(maxLength + 2, 15); 
          });
      };

      // --- GENERACIÓN DEL EXCEL ---
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'FotoEsport Admin';
      workbook.created = new Date();

      // Definición de Estilos
      const styles = {
          header: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }, 
              font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 11, name: 'Calibri' },
              alignment: { horizontal: 'center', vertical: 'middle' }
          },
          subHeader: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }, 
              font: { color: { argb: 'FF000000' }, bold: true, size: 11, name: 'Calibri' }
          },
          title: {
              font: { color: { argb: 'FF000000' }, bold: true, size: 16, name: 'Calibri' } 
          },
          sectionTitle: {
              font: { color: { argb: 'FF10B981' }, bold: true, size: 12, name: 'Calibri' } 
          },
          currency: { numFmt: '#,##0.00 "€"' },
          currencyRed: { numFmt: '#,##0.00 "€"', font: { color: { argb: 'FFDC2626' } } },
          currencyBold: { numFmt: '#,##0.00 "€"', font: { bold: true } },
          subHeaderCurrency: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } },
              font: { bold: true }, numFmt: '#,##0.00 "€"'
          },
          subHeaderCurrencyRed: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } },
              font: { bold: true, color: { argb: 'FFDC2626' } }, numFmt: '#,##0.00 "€"'
          }
      };

      // ==========================================
      // HOJA 1: VISTA GLOBAL
      // ==========================================
      const globalStats = calculateStats(seasonOrders);
      const wsGlobal = workbook.addWorksheet('Vista Global');
      
      wsGlobal.columns = [
          { key: 'A' }, { key: 'B' }, { key: 'C' }, 
          { key: 'D' }, { key: 'E' }, { key: 'F' }, { key: 'G' }
      ];

      // Título
      wsGlobal.addRow([`Reporte Global - ${season.name}`]);
      wsGlobal.getCell('A1').font = styles.title.font;
      wsGlobal.mergeCells('A1:G1');
      wsGlobal.addRow([]);

      // KPIs
      wsGlobal.addRow(['Resumen General']);
      wsGlobal.getCell('A3').font = styles.sectionTitle.font;
      const r4 = wsGlobal.addRow(['Facturación Total', globalStats.grossSales]);
      r4.getCell(2).numFmt = styles.currencyBold.numFmt; r4.getCell(2).font = styles.currencyBold.font;
      const r5 = wsGlobal.addRow(['Beneficio Neto', globalStats.netIncome]);
      r5.getCell(2).numFmt = styles.currencyBold.numFmt; r5.getCell(2).font = styles.currencyBold.font;
      wsGlobal.addRow(['Total Pedidos', globalStats.count]);
      wsGlobal.addRow([]);

      // Tabla Financiera
      wsGlobal.addRow(['Reporte Financiero Detallado por Club']);
      wsGlobal.getCell('A8').font = styles.sectionTitle.font;
      wsGlobal.mergeCells('A8:G8');

      const headerRow = wsGlobal.addRow(['Club', 'Pedidos', 'Facturación', 'Coste Prov.', 'Com. Club', 'Neto Comercial', 'Beneficio Neto']);
      for(let i=1; i<=7; i++) Object.assign(headerRow.getCell(i), styles.header);

      clubs.forEach(c => {
          const cStats = calculateStats(seasonOrders.filter(o => o.clubId === c.id));
          const row = wsGlobal.addRow([
              c.name, cStats.count, cStats.grossSales, -cStats.supplierCost, -cStats.commClub, cStats.commCommercial, cStats.netIncome
          ]);
          row.getCell(3).numFmt = styles.currency.numFmt;
          Object.assign(row.getCell(4), styles.currencyRed);
          Object.assign(row.getCell(5), styles.currencyRed);
          row.getCell(6).numFmt = styles.currency.numFmt;
          Object.assign(row.getCell(7), styles.currencyBold);
      });

      // Totales
      const totalRow = wsGlobal.addRow([
          'TOTALES', globalStats.count, globalStats.grossSales, -globalStats.supplierCost, -globalStats.commClub, globalStats.commCommercial, globalStats.netIncome
      ]);
      Object.assign(totalRow.getCell(1), styles.subHeader);
      Object.assign(totalRow.getCell(2), styles.subHeader);
      Object.assign(totalRow.getCell(3), styles.subHeaderCurrency);
      Object.assign(totalRow.getCell(4), styles.subHeaderCurrencyRed);
      Object.assign(totalRow.getCell(5), styles.subHeaderCurrencyRed);
      Object.assign(totalRow.getCell(6), styles.subHeaderCurrency);
      Object.assign(totalRow.getCell(7), styles.subHeaderCurrency);
      wsGlobal.addRow([]);

      // Tablas Lado a Lado 1
      const rTitle1 = wsGlobal.addRow(['Evolución Mensual', '', '', 'Métodos de Pago']);
      rTitle1.getCell(1).font = styles.sectionTitle.font;
      rTitle1.getCell(4).font = styles.sectionTitle.font;
      wsGlobal.mergeCells(`A${rTitle1.number}:B${rTitle1.number}`);
      wsGlobal.mergeCells(`D${rTitle1.number}:E${rTitle1.number}`);

      const rHead1 = wsGlobal.addRow(['Mes', 'Ventas', '', 'Método', 'Total']);
      [1,2,4,5].forEach(i => Object.assign(rHead1.getCell(i), styles.subHeader));

      const max1 = Math.max(globalStats.sortedMonths.length, globalStats.sortedPayment.length);
      for(let i=0; i<max1; i++){
          const m = globalStats.sortedMonths[i];
          const p = globalStats.sortedPayment[i];
          const row = wsGlobal.addRow([
              m ? m.name : '', m ? m.total : '',
              '', 
              p ? p.name : '', p ? p.total : ''
          ]);
          if(m) row.getCell(2).numFmt = styles.currency.numFmt;
          if(p) row.getCell(5).numFmt = styles.currency.numFmt;
      }
      wsGlobal.addRow([]);

      // Tablas Lado a Lado 2
      const rTitle2 = wsGlobal.addRow(['Top Categorías', '', '', 'Top Productos']);
      rTitle2.getCell(1).font = styles.sectionTitle.font;
      rTitle2.getCell(4).font = styles.sectionTitle.font;
      wsGlobal.mergeCells(`A${rTitle2.number}:B${rTitle2.number}`);
      wsGlobal.mergeCells(`D${rTitle2.number}:E${rTitle2.number}`);

      const rHead2 = wsGlobal.addRow(['Nombre', 'Total', '', 'Producto', 'Uds']);
      [1,2,4,5].forEach(i => Object.assign(rHead2.getCell(i), styles.subHeader));

      const max2 = Math.max(globalStats.sortedCats.length, globalStats.sortedProds.length);
      for(let i=0; i<max2; i++){
          const c = globalStats.sortedCats[i];
          const p = globalStats.sortedProds[i];
          const row = wsGlobal.addRow([
              c ? c.name : '', c ? c.total : '',
              '', 
              p ? p.name : '', p ? p.qty : ''
          ]);
          if(c) row.getCell(2).numFmt = styles.currency.numFmt;
      }

      adjustColumnWidths(wsGlobal);

      // ==========================
      // HOJAS POR CLUB
      // ==========================
      clubs.forEach(club => {
          const clubOrders = seasonOrders.filter(o => o.clubId === club.id);
          const cStats = calculateStats(clubOrders);
          const sheetName = club.name.replace(/[*?:\/\[\]]/g, '').substring(0, 30);
          const ws = workbook.addWorksheet(sheetName);
          
          ws.columns = [
             { key: 'A' }, { key: 'B' }, { key: 'C' }, 
             { key: 'D' }, { key: 'E' }, { key: 'F' }, { key: 'G' }, { key: 'H' }, { key: 'I' }, { key: 'J' }
          ];

          ws.addRow([`${club.name} - Resumen`]);
          ws.getCell('A1').font = styles.title.font; 
          ws.mergeCells('A1:J1');
          ws.addRow([]);

          // KPIs
          const kpiHead = ws.addRow(['Métrica', 'Valor']);
          Object.assign(kpiHead.getCell(1), styles.subHeader);
          Object.assign(kpiHead.getCell(2), styles.subHeader);
          ws.addRow(['Total Pedidos', cStats.count]);
          const rTk = ws.addRow(['Ticket Medio', cStats.avgTicket]);
          rTk.getCell(2).numFmt = styles.currency.numFmt;
          ws.addRow([]);

          // Reporte Financiero
          ws.addRow(['Reporte Financiero']);
          ws.getCell(`A${ws.lastRow.number}`).font = styles.sectionTitle.font;
          
          const finHead = ws.addRow(['Concepto', 'Importe']);
          Object.assign(finHead.getCell(1), styles.subHeader);
          Object.assign(finHead.getCell(2), styles.subHeader);

          const addFin = (label, val, style) => {
              const r = ws.addRow([label, val]);
              if(style) Object.assign(r.getCell(2), style);
              else r.getCell(2).numFmt = styles.currency.numFmt;
          };
          addFin('Facturación Total', cStats.grossSales);
          addFin('Coste Proveedores', -cStats.supplierCost, styles.currencyRed);
          addFin('Comisión Club', -cStats.commClub, styles.currencyRed);
          addFin('Neto Comercial', cStats.commCommercial);
          addFin('Beneficio Neto', cStats.netIncome, styles.currencyBold);
          ws.addRow([]);

          // Tablas Top
          const rTopT = ws.addRow(['Categorías Top', '', '', 'Productos Top']);
          rTopT.getCell(1).font = styles.sectionTitle.font;
          rTopT.getCell(4).font = styles.sectionTitle.font;
          ws.mergeCells(`A${rTopT.number}:B${rTopT.number}`);
          ws.mergeCells(`D${rTopT.number}:E${rTopT.number}`);

          const topHead = ws.addRow(['Nombre', 'Total', '', 'Producto', 'Uds']);
          [1,2,4,5].forEach(i => Object.assign(topHead.getCell(i), styles.subHeader));

          const maxC = Math.max(cStats.sortedCats.length, cStats.sortedProds.length, 5);
          for(let i=0; i<maxC; i++){
              const c = cStats.sortedCats[i];
              const p = cStats.sortedProds[i];
              const r = ws.addRow([
                  c ? c.name : '', c ? c.total : '',
                  '',
                  p ? p.name : '', p ? p.qty : ''
              ]);
              if(c) r.getCell(2).numFmt = styles.currency.numFmt;
          }
          ws.addRow([]);

          // Listado
          ws.addRow(['Listado Detallado de Pedidos']);
          ws.getCell(`A${ws.lastRow.number}`).font = styles.title.font;
          ws.mergeCells(`A${ws.lastRow.number}:J${ws.lastRow.number}`);
          
          // --- CAMBIO AQUÍ: Se eliminó la columna 'Estado' ---
          const headers = ['ID', 'Fecha', 'Cliente', 'Email', 'Teléfono', 'Cant.', 'Productos', 'Total', 'Pago', 'Lote'];
          const hRow = ws.addRow(headers);
          hRow.eachCell(c => Object.assign(c, styles.header));

          clubOrders.forEach(o => {
              const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleDateString() : '-';
              
              const totalItems = o.items.reduce((acc, i) => acc + (i.quantity || 1), 0);
              
              const productsStr = o.items.map(i => {
                  const sizeStr = i.size ? `(${i.size})` : ''; 
                  return `${i.name} ${sizeStr}`.trim();
              }).join('; ');

              const r = ws.addRow([
                  o.id.slice(0,8), date, o.customer.name, o.customer.email, o.customer.phone,
                  totalItems, 
                  productsStr, 
                  o.total, 
                  // o.visibleStatus || o.status, // ELIMINADO
                  o.paymentMethod || 'card', o.globalBatch || 1
              ]);
              // La columna Total ahora es la número 8
              r.getCell(8).numFmt = styles.currency.numFmt;
          });

          adjustColumnWidths(ws);
      });

      // Descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${season.name.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const handleDeleteSeasonData = (seasonId) => {
      const season = seasons.find(s => s.id === seasonId);
      if (!season) return;

      const start = new Date(season.startDate).getTime();
      const end = new Date(season.endDate).getTime();
      
      const ordersToDelete = orders.filter(o => {
          if (o.manualSeasonId) return o.manualSeasonId === season.id;
          const d = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now();
          return d >= start && d <= end;
      });

      if (ordersToDelete.length === 0) {
          showNotification('No hay datos para borrar en esta temporada', 'warning');
          return;
      }

      setConfirmation({
          title: "⚠️ PELIGRO: BORRADO DE DATOS",
          msg: `Estás a punto de eliminar DEFINITIVAMENTE todos los datos de la temporada "${season.name}".\n\nEsto borrará ${ordersToDelete.length} pedidos de la base de datos y de la web.\n\nEsta acción NO SE PUEDE DESHACER. ¿Estás seguro?`,
          onConfirm: async () => {
              try {
                  const batch = writeBatch(db);
                  ordersToDelete.forEach(o => {
                      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
                      batch.delete(ref);
                  });
                  await batch.commit();
                  showNotification(`Se han eliminado ${ordersToDelete.length} pedidos de la temporada ${season.name}.`);
              } catch (e) {
                  console.error(e);
                  showNotification('Error al eliminar los datos', 'error');
              }
          }
      });
  };

  return (
    <div>
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b bg-white p-2 rounded-lg shadow-sm">
        {[
            {id: 'management', label: 'Gestión', icon: LayoutDashboard},
            {id: 'accounting', label: 'Pedidos', icon: Package},
            {id: 'special-orders', label: 'Pedidos Especiales', icon: Briefcase},
            {id: 'accounting-control', label: 'Contabilidad', icon: Banknote},
            {id: 'seasons', label: 'Temporadas', icon: Calendar}, 
            {id: 'files', label: 'Archivos', icon: Folder},
            {id: 'finances', label: 'Estadísticas', icon: BarChart3},
        ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${tab === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}>
                <item.icon className="w-4 h-4" /> {item.label}
            </button>
        ))}
      </div>

{/* --- PESTAÑA DE GESTIÓN (ADMIN DASHBOARD) --- */}
{tab === 'management' && (
    <div className="space-y-8 animate-fade-in">
        
        {/* 1. FILA SUPERIOR: CONFIGURACIONES GLOBALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* A) ESTADO DE LA TIENDA */}
            <div className={`rounded-xl shadow-sm border p-5 flex items-center justify-between transition-all ${storeConfig.isOpen ? 'bg-white border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${storeConfig.isOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {storeConfig.isOpen ? <Store className="w-6 h-6"/> : <Ban className="w-6 h-6"/>}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800">Estado de la Tienda</h4>
                        <p className={`text-xs font-medium ${storeConfig.isOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                            {storeConfig.isOpen ? 'Abierta al público' : 'Cerrada por mantenimiento'}
                        </p>
                        {!storeConfig.isOpen && (
                            <input 
                                className="mt-2 text-xs border border-red-200 p-1.5 rounded w-full bg-white text-red-800 placeholder-red-300 focus:outline-none" 
                                value={storeConfig.closedMessage} 
                                onChange={e => setStoreConfig({...storeConfig, closedMessage: e.target.value})} 
                                placeholder="Mensaje de cierre..."
                            />
                        )}
                    </div>
                </div>
                
                {/* Switch Interruptor */}
                <button 
                    onClick={() => setStoreConfig({...storeConfig, isOpen: !storeConfig.isOpen})}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 shadow-inner ${storeConfig.isOpen ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow transition-transform duration-300 ${storeConfig.isOpen ? 'translate-x-6' : 'translate-x-0'}`}/>
                </button>
            </div>

            {/* B) CONFIGURACIÓN FINANCIERA (ACTUALIZADA CON COSTE PERSONALIZACIÓN) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                    <Banknote className="w-5 h-5 text-blue-600"/>
                    <h4 className="font-bold text-gray-800 text-sm uppercase">Configuración Financiera</h4>
                </div>
                
                {/* CAMBIAMOS A GRID DE 3 COLUMNAS PARA QUE QUEPA TODO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* 1. Comisión Comercial */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Comisión Web Global</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                className="w-full border border-gray-300 rounded-lg p-2 text-right pr-6 font-bold text-gray-800 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                value={(financialConfig.commercialCommissionPct * 100).toFixed(0)}
                                onChange={(e) => setFinancialConfig(prev => ({...prev, commercialCommissionPct: parseFloat(e.target.value)/100}))}
                                onBlur={() => updateFinancialConfig(financialConfig)}
                            />
                            <span className="absolute right-2 top-2 text-gray-400 font-bold text-sm">%</span>
                        </div>
                    </div>

                    {/* 2. NUEVO: Coste por Personalización */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Extra Personalización</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                step="0.10"
                                className="w-full border border-gray-300 rounded-lg p-2 text-right pr-6 font-bold text-gray-800 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                                value={financialConfig.modificationFee}
                                onChange={(e) => setFinancialConfig(prev => ({...prev, modificationFee: parseFloat(e.target.value)}))}
                                onBlur={() => updateFinancialConfig(financialConfig)}
                            />
                            <span className="absolute right-2 top-2 text-gray-400 font-bold text-sm">€</span>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1">Coste unitario por cada modificación.</p>
                    </div>

                    {/* 3. Costes Pasarela */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Coste Pasarela (Var + Fijo)</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="number" step="0.1"
                                    className="w-full border border-gray-300 rounded-lg p-2 text-right pr-5 font-bold text-gray-800 text-xs focus:border-blue-500 outline-none"
                                    value={(financialConfig.gatewayPercentFee * 100).toFixed(1)}
                                    onChange={(e) => setFinancialConfig(prev => ({...prev, gatewayPercentFee: parseFloat(e.target.value)/100}))}
                                    onBlur={() => updateFinancialConfig(financialConfig)}
                                />
                                <span className="absolute right-1 top-2 text-gray-400 font-bold text-[10px]">%</span>
                            </div>
                            <div className="relative flex-1">
                                <input 
                                    type="number" step="0.01"
                                    className="w-full border border-gray-300 rounded-lg p-2 text-right pr-4 font-bold text-gray-800 text-xs focus:border-blue-500 outline-none"
                                    value={financialConfig.gatewayFixedFee}
                                    onChange={(e) => setFinancialConfig(prev => ({...prev, gatewayFixedFee: parseFloat(e.target.value)}))}
                                    onBlur={() => updateFinancialConfig(financialConfig)}
                                />
                                <span className="absolute right-1 top-2 text-gray-400 font-bold text-[10px]">€</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 2. FILA PRINCIPAL: PRODUCTOS Y CLUBES (DIVIDIDO 50/50 en pantallas grandes) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            
            {/* COLUMNA IZQUIERDA: CATÁLOGO DE PRODUCTOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col min-h-[600px] overflow-hidden">
                {/* Cabecera Productos */}
                <div className="px-6 py-5 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h4 className="font-black text-gray-800 text-lg flex items-center gap-2 tracking-tight">
                            <Package className="w-6 h-6 text-emerald-600"/>
                            Catálogo Base
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-1 ml-8">Inventario y precios globales.</p>
                    </div>
                    <button 
                        onClick={addProduct} 
                        className="bg-gray-900 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-gray-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4"/> <span className="text-xs font-bold">Crear</span>
                    </button>
                </div>

                {/* Lista Productos */}
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50 custom-scrollbar space-y-4">
                    {products.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 opacity-60">
                            <Package className="w-16 h-16 text-gray-300 mb-2"/>
                            <p className="font-bold text-sm">Catálogo vacío</p>
                        </div>
                    ) : (
                        products.map(p => (
                            <ProductEditorRow key={p.id} product={p} updateProduct={updateProduct} deleteProduct={deleteProduct} />
                        ))
                    )}
                </div>
            </div>

            {/* COLUMNA DERECHA: GESTIÓN DE CLUBES */}
            <div className="space-y-6">
                
                {/* A) Formulario Crear Club (ESTILO PASTEL) */}
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl shadow-sm border border-indigo-100 p-6 relative overflow-hidden">
                    
                    {/* Decoración Fondo Sutil */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-4 mb-6 relative z-10">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-50 text-indigo-600">
                            <Users className="w-6 h-6"/>
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-indigo-900 leading-tight">Alta de Nuevo Club</h3>
                            <p className="text-xs text-indigo-400 font-medium">Registra una nueva entidad en el sistema</p>
                        </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                            
                            {/* Logo Upload (Estilo Suave) */}
                            <div className="md:col-span-3 flex flex-col items-center">
                                <label className="w-full aspect-square rounded-xl bg-indigo-50/50 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all relative overflow-hidden group">
                                    <Upload className="w-6 h-6 text-indigo-300 mb-1 group-hover:scale-110 transition-transform group-hover:text-indigo-500"/>
                                    <span id="fileNameDisplay" className="text-[9px] text-indigo-400 font-bold uppercase text-center leading-tight px-1 group-hover:text-indigo-600">Subir<br/>Escudo</span>
                                    <input 
                                        type="file" 
                                        id="newClubLogo" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if(file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const img = document.createElement('img');
                                                    img.src = ev.target.result;
                                                    img.className = "absolute inset-0 w-full h-full object-contain bg-white p-1 rounded-lg";
                                                    e.target.parentElement.appendChild(img);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            {/* Campos de Texto (Estilo Limpio) */}
                            <div className="md:col-span-9 space-y-3">
                                <div>
                                    <input 
                                        id="newClubName" 
                                        placeholder="Nombre Oficial del Club" 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-bold focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all placeholder-gray-400" 
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <input 
                                        id="newClubUser" 
                                        placeholder="Usuario" 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all placeholder-gray-400" 
                                    />
                                    
                                    <div className="relative">
                                        <input 
                                            id="newClubPass" 
                                            type={showNewClubPass ? "text" : "password"}
                                            placeholder="Contraseña" 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm pr-8 text-gray-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all placeholder-gray-400" 
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowNewClubPass(!showNewClubPass)} 
                                            className="absolute right-2 top-2 text-gray-400 hover:text-indigo-500"
                                        >
                                            {showNewClubPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 pl-1">Color:</span>
                                    <ColorPicker selectedColor={newClubColor} onChange={setNewClubColor} />
                                </div>
                            </div>
                        </div>

                        <button 
                            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                            onClick={() => { 
                                const nameFn = document.getElementById('newClubName');
                                const userFn = document.getElementById('newClubUser');
                                const passFn = document.getElementById('newClubPass');
                                const fileFn = document.getElementById('newClubLogo');
                                
                                if(nameFn.value && userFn.value && passFn.value) {
                                    createClub({
                                        name: nameFn.value, 
                                        code: nameFn.value.slice(0,3).toUpperCase(),
                                        username: userFn.value,
                                        pass: passFn.value,
                                        color: newClubColor
                                    }, fileFn.files[0]);
                                    
                                    // Limpiar campos
                                    nameFn.value = ''; userFn.value = ''; passFn.value = ''; fileFn.value = '';
                                    setNewClubColor('white');
                                    const preview = fileFn.parentElement.querySelector('img');
                                    if(preview) preview.remove();
                                } else {
                                    alert("Por favor completa los campos.");
                                }
                            }} 
                        >
                            <Plus className="w-4 h-4"/> Registrar Club
                        </button>
                    </div>
                </div>

                {/* B) Lista de Clubes (Estilo Consistente) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600"/> Clubes Activos
                        </h4>
                        <span className="text-xs bg-white border px-2 py-1 rounded-full text-gray-500 font-medium">{clubs.length} clubes</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {clubs.length === 0 ? (
                            <p className="text-center text-gray-400 py-10">No hay clubes registrados.</p>
                        ) : (
                            clubs.map(c => (
                                <ClubEditorRow key={c.id} club={c} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} />
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    </div>
)}

      {/* --- REVERT MODAL --- */}
      {revertModal.active && (
          <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-2 border-red-100">
                  <div className="flex items-center gap-2 mb-4 text-red-600">
                      <AlertTriangle className="w-6 h-6"/>
                      <h3 className="font-bold text-lg">Reabrir Pedido Global Anterior</h3>
                  </div>
                  <p className="text-gray-600 mb-2">
                      Estás a punto de eliminar el <strong>Lote Global #{revertModal.currentBatchId}</strong> y volver a activar el <strong>#{revertModal.currentBatchId - 1}</strong>.
                  </p>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6">
                      <p className="font-bold text-red-800 text-sm mb-2">¡Atención! El lote actual tiene {revertModal.ordersCount} pedidos.</p>
                      
                      <div className="space-y-2">
                          <button onClick={() => processRevertBatch('transfer')} className="w-full text-left p-3 rounded bg-white border border-red-200 hover:border-red-400 flex items-center gap-3 transition-colors group">
                              <div className="bg-blue-100 p-2 rounded-full text-blue-600 group-hover:bg-blue-200"><MoveLeft className="w-4 h-4"/></div>
                              <div><span className="block font-bold text-sm text-gray-800">Traspasar al Anterior</span><span className="block text-xs text-gray-500">Moverlos al Lote #{revertModal.currentBatchId - 1} y borrar este lote.</span></div>
                          </button>
                          <button onClick={() => processRevertBatch('delete')} className="w-full text-left p-3 rounded bg-white border border-red-200 hover:border-red-400 flex items-center gap-3 transition-colors group">
                              <div className="bg-red-100 p-2 rounded-full text-red-600 group-hover:bg-red-200"><Trash2 className="w-4 h-4"/></div>
                              <div><span className="block font-bold text-sm text-gray-800">Eliminar Pedidos</span><span className="block text-xs text-gray-500">Borrar estos pedidos permanentemente.</span></div>
                          </button>
                      </div>
                  </div>
                  <div className="flex justify-end">
                      <Button variant="secondary" onClick={() => setRevertModal({ active: false, clubId: null, currentBatchId: null, ordersCount: 0 })}>Cancelar</Button>
                  </div>
              </div>
          </div>
      )}

{/* --- MODAL DE GESTIÓN DE INCIDENCIAS AVANZADO --- */}
      {incidentForm.active && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-orange-800 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5"/> Gestión de Incidencia
                      </h3>
                      <button onClick={() => setIncidentForm({...incidentForm, active: false})}><X className="w-5 h-5 text-orange-400"/></button>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    {/* Resumen del Producto */}
                      <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm">
                          <div className="flex justify-between items-start mb-3">
                              <div>
                                  <p className="font-bold text-gray-800 text-base">{incidentForm.item.name}</p>
                                  <p className="text-xs text-gray-500">
                                      Pedido: {incidentForm.order.customer.name} | Lote Global #{incidentForm.order.globalBatch}
                                  </p>
                              </div>
                              <div className="text-right bg-white px-2 py-1 rounded border border-gray-200">
                                  <span className="block text-[10px] text-gray-400 uppercase font-bold">Cant. Solicitada</span>
                                  <span className="font-mono font-bold text-lg text-gray-800">{incidentForm.item.quantity || 1} ud.</span>
                              </div>
                          </div>
                          
                          {/* Características del Producto */}
                          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-700 grid grid-cols-2 gap-y-2 gap-x-4">
                              {incidentForm.item.playerName && (
                                  <div className="flex justify-between">
                                      <span className="font-bold text-gray-400 uppercase text-[10px]">Nombre:</span> 
                                      <span className="font-medium">{incidentForm.item.playerName}</span>
                                  </div>
                              )}
                              {incidentForm.item.playerNumber && (
                                  <div className="flex justify-between">
                                      <span className="font-bold text-gray-400 uppercase text-[10px]">Dorsal:</span> 
                                      <span className="font-medium">{incidentForm.item.playerNumber}</span>
                                  </div>
                              )}
                              {incidentForm.item.color && (
                                  <div className="flex justify-between">
                                      <span className="font-bold text-gray-400 uppercase text-[10px]">Color:</span> 
                                      <span className="font-medium capitalize">{incidentForm.item.color}</span>
                                  </div>
                              )}
                              {incidentForm.item.size && (
                                  <div className="flex justify-between">
                                      <span className="font-bold text-gray-400 uppercase text-[10px]">Talla:</span> 
                                      <span className="font-medium">{incidentForm.item.size}</span>
                                  </div>
                              )}
                              {/* Si no hay personalización */}
                              {!incidentForm.item.playerName && !incidentForm.item.playerNumber && !incidentForm.item.color && !incidentForm.item.size && (
                                  <span className="text-gray-400 italic col-span-2">Producto estándar sin personalización</span>
                              )}
                          </div>
                      </div>

                      {/* Configuración de la Reposición */}
                      <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Cantidad a Reponer</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    max={incidentForm.item.quantity}
                                    className="w-full border border-gray-300 rounded-lg p-2 font-bold text-gray-800"
                                    value={incidentForm.qty}
                                    onChange={(e) => {
                                        const newQty = parseInt(e.target.value) || 1;
                                        const unitCost = incidentForm.item.cost || 0;
                                        
                                        // ACTUALIZAMOS CANTIDAD Y RECALCULAMOS COSTE AUTOMÁTICAMENTE
                                        setIncidentForm({
                                            ...incidentForm, 
                                            qty: newQty,
                                            cost: parseFloat((newQty * unitCost).toFixed(2)) // Coste = Cantidad * Coste Unitario
                                        });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Coste Producción</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-lg p-2 font-bold text-gray-600 bg-gray-100 cursor-not-allowed"
                                        value={incidentForm.cost}
                                        readOnly // <--- SOLO LECTURA (Se calcula solo)
                                    />
                                    <span className="absolute right-3 top-2 text-gray-500 font-bold">€</span>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1">
                                    Calculado: {incidentForm.qty} u. x {incidentForm.item.cost?.toFixed(2)}€/ud
                                </p>
                            </div>
                      </div>

                      {/* Responsabilidad y Cobro */}
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Origen del Fallo</label>
                            
                            {/* NIVEL 1: ¿QUIÉN TIENE LA CULPA? */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button 
                                    type="button"
                                    onClick={() => setIncidentForm({...incidentForm, responsibility: 'internal'})}
                                    className={`p-2 rounded text-sm border flex flex-col items-center gap-1 transition-all ${incidentForm.responsibility === 'internal' ? 'bg-red-50 border-red-300 text-red-700 ring-2 ring-red-100 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <span>Interno / Fabrica</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIncidentForm({...incidentForm, responsibility: 'club'})}
                                    className={`p-2 rounded text-sm border flex flex-col items-center gap-1 transition-all ${incidentForm.responsibility === 'club' ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-100 font-bold' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <span>Error del Club</span>
                                </button>
                            </div>

                            {/* NIVEL 2: DETALLES SEGÚN SELECCIÓN */}
                            
                            {/* CASO A: FALLO INTERNO (Sub-selección Proveedor vs Nosotros) */}
                            {incidentForm.responsibility === 'internal' && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100 animate-fade-in mb-3">
                                    <p className="text-[10px] uppercase font-bold text-red-400 mb-2">¿Quién asume el coste de reposición?</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setIncidentForm({...incidentForm, internalOrigin: 'us'})}
                                            className={`px-2 py-2 text-xs rounded border transition-colors flex flex-col items-center ${incidentForm.internalOrigin === 'us' ? 'bg-white border-red-300 text-red-700 shadow-sm font-bold' : 'bg-red-100/50 border-transparent text-red-400 hover:bg-red-100'}`}
                                        >
                                            <span>Nosotros (F.Esport)</span>
                                            <span className="text-[9px] mt-0.5 opacity-80">Pagamos coste ({incidentForm.cost}€)</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setIncidentForm({...incidentForm, internalOrigin: 'supplier'})}
                                            className={`px-2 py-2 text-xs rounded border transition-colors flex flex-col items-center ${incidentForm.internalOrigin === 'supplier' ? 'bg-white border-red-300 text-red-700 shadow-sm font-bold' : 'bg-red-100/50 border-transparent text-red-400 hover:bg-red-100'}`}
                                        >
                                            <span>El Proveedor</span>
                                            <span className="text-[9px] mt-0.5 opacity-80">Garantía (Coste 0€)</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* CASO B: FALLO CLUB (Opción de cobrar) */}
                            {incidentForm.responsibility === 'club' && (
                                <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in mb-3">
                                    <input 
                                        type="checkbox" 
                                        id="recharge" 
                                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                                        checked={incidentForm.recharge}
                                        onChange={e => setIncidentForm({...incidentForm, recharge: e.target.checked})}
                                    />
                                    <label htmlFor="recharge" className="text-sm text-blue-800 font-medium cursor-pointer select-none">
                                        ¿Cobrar de nuevo al club? <span className="font-bold">({incidentForm.item.price.toFixed(2)}€)</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Asignación a Lote Inteligente */}
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Añadir a Lote de Entrega</label>
                          <select 
                              className="w-full border rounded p-2 text-sm bg-gray-50 focus:ring-2 focus:ring-orange-500 outline-none"
                              value={incidentForm.targetBatch}
                              onChange={e => setIncidentForm({...incidentForm, targetBatch: e.target.value})}
                          >
                              {/* OPCIÓN 1: Entrega Individual */}
                              <option value="INDIVIDUAL">📦 Entrega Individual (Excepcional)</option>
                              
                              {/* OPCIÓN 2: Lotes Activos (Recopilando o Producción) */}
                              {(() => {
                                  const cId = incidentForm.order.clubId;
                                  // Buscar lotes existentes con actividad
                                  const activeBatchesMap = {};
                                  orders.filter(o => o.clubId === cId && !['SPECIAL', 'INDIVIDUAL'].includes(o.globalBatch)).forEach(o => {
                                      if(['recopilando', 'en_produccion'].includes(o.status)) {
                                          activeBatchesMap[o.globalBatch] = o.status;
                                      }
                                  });
                                  
                                  // Asegurar que el lote activo del club aparece aunque esté vacío
                                  const club = clubs.find(c => c.id === cId);
                                  const currentActive = club ? club.activeGlobalOrderId : 1;
                                  if (!activeBatchesMap[currentActive]) activeBatchesMap[currentActive] = 'recopilando';

                                  return Object.entries(activeBatchesMap)
                                      .sort((a,b) => parseInt(a[0]) - parseInt(b[0]))
                                      .map(([id, status]) => (
                                          <option key={id} value={id}>
                                              Lote Global #{id} ({status === 'recopilando' ? 'Abierto' : 'En Producción'})
                                          </option>
                                      ));
                              })()}

                              {/* OPCIÓN 3: Siguiente Lote Futuro */}
                              {(() => {
                                  const club = clubs.find(c => c.id === incidentForm.order.clubId);
                                  const nextId = (club ? club.activeGlobalOrderId : 0) + 1;
                                  return <option value={nextId}>✨ Nuevo Lote Futuro #{nextId}</option>
                              })()}
                          </select>
                          <p className="text-[10px] text-gray-400 mt-1">
                              {incidentForm.targetBatch === 'INDIVIDUAL' 
                                  ? 'No se vinculará a ningún lote grupal. Se gestionará por separado.' 
                                  : 'Se sumará al listado del lote seleccionado para entrega conjunta.'}
                          </p>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Motivo / Nota Interna</label>
                          <textarea 
                              className="w-full border rounded p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-orange-500 outline-none" 
                              placeholder="Ej. Camiseta manchada, dorsal incorrecto..."
                              value={incidentForm.reason} 
                              onChange={e => setIncidentForm({...incidentForm, reason: e.target.value})}
                          ></textarea>
                      </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                      <Button variant="secondary" onClick={() => setIncidentForm({...incidentForm, active: false})}>Cancelar</Button>
                      <Button variant="warning" onClick={submitIncident}>
                          Generar Reposición
                      </Button>
                  </div>
              </div>
          </div>
      )}
{/* --- MODAL MOVER TEMPORADA (POR LOTE) --- */}
      {moveSeasonModal.active && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                      <Calendar className="w-5 h-5 text-blue-600"/> Mover Lote de Temporada
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                      Estás moviendo el <strong>Lote Global #{moveSeasonModal.target.batchId}</strong> completo. Todos los pedidos incluidos pasarán a la temporada seleccionada.
                  </p>
                  <div className="space-y-2 mb-6">
                      {seasons.map(s => (
                          <button key={s.id} onClick={() => handleMoveBatchSeasonSubmit(s.id)} className="w-full text-left p-3 rounded border text-sm font-medium hover:bg-blue-50 hover:border-blue-300 transition-colors">
                              {s.name}
                          </button>
                      ))}
                      <button onClick={() => handleMoveBatchSeasonSubmit(null)} className="w-full text-left p-3 rounded border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 text-center">
                          Restaurar a Fecha Original
                      </button>
                  </div>
                  <div className="flex justify-end"><Button variant="secondary" onClick={() => setMoveSeasonModal({ active: false, target: null })}>Cancelar</Button></div>
              </div>
          </div>
      )}

{/* --- MODAL EDITAR PEDIDO (CORREGIDO) --- */}
      {editOrderModal.active && editOrderModal.modified && (
          <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-emerald-800 flex items-center gap-2"><Edit3 className="w-5 h-5"/> Editar Pedido</h3>
                      <button onClick={() => setEditOrderModal({ active: false, original: null, modified: null })}><X className="w-5 h-5 text-gray-400"/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      {/* Datos Cliente */}
                      <div className="grid grid-cols-2 gap-4">
                          <Input label="Nombre Cliente" value={editOrderModal.modified.customer.name} onChange={e => setEditOrderModal({ ...editOrderModal, modified: { ...editOrderModal.modified, customer: { ...editOrderModal.modified.customer, name: e.target.value } } })} />
                          <Input label="Email" value={editOrderModal.modified.customer.email} onChange={e => setEditOrderModal({ ...editOrderModal, modified: { ...editOrderModal.modified, customer: { ...editOrderModal.modified.customer, email: e.target.value } } })} />
                      </div>

                      {/* Lista Productos */}
                      <div>
                          <h4 className="font-bold text-sm text-gray-700 mb-2 uppercase">Productos</h4>
                          <div className="space-y-3">
                              {editOrderModal.modified.items.map((item, idx) => (
                                  <div key={idx} className="border p-3 rounded bg-gray-50 grid grid-cols-12 gap-2 items-end">
                                      <div className="col-span-4"><label className="text-[10px] block font-bold text-gray-400">Producto</label><input className="w-full text-sm border rounded p-1" value={item.name} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].name = e.target.value; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                      <div className="col-span-2"><label className="text-[10px] block font-bold text-gray-400">Dorsal</label><input className="w-full text-sm border rounded p-1" value={item.playerNumber || ''} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].playerNumber = e.target.value; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                      <div className="col-span-3"><label className="text-[10px] block font-bold text-gray-400">Nombre</label><input className="w-full text-sm border rounded p-1" value={item.playerName || ''} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].playerName = e.target.value; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                      
                                      {/* AQUÍ ESTÁ EL CAMBIO DE COLOR: Se quitó 'text-blue-600' y se puso 'text-gray-900' */}
                                      <div className="col-span-1"><label className="text-[10px] block font-bold text-gray-400">Cant.</label><input type="number" className="w-full text-sm border rounded p-1 text-gray-900" value={item.quantity} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].quantity = parseInt(e.target.value) || 1; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                      
                                      <div className="col-span-2"><label className="text-[10px] block font-bold text-gray-400">Precio</label><input type="number" className="w-full text-sm border rounded p-1" value={item.price} onChange={(e) => { const newItems = [...editOrderModal.modified.items]; newItems[idx].price = parseFloat(e.target.value) || 0; setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); }} /></div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                      <Button variant="secondary" onClick={() => setEditOrderModal({ active: false, original: null, modified: null })}>Cancelar</Button>
                      <Button onClick={handlePreSaveOrder}>Guardar Cambios</Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL CONFIRMACIÓN (LOCAL DEL DASHBOARD) --- */}
      {confirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] backdrop-blur-sm animate-fade-in">
              <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 border-2 border-gray-100">
                  <div className="flex items-center gap-2 mb-4 text-gray-800">
                      <AlertCircle className="w-6 h-6 text-emerald-600"/>
                      <h3 className="font-bold text-lg">{confirmation.title || 'Confirmar Acción'}</h3>
                  </div>
                  
                  <p className="text-gray-600 mb-4 whitespace-pre-line">{confirmation.msg}</p>
                  
                  {/* Lista de detalles (Resumen de cambios) */}
                  {confirmation.details && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-6 max-h-40 overflow-y-auto text-sm text-emerald-900 space-y-1">
                          {confirmation.details.map((line, i) => (
                              <div key={i} className="font-mono">{line}</div>
                          ))}
                      </div>
                  )}

                  <div className="flex justify-end gap-3">
                      <Button variant="secondary" onClick={() => setConfirmation(null)}>Cancelar</Button>
                      <Button variant="danger" onClick={() => { confirmation.onConfirm(); setConfirmation(null); }}>
                          Confirmar
                      </Button>
                  </div>
              </div>
          </div>
      )}


{/* --- PESTAÑA PEDIDOS/CONTABILIDAD (AdminDashboard) --- */}
{tab === 'accounting' && (
    <div className="animate-fade-in space-y-8 relative">
        
        {/* A. BARRA DE HERRAMIENTAS */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Layers className="w-5 h-5"/></div>
                <div>
                    <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Control de Lotes</h4>
                    <p className="text-xs text-slate-500">Gestión de pedidos globales</p>
                </div>
            </div>

            {/* Selector Central */}
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
                <div className="relative group flex items-center">
                    <select 
                        className="appearance-none bg-transparent text-base font-extrabold text-slate-700 pr-8 cursor-pointer outline-none hover:text-blue-600 transition-colors"
                        value={selectedClubId}
                        onChange={(e) => setSelectedClubId(e.target.value)}
                    >
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronRight className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none rotate-90"/>
                </div>
                <div className="h-8 w-px bg-slate-100"></div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-bold uppercase">Lote Activo:</span>
                    <span className="text-base font-extrabold text-slate-800">#{selectedClub?.activeGlobalOrderId}</span>
                </div>
            </div>

            {/* Acciones Globales */}
            <div className="flex items-center gap-2">
                {/* BOTÓN NUEVO: CREAR PEDIDO MANUAL */}
                <button 
                    onClick={() => {
                        setManualOrderForm({
                            ...manualOrderForm, 
                            clubId: selectedClubId, // Preseleccionar el club actual
                            targetBatch: selectedClub?.activeGlobalOrderId || ''
                        });
                        setManualOrderModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded shadow flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4"/> Nuevo Pedido Manual
                </button>

                {selectedClub && selectedClub.activeGlobalOrderId > 1 && (
                    <button 
                        onClick={() => setConfirmation({ title: "Revertir", msg: "¿Volver al lote anterior?", onConfirm: () => handleRevertGlobalBatch(selectedClubId) })}
                        className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 flex gap-1 rounded hover:bg-red-50 transition-colors"
                        title="Deshacer cierre de lote"
                    >
                        <RotateCcw className="w-3 h-3"/>
                    </button>
                )}
                <Button onClick={() => incrementClubGlobalOrder(selectedClubId)} className="bg-blue-600 text-white text-xs py-2 px-4 shadow-md hover:bg-blue-700">
                    <Archive className="w-4 h-4 mr-2"/> Cerrar Lote
                </Button>
            </div>
        </div>

        {/* B. LISTADO DE LOTES */}
        <div className="space-y-12">
            {accountingData.map(({ club, batches }) => (
                <div key={club.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    {/* Cabecera Club */}
                    <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">{club.code}</div>
                            <h4 className="font-bold text-lg">{club.name}</h4>
                        </div>
                        <span className="text-xs bg-gray-700 px-3 py-1 rounded-full text-gray-300">{batches.length} Lotes</span>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                        {batches.map(batch => {
                            const isStandard = typeof batch.id === 'number';
                            const isActive = isStandard && batch.id === club.activeGlobalOrderId;
                            const status = (!isStandard) ? 'special' : (batch.orders[0]?.status || 'recopilando');
                            const isProduction = ['en_produccion', 'entregado_club'].includes(status);
                            const batchTotal = batch.orders.reduce((sum, o) => sum + o.total, 0);

                            return (
                                <div key={batch.id} className={`p-4 transition-colors ${isActive ? 'bg-emerald-50/40' : 'bg-white'}`}>
                                    
                                    {/* 1. CABECERA DEL LOTE */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Título */}
                                            {isStandard ? (
                                                <span className="font-bold text-lg text-emerald-900">Pedido Global #{batch.id}</span>
                                            ) : (
                                                <span className="font-black text-lg text-gray-700 flex items-center gap-2">
                                                    {batch.id === 'SPECIAL' ? <Briefcase className="w-5 h-5 text-indigo-600"/> : <Package className="w-5 h-5 text-orange-600"/>}
                                                    {batch.id === 'SPECIAL' ? 'ESPECIALES' : 'INDIVIDUALES'}
                                                </span>
                                            )}

                                            {isActive && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold uppercase">Activo</span>}
                                            {isStandard && <Badge status={status} />}
                                            
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border">
                                                Total: {batchTotal.toFixed(2)}€
                                            </span>

                                            {/* --- GESTIÓN DE FECHA DE CIERRE (Con Lápiz) --- */}
                                            {isStandard && isActive && (
                                                <div className="ml-2">
                                                    {editingDate.clubId === club.id ? (
                                                        // MODO EDICIÓN
                                                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border-2 border-blue-400 shadow-md animate-fade-in scale-105 origin-left">
                                                            <div className="flex flex-col px-1">
                                                                <span className="text-[8px] font-bold text-blue-500 uppercase leading-none">Nueva Fecha</span>
                                                                <input 
                                                                    type="date" 
                                                                    className="text-xs font-bold border-none p-0 focus:ring-0 text-gray-800 bg-transparent h-5 w-24"
                                                                    value={editingDate.date}
                                                                    onChange={(e) => setEditingDate({...editingDate, date: e.target.value})}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div className="flex gap-1 border-l pl-1 border-gray-200">
                                                                <button 
                                                                    onClick={() => {
                                                                        if(!editingDate.date) return;
                                                                        setConfirmation({
                                                                            title: "📅 Confirmar Fecha",
                                                                            msg: `Vas a programar el cierre para el día:\n\n👉 ${new Date(editingDate.date).toLocaleDateString()}\n\n¿Guardar cambio?`,
                                                                            onConfirm: async () => {
                                                                                await updateDoc(doc(db, 'clubs', club.id), { nextBatchDate: editingDate.date });
                                                                                setEditingDate({ clubId: null, date: '' });
                                                                                showNotification('Fecha programada correctamente');
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-1.5 rounded transition-colors"
                                                                    title="Guardar"
                                                                >
                                                                    <Check className="w-3.5 h-3.5"/>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setEditingDate({ clubId: null, date: '' })}
                                                                    className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded transition-colors"
                                                                    title="Cancelar"
                                                                >
                                                                    <X className="w-3.5 h-3.5"/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // MODO VISUALIZACIÓN
                                                        <div className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${!club.nextBatchDate ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                                                            <Calendar className={`w-3.5 h-3.5 ${!club.nextBatchDate ? 'text-orange-500' : 'text-gray-400'}`}/>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-bold text-gray-400 uppercase leading-none">Cierre Previsto</span>
                                                                <span className={`text-xs font-bold ${!club.nextBatchDate ? 'text-orange-600' : 'text-gray-700'}`}>
                                                                    {club.nextBatchDate ? new Date(club.nextBatchDate).toLocaleDateString() : 'Sin Fecha'}
                                                                </span>
                                                            </div>
                                                            {!isProduction ? (
                                                                <button 
                                                                    onClick={() => setEditingDate({ clubId: club.id, date: club.nextBatchDate || '' })}
                                                                    className="ml-1 p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                    title="Editar fecha de cierre"
                                                                >
                                                                    <Edit3 className="w-3.5 h-3.5"/>
                                                                </button>
                                                            ) : (
                                                                <Lock className="w-3.5 h-3.5 text-gray-300 ml-1" title="Bloqueado: En producción"/>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* ACCIONES DEL LOTE */}
                                        <div className="flex items-center gap-2">
                                            <Button size="xs" variant="outline" onClick={() => generateBatchExcel(batch.id, batch.orders, club.name)} disabled={batch.orders.length===0}>
                                                <FileDown className="w-3 h-3 mr-1"/> Excel
                                            </Button>
                                            <Button size="xs" variant="outline" onClick={() => printBatchAlbaran(batch.id, batch.orders, club.name, financialConfig.clubCommissionPct)} disabled={batch.orders.length===0}>
                                                <Printer className="w-3 h-3 mr-1"/> Albarán
                                            </Button>

                                            {isStandard && (
                                                <div className="flex items-center gap-2 ml-2 border-l pl-2 border-gray-300">
                                                    <select 
                                                        value={status}
                                                        onChange={(e) => updateGlobalBatchStatus(club.id, batch.id, e.target.value)}
                                                        className={`text-xs border rounded py-1 px-2 font-bold cursor-pointer outline-none ${
                                                            status === 'en_produccion' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                            status === 'entregado_club' ? 'bg-green-100 text-green-700 border-green-200' :
                                                            'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                                        }`}
                                                    >
                                                        <option value="recopilando">Recopilando</option>
                                                        <option value="en_produccion">En Producción</option>
                                                        <option value="entregado_club">Entregado</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. LISTA DE PEDIDOS */}
                                    {batch.orders.length === 0 ? (
                                        <div className="pl-4 border-l-4 border-gray-200 py-4 text-gray-400 text-sm italic">
                                            Aún no hay pedidos en este lote.
                                        </div>
                                    ) : (
                                        <div className="pl-4 border-l-4 border-gray-200 space-y-2">
                                            {batch.orders.map(order => (
                                            <div key={order.id} className={`border rounded-lg bg-white shadow-sm overflow-hidden transition-all hover:border-emerald-300 group/order ${order.type === 'manual' ? 'border-l-4 border-l-orange-400' : ''}`}>
                                        
                                                    {/* CABECERA TARJETA */}
                                                    <div 
                                                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} 
                                                        className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 select-none"
                                                    >
                                                        <div className="flex gap-4 items-center">
                                                            {/* Etiquetas de Tipo */}
                                                            {order.type === 'special' ? (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">ESP</span>
                                                            ) : order.type === 'manual' ? (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                                                                    <Edit3 className="w-3 h-3"/> ANOTADO MANUALMENTE
                                                                </span>
                                                            ) : order.globalBatch === 'INDIVIDUAL' ? (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">IND</span>
                                                            ) : (
                                                                <span className="font-mono text-xs font-bold bg-gray-100 border px-1 rounded text-gray-600">#{order.id.slice(0,6)}</span>
                                                            )}
                                                            
                                                            <span className="font-bold text-sm text-gray-800">{order.customer.name}</span>
                                                            {!isStandard && <Badge status={order.status} />}
                                                        </div>
                                                        <div className="flex gap-4 items-center text-sm">
                                                            <span className="font-bold">{order.total.toFixed(2)}€</span>
                                                            <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-90' : ''}`}/>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* DETALLE EXPANDIDO */}
                                                    {expandedOrderId === order.id && (
                                                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-sm animate-fade-in-down">
                                                            
                                                            <h5 className="font-bold text-gray-500 mb-3 text-xs uppercase flex items-center gap-2"><Package className="w-3 h-3"/> Productos del Pedido</h5>
                                                            <div className="bg-white rounded border border-gray-200 divide-y divide-gray-100 mb-4">
                                                                {order.items.map(item => {
                                                                    const isIncident = order.incidents?.some(inc => inc.itemId === item.cartId && !inc.resolved);
                                                                    return (
                                                                        <div key={item.cartId || Math.random()} className="flex justify-between items-center p-3 hover:bg-gray-50">
                                                                            <div className="flex gap-3 items-center flex-1">
                                                                                {item.image ? <img src={item.image} className="w-10 h-10 object-cover rounded bg-gray-200 border" /> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300"><Package className="w-5 h-5"/></div>}
                                                                                <div>
                                                                                    <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                                                                                    {/* Muestra los detalles (Talla, Nombre, Dorsal) */}
                                                                                    <p className="text-xs text-gray-500">{renderProductDetails(item)}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-6 mr-4">
                                                                                <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Cant.</p><p className="font-medium text-sm">{item.quantity || 1}</p></div>
                                                                                <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Precio</p><p className="font-medium text-sm">{item.price.toFixed(2)}€</p></div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 border-l pl-3">
                                                                                {isIncident ? (
                                                                                    <span className="text-xs text-red-600 font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded"><AlertTriangle className="w-3 h-3"/> Reportado</span>
                                                                                ) : (
                                                                                    <button 
                                                                                        onClick={(e) => { e.stopPropagation(); handleOpenIncident(order, item); }} 
                                                                                        className="text-orange-600 bg-orange-50 hover:bg-orange-100 p-1.5 rounded-md text-xs border border-orange-200 flex items-center gap-1 transition-colors" 
                                                                                        title="Reportar Fallo / Incidencia"
                                                                                    >
                                                                                        <AlertTriangle className="w-3 h-3"/> Fallo
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            
                                                            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                                                                <button 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        const original = JSON.parse(JSON.stringify(order)); 
                                                                        const modified = JSON.parse(JSON.stringify(order)); 
                                                                        setEditOrderModal({ active: true, original, modified }); 
                                                                    }} 
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                                                                >
                                                                    <Edit3 className="w-3 h-3"/> Modificar Datos
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} 
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                                                                >
                                                                    <Trash2 className="w-3 h-3"/> Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

        {/* --- C. MODAL DE CREACIÓN DE PEDIDO MANUAL (ACTUALIZADO) --- */}
        {manualOrderModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Cabecera */}
                    <div className="bg-gray-800 p-5 flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <Plus className="w-6 h-6 text-emerald-400"/>
                            <div>
                                <h3 className="text-lg font-bold">Nuevo Pedido Manual</h3>
                                <p className="text-xs text-gray-400">El precio respetará la configuración del producto</p>
                            </div>
                        </div>
                        <button onClick={() => setManualOrderModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>

                    {/* Cuerpo Scrollable */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        
                        {/* 1. Datos Generales (Igual que antes) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Club</label>
                                <select 
                                    className="w-full border rounded p-2 mt-1"
                                    value={manualOrderForm.clubId}
                                    onChange={(e) => {
                                        const c = clubs.find(cl => cl.id === e.target.value);
                                        setManualOrderForm({...manualOrderForm, clubId: e.target.value, targetBatch: c?.activeGlobalOrderId});
                                    }}
                                >
                                    <option value="">Selecciona Club...</option>
                                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Lote Destino</label>
                                <input 
                                    type="number" 
                                    className="w-full border rounded p-2 mt-1"
                                    value={manualOrderForm.targetBatch}
                                    onChange={e => setManualOrderForm({...manualOrderForm, targetBatch: e.target.value})}
                                    placeholder="Ej. 1"
                                />
                            </div>
                        </div>

                        {/* 2. Cliente y Pago (Igual que antes) */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b border-gray-200 pb-2">Datos Cliente</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input placeholder="Nombre Completo" className="border rounded p-2 text-sm" value={manualOrderForm.customerName} onChange={e => setManualOrderForm({...manualOrderForm, customerName: e.target.value})} />
                                <input placeholder="Email (Opcional)" className="border rounded p-2 text-sm" value={manualOrderForm.customerEmail} onChange={e => setManualOrderForm({...manualOrderForm, customerEmail: e.target.value})} />
                                <input placeholder="Teléfono" className="border rounded p-2 text-sm" value={manualOrderForm.customerPhone} onChange={e => setManualOrderForm({...manualOrderForm, customerPhone: e.target.value})} />
                                
                                <select 
                                    className="border rounded p-2 text-sm font-bold text-gray-700" 
                                    value={manualOrderForm.paymentMethod} 
                                    onChange={e => setManualOrderForm({...manualOrderForm, paymentMethod: e.target.value})}
                                >
                                    <option value="transfer">Transferencia</option>
                                    <option value="bizum">Bizum</option>
                                    <option value="cash">Efectivo</option>
                                </select>
                            </div>
                        </div>

                        {/* 3. Productos (Carrito Manual Inteligente) */}
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                            <h4 className="text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4"/> Productos</h4>
                            
                            <div className="flex flex-wrap items-end gap-2 mb-4 bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                                
                                {/* 1. SELECTOR DE PRODUCTO (Inicializa estados) */}
                                <div className="flex-1 min-w-[150px]">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Producto</label>
                                    <select 
                                        className="w-full border rounded p-1.5 text-sm font-bold"
                                        value={manualOrderForm.tempItem.productId}
                                        onChange={(e) => {
                                            const p = products.find(prod => prod.id === e.target.value);
                                            if(p) {
                                                // Cargar configuración por defecto
                                                const defs = p.defaults || { name: false, number: false, size: true, shield: true };
                                                
                                                setManualOrderForm({
                                                    ...manualOrderForm, 
                                                    tempItem: { 
                                                        ...manualOrderForm.tempItem, 
                                                        productId: p.id, 
                                                        name: '', number: '', size: '', quantity: 1,
                                                        // Inicializar checkboxes igual que el producto
                                                        activeName: defs.name, 
                                                        activeNumber: defs.number,
                                                        activeSize: defs.size !== undefined ? defs.size : true, // Talla por defecto true si no existe
                                                        activeShield: defs.shield !== undefined ? defs.shield : true
                                                    }
                                                });
                                            }
                                        }}
                                    >
                                        <option value="">Elegir...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                {/* 2. INPUTS DINÁMICOS */}
                                {(() => {
                                    const selectedProd = products.find(p => p.id === manualOrderForm.tempItem.productId);
                                    if (!selectedProd) return null;

                                    const features = selectedProd.features || { name: true, number: true, size: true, shield: true };
                                    const defaults = selectedProd.defaults || { name: false, number: false, size: true, shield: true };
                                    const modifiable = selectedProd.modifiable || { name: true, number: true, size: true, shield: true };
                                    const fee = financialConfig.modificationFee || 0;
                                    const prodSizes = selectedProd.sizes || []; // Array de tallas

                                    // Calcular precio visual
                                    let currentPrice = selectedProd.price;
                                    if (modifiable.size && (manualOrderForm.tempItem.activeSize !== defaults.size)) currentPrice += fee;
                                    if (modifiable.name && (manualOrderForm.tempItem.activeName !== defaults.name)) currentPrice += fee;
                                    if (modifiable.number && (manualOrderForm.tempItem.activeNumber !== defaults.number)) currentPrice += fee;
                                    if (modifiable.shield && (manualOrderForm.tempItem.activeShield !== defaults.shield)) currentPrice += fee;

                                    return (
                                        <>
                                            <div className="w-16">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Cant.</label>
                                                <input type="number" min="1" className="w-full border rounded p-1.5 text-sm" value={manualOrderForm.tempItem.quantity} onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, quantity: e.target.value}})} />
                                            </div>

                                            {/* --- TALLA --- */}
                                            {features.size && (
                                                <div className="w-28">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={manualOrderForm.tempItem.activeSize || false}
                                                            onChange={(e) => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, activeSize: e.target.checked}})}
                                                            disabled={!modifiable.size}
                                                            className="rounded text-emerald-600 cursor-pointer"
                                                        />
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                                                            Talla
                                                            {modifiable.size && manualOrderForm.tempItem.activeSize !== defaults.size && (
                                                                <span className="ml-1 text-orange-500">{defaults.size ? `(-${fee}€)` : `(+${fee}€)`}</span>
                                                            )}
                                                        </label>
                                                    </div>
                                                    
                                                    {prodSizes.length > 0 ? (
                                                        <select 
                                                            className={`w-full border rounded p-1.5 text-sm ${!manualOrderForm.tempItem.activeSize ? 'bg-gray-100 text-gray-400' : ''}`}
                                                            value={manualOrderForm.tempItem.size} 
                                                            onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, size: e.target.value}})}
                                                            disabled={!manualOrderForm.tempItem.activeSize}
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            {prodSizes.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input 
                                                            className={`w-full border rounded p-1.5 text-sm ${!manualOrderForm.tempItem.activeSize ? 'bg-gray-100 text-gray-400' : ''}`}
                                                            placeholder="Talla" 
                                                            value={manualOrderForm.tempItem.size} 
                                                            onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, size: e.target.value}})} 
                                                            disabled={!manualOrderForm.tempItem.activeSize}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* --- NOMBRE --- */}
                                            {features.name && (
                                                <div className="flex-1 min-w-[100px]">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={manualOrderForm.tempItem.activeName || false}
                                                            onChange={(e) => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, activeName: e.target.checked}})}
                                                            disabled={!modifiable.name} 
                                                            className="rounded text-emerald-600 cursor-pointer"
                                                        />
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                                                            Nombre
                                                            {modifiable.name && manualOrderForm.tempItem.activeName !== defaults.name && (
                                                                <span className="ml-1 text-orange-500">{defaults.name ? `(-${fee}€)` : `(+${fee}€)`}</span>
                                                            )}
                                                        </label>
                                                    </div>
                                                    <input 
                                                        className={`w-full border rounded p-1.5 text-sm transition-colors ${!manualOrderForm.tempItem.activeName ? 'bg-gray-100 text-gray-400' : ''}`} 
                                                        placeholder={defaults.name ? "Nombre" : "Nombre"} 
                                                        value={manualOrderForm.tempItem.name} 
                                                        onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, name: e.target.value}})}
                                                        disabled={!manualOrderForm.tempItem.activeName} 
                                                    />
                                                </div>
                                            )}

                                            {/* --- DORSAL --- */}
                                            {features.number && (
                                                <div className="w-20">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={manualOrderForm.tempItem.activeNumber || false}
                                                            onChange={(e) => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, activeNumber: e.target.checked}})}
                                                            disabled={!modifiable.number}
                                                            className="rounded text-emerald-600 cursor-pointer"
                                                        />
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">
                                                            Dorsal
                                                            {modifiable.number && manualOrderForm.tempItem.activeNumber !== defaults.number && (
                                                                <span className="ml-1 text-orange-500">{defaults.number ? `(-${fee}€)` : `(+${fee}€)`}</span>
                                                            )}
                                                        </label>
                                                    </div>
                                                    <input 
                                                        className={`w-full border rounded p-1.5 text-sm transition-colors ${!manualOrderForm.tempItem.activeNumber ? 'bg-gray-100 text-gray-400' : ''}`} 
                                                        placeholder="#" 
                                                        value={manualOrderForm.tempItem.number} 
                                                        onChange={e => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, number: e.target.value}})} 
                                                        disabled={!manualOrderForm.tempItem.activeNumber}
                                                    />
                                                </div>
                                            )}

                                            {/* --- ESCUDO (CHECKBOX) --- */}
                                            {features.shield && (
                                                <div className="w-16 flex flex-col items-center">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2">Escudo</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={manualOrderForm.tempItem.activeShield || false}
                                                            onChange={(e) => setManualOrderForm({...manualOrderForm, tempItem: {...manualOrderForm.tempItem, activeShield: e.target.checked}})}
                                                            disabled={!modifiable.shield}
                                                            className="w-6 h-6 rounded text-emerald-600 cursor-pointer focus:ring-emerald-500"
                                                        />
                                                        {modifiable.shield && manualOrderForm.tempItem.activeShield !== defaults.shield && (
                                                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-orange-500 whitespace-nowrap">
                                                                {defaults.shield ? `-${fee}€` : `+${fee}€`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* PRECIO Y BOTÓN */}
                                            <div className="w-20">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Precio/Ud</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        readOnly 
                                                        className="w-full border rounded p-1.5 text-sm bg-gray-100 text-gray-600 font-bold cursor-not-allowed" 
                                                        value={currentPrice.toFixed(2)} 
                                                    />
                                                    <span className="absolute right-1 top-1.5 text-xs text-gray-400">€</span>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}

                                <button onClick={addManualItemToOrder} className="bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700 shadow-sm"><Plus className="w-4 h-4"/></button>
                            </div>

                            {/* Lista Items (Igual que antes) */}
                            {manualOrderForm.items.length > 0 && (
                                <div className="space-y-1">
                                    {manualOrderForm.items.map((it, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100 text-sm">
                                            <div className="flex gap-2">
                                                <span className="font-bold text-emerald-700">{it.quantity}x</span>
                                                <span className="font-bold">{it.name}</span>
                                                <span className="text-gray-500 text-xs flex items-center gap-1">
                                                    [{it.size}] 
                                                    {it.personalization.name && <span className="bg-gray-100 px-1 rounded">N: {it.personalization.name}</span>}
                                                    {it.personalization.number && <span className="bg-gray-100 px-1 rounded">#: {it.personalization.number}</span>}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-800">{it.price.toFixed(2)}€/ud</span>
                                                <button onClick={() => {
                                                    const newItems = [...manualOrderForm.items];
                                                    newItems.splice(idx, 1);
                                                    setManualOrderForm({...manualOrderForm, items: newItems});
                                                }} className="text-red-400 hover:text-red-600"><X className="w-3 h-3"/></button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="text-right font-black text-emerald-800 mt-3 text-lg border-t pt-2">
                                        Total Pedido: {manualOrderForm.items.reduce((acc, i) => acc + (i.price*i.quantity), 0).toFixed(2)}€
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Botones */}
                    <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                        <button onClick={() => setManualOrderModal(false)} className="px-4 py-2 text-gray-500 hover:text-gray-800 font-bold text-sm">Cancelar</button>
                        <button onClick={submitManualOrder} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold shadow-lg hover:bg-black transition-transform active:scale-95 flex items-center gap-2">
                            <Check className="w-4 h-4"/> Confirmar Pedido
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
)}

{/* --- PESTAÑA DE CONTABILIDAD (VERSIÓN V5 - CON PEDIDOS ESPECIALES SEPARADOS) --- */}
      {tab === 'accounting-control' && (
          <div className="bg-white p-6 rounded-xl shadow space-y-8 animate-fade-in-up">
              <div className="flex justify-between items-center border-b pb-4">
                  <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                          <Banknote className="w-8 h-8 text-emerald-600"/> 
                          Control de Contabilidad
                      </h2>
                      <p className="text-gray-500">Gestión de caja, pedidos especiales y lotes globales.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                      <Calendar className="w-4 h-4 text-gray-500"/>
                      <select 
                          className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm" 
                          value={financeSeasonId} 
                          onChange={(e) => setFinanceSeasonId(e.target.value)}
                      >
                          <option value="all">Todas las Temporadas</option>
                          {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                  </div>
              </div>

              {/* --- PEGAR ESTO JUSTO ANTES DE {accountingData.map... --- */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                  {/* Tarjeta 1: Ingresos Tarjeta */}
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Tarjeta (Bruto)</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{globalAccountingStats.cardTotal.toFixed(2)}€</p>
                    
                    {/* NUEVO DESGLOSE */}
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Comisión Pasarela:</span>
                            <span className="text-red-500 font-bold">-{globalAccountingStats.cardFees.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-blue-800">
                            <span>Neto Real:</span>
                            <span>{(globalAccountingStats.cardTotal - globalAccountingStats.cardFees).toFixed(2)}€</span>
                        </div>
                    </div>
                  </div>

                  {/* Tarjeta 2: Efectivo */}
                  <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase">Caja Efectivo</p>
                      <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-sm cursor-pointer hover:bg-gray-50 p-1 rounded" 
                               onClick={() => setAccDetailsModal({ active: true, title: 'Efectivo YA Recogido', items: globalAccountingStats.cash.listCollected, type: 'success' })}>
                              <span className="text-gray-600">Recogido:</span>
                              <span className="font-bold text-green-600">{globalAccountingStats.cash.collected.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center text-sm cursor-pointer bg-red-50 p-1 rounded hover:bg-red-100 transition-colors"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Efectivo PENDIENTE de Recoger', items: globalAccountingStats.cash.listPending, type: 'error' })}>
                              <span className="text-red-800 font-bold">Pendiente:</span>
                              <span className="font-black text-red-600">{globalAccountingStats.cash.pending.toFixed(2)}€</span>
                          </div>
                      </div>
                  </div>

                  {/* Tarjeta 3: Proveedor */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase">Pagos Proveedor</p>
                      <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Proveedor PAGADO', items: globalAccountingStats.supplier.listPaid, type: 'success' })}>
                              <span className="text-gray-600">Pagado:</span>
                              <span className="font-bold text-green-600">{globalAccountingStats.supplier.paid.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center text-sm cursor-pointer bg-orange-50 p-1 rounded hover:bg-orange-100 transition-colors"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Proveedor PENDIENTE', items: globalAccountingStats.supplier.listPending, type: 'warning' })}>
                              <span className="text-orange-800 font-bold">Deuda:</span>
                              <span className="font-black text-orange-600">{globalAccountingStats.supplier.pending.toFixed(2)}€</span>
                          </div>
                      </div>
                  </div>

                  {/* Tarjeta 4: Comercial */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase">Com. Comercial</p>
                      <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Comercial PAGADO', items: globalAccountingStats.commercial.listPaid, type: 'success' })}>
                              <span className="text-gray-600">Pagado:</span>
                              <span className="font-bold text-green-600">{globalAccountingStats.commercial.paid.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center text-sm cursor-pointer bg-blue-50 p-1 rounded hover:bg-blue-100 transition-colors"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Comercial PENDIENTE', items: globalAccountingStats.commercial.listPending, type: 'info' })}>
                              <span className="text-blue-800 font-bold">Deuda:</span>
                              <span className="font-black text-blue-600">{globalAccountingStats.commercial.pending.toFixed(2)}€</span>
                          </div>
                      </div>
                  </div>

                  {/* Tarjeta 5: Club */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase">Pagos a Clubes</p>
                      <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Club PAGADO', items: globalAccountingStats.club.listPaid, type: 'success' })}>
                              <span className="text-gray-600">Pagado:</span>
                              <span className="font-bold text-green-600">{globalAccountingStats.club.paid.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center text-sm cursor-pointer bg-purple-50 p-1 rounded hover:bg-purple-100 transition-colors"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Club PENDIENTE', items: globalAccountingStats.club.listPending, type: 'purple' })}>
                              <span className="text-purple-800 font-bold">Deuda:</span>
                              <span className="font-black text-purple-600">{globalAccountingStats.club.pending.toFixed(2)}€</span>
                          </div>
                      </div>
                  </div>
              </div>

              {accountingData.map(({ club, batches }) => {
                  // --- CÁLCULOS DE ESTADO DE CUENTA ---
                  let totalPendingCash = 0;
                  let balanceProvider = 0;   
                  let balanceCommercial = 0; 
                  let balanceClub = 0;       

                  batches.forEach(batch => {
                      const log = club.accountingLog?.[batch.id] || {};
                      
                      const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
                      const cashTotal = cashOrders.reduce((sum, o) => sum + o.total, 0);
                      const bTotal = batch.orders.reduce((sum, o) => sum + o.total, 0);
                      
                      const bCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                      const bCommComm = bTotal * financialConfig.commercialCommissionPct;
                      const bCommClub = bTotal * financialConfig.clubCommissionPct;

                      totalPendingCash += (!log.cashCollected ? cashTotal : 0) + (log.cashUnder || 0) - (log.cashOver || 0);
                      balanceProvider += (!log.supplierPaid ? bCost : 0) + (log.supplierUnder || 0) - (log.supplierOver || 0);
                      balanceCommercial += (!log.commercialPaid ? bCommComm : 0) + (log.commercialUnder || 0) - (log.commercialOver || 0);
                      balanceClub += (!log.clubPaid ? bCommClub : 0) + (log.clubUnder || 0) - (log.clubOver || 0);
                  });

                  const renderBalance = (amount, labelPositive, labelNegative) => {
                      // CAMBIO: Añadido isNaN(amount) para evitar el error "NaN€"
                      if (isNaN(amount) || Math.abs(amount) < 0.01) return <span className="text-green-600 font-bold">Al día (0.00€)</span>;
                      
                      if (amount > 0) return <span className="text-red-600 font-bold">{labelPositive} {amount.toFixed(2)}€</span>; 
                      return <span className="text-blue-600 font-bold">{labelNegative} {Math.abs(amount).toFixed(2)}€</span>; 
                  };

                  return (
                      <div key={club.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-8">
                          {/* CABECERA CLUB */}
                          <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                                      {club.code?.slice(0,2)}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-lg">{club.name}</h3>
                                      <p className="text-xs text-gray-400">{batches.length} Bloques de Pedidos</p>
                                  </div>
                              </div>
                          </div>

                          {/* PANEL DE ESTADO */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200 border-b border-gray-200">
                              <div className="bg-white p-4 text-center">
                                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Caja Efectivo</p>
                                  <p className="text-xl">{renderBalance(totalPendingCash, 'Faltan', 'Sobra')}</p>
                              </div>
                              <div className="bg-white p-4 text-center border-l border-gray-100">
                                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Proveedor</p>
                                  <p className="text-xl">{renderBalance(balanceProvider, 'Debemos', 'A favor')}</p>
                              </div>
                              <div className="bg-white p-4 text-center border-l border-gray-100">
                                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Comercial</p>
                                  <p className="text-xl">{renderBalance(balanceCommercial, 'Debemos', 'A favor')}</p>
                              </div>
                              <div className="bg-white p-4 text-center border-l border-gray-100">
                                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Saldo Club</p>
                                  <p className="text-xl">{renderBalance(balanceClub, 'Debemos', 'A favor')}</p>
                              </div>
                          </div>

                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold">
                                      <tr>
                                          <th className="px-4 py-3 min-w-[120px]">Bloque / Lote</th>
                                          <th className="px-4 py-3 text-right bg-blue-50/30">Tarjeta</th>
                                          <th className="px-4 py-3 text-right bg-orange-50/30">Efectivo</th>
                                          <th className="px-4 py-3 text-center bg-orange-50/30 min-w-[160px]">Control Caja</th>
                                          <th className="px-4 py-3 min-w-[160px]">Pago Proveedor</th>
                                          <th className="px-4 py-3 min-w-[160px]">Pago Comercial</th>
                                          <th className="px-4 py-3 min-w-[160px]">Pago Club</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                      {batches.map(batch => {
                                          // DETECTAR SI ES ESPECIAL
                                          const isSpecial = batch.id === 'SPECIAL';
                                          
                                          const cardOrders = batch.orders.filter(o => o.paymentMethod !== 'cash');
                                          const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
                                          
                                          const cardTotal = cardOrders.reduce((sum, o) => sum + o.total, 0);
                                          const cashTotal = cashOrders.reduce((sum, o) => sum + o.total, 0);
                                          const bTotal = cardTotal + cashTotal;

                                          const bCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                                          const bCommComm = bTotal * financialConfig.commercialCommissionPct;
                                          const bCommClub = bTotal * financialConfig.clubCommissionPct;

                                          const status = club.accountingLog?.[batch.id] || {};

                                          const AdjustmentInputs = ({ fieldOver, fieldUnder }) => (
                                              <div className="flex gap-2 mt-2">
                                                  <div className="flex-1"><label className="text-[9px] text-gray-400 block mb-0.5">De más</label><input type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status[fieldOver] || ''} onChange={(e) => updateBatchValue(club, batch.id, fieldOver, e.target.value)}/></div>
                                                  <div className="flex-1"><label className="text-[9px] text-gray-400 block mb-0.5">De menos</label><input type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status[fieldUnder] || ''} onChange={(e) => updateBatchValue(club, batch.id, fieldUnder, e.target.value)}/></div>
                                              </div>
                                          );

                                          return (
                                              <tr key={batch.id} className={`align-top hover:bg-gray-50 transition-colors ${isSpecial ? 'bg-indigo-50/40' : ''}`}>
                                                  <td className="px-4 py-4">
                                                      {isSpecial ? (
                                                          <div className="inline-block">
                                                              <span className="font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-md text-xs uppercase tracking-wide shadow-sm flex items-center gap-1">
                                                                  <Briefcase className="w-3 h-3"/> Especiales
                                                              </span>
                                                          </div>
                                                      ) : (
                                                          <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">Lote Global #{batch.id}</span>
                                                      )}
                                                      <div className="text-[10px] text-gray-400 mt-2">{batch.orders.length} pedidos</div>
                                                  </td>
                                                  
                                                  <td className="px-4 py-4 text-right bg-blue-50/30"><span className="font-mono font-bold text-blue-700">{cardTotal.toFixed(2)}€</span></td>
                                                  <td className="px-4 py-4 text-right bg-orange-50/30"><span className="font-mono font-bold text-orange-700">{cashTotal.toFixed(2)}€</span></td>
                                                  
                                                  <td className="px-4 py-4 bg-orange-50/30">
                                                      {cashTotal > 0 ? (
                                                          <button onClick={() => toggleBatchPaymentStatus(club, batch.id, 'cashCollected')} className={`w-full px-2 py-1.5 rounded text-[10px] font-bold border shadow-sm transition-all mb-1 ${status.cashCollected ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' : 'bg-white text-orange-600 border-orange-200 hover:border-orange-400 animate-pulse'}`}>
                                                              {status.cashCollected ? 'RECOGIDO' : 'PENDIENTE'}
                                                          </button>
                                                      ) : <div className="text-center text-xs text-gray-300 py-1">-</div>}
                                                      <AdjustmentInputs fieldOver="cashOver" fieldUnder="cashUnder" />
                                                  </td>

                                                  {/* ... celdas anteriores ... */}

                                          <td className="px-4 py-4">
                                              {/* CORREGIDO: (bCost || 0) para evitar NaN */}
                                              <div className="flex justify-between items-center mb-1">
                                                  <span className="text-xs text-red-500 font-bold">
                                                      -{(bCost || 0).toFixed(2)}€
                                                  </span>
                                                  <button onClick={() => toggleBatchPaymentStatus(club, batch.id, 'supplierPaid')} className={`text-[10px] px-2 py-0.5 rounded border ${status.supplierPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                                      {status.supplierPaid ? 'PAGADO' : 'PENDIENTE'}
                                                  </button>
                                              </div>
                                              <AdjustmentInputs fieldOver="supplierOver" fieldUnder="supplierUnder" />
                                          </td>

                                          <td className="px-4 py-4">
                                              {/* CORREGIDO: (bCommComm || 0) para evitar NaN */}
                                              <div className="flex justify-between items-center mb-1">
                                                  <span className="text-xs text-blue-500 font-bold">
                                                      -{(bCommComm || 0).toFixed(2)}€
                                                  </span>
                                                  <button onClick={() => toggleBatchPaymentStatus(club, batch.id, 'commercialPaid')} className={`text-[10px] px-2 py-0.5 rounded border ${status.commercialPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                                      {status.commercialPaid ? 'PAGADO' : 'PENDIENTE'}
                                                  </button>
                                              </div>
                                              <AdjustmentInputs fieldOver="commercialOver" fieldUnder="commercialUnder" />
                                          </td>

                                          <td className="px-4 py-4">
                                              {/* CORREGIDO: (bCommClub || 0) para evitar NaN */}
                                              <div className="flex justify-between items-center mb-1">
                                                  <span className="text-xs text-purple-500 font-bold">
                                                      -{(bCommClub || 0).toFixed(2)}€
                                                  </span>
                                                  <button onClick={() => toggleBatchPaymentStatus(club, batch.id, 'clubPaid')} className={`text-[10px] px-2 py-0.5 rounded border ${status.clubPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                                      {status.clubPaid ? 'PAGADO' : 'PENDIENTE'}
                                                  </button>
                                              </div>
                                              <AdjustmentInputs fieldOver="clubOver" fieldUnder="clubUnder" />
                                          </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  );
              })}
              {/* --- PEGAR ESTO DESPUÉS DE QUE TERMINE EL MAPEO DE CLUBES --- */}
              
              {accDetailsModal.active && (
                  <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                          <div className={`px-6 py-4 border-b flex justify-between items-center ${
                              accDetailsModal.type === 'error' ? 'bg-red-50 border-red-100' :
                              accDetailsModal.type === 'success' ? 'bg-green-50 border-green-100' :
                              accDetailsModal.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                              'bg-blue-50 border-blue-100'
                          }`}>
                              <h3 className="font-bold text-lg text-gray-800">{accDetailsModal.title}</h3>
                              <button onClick={() => setAccDetailsModal({ ...accDetailsModal, active: false })}><X className="w-5 h-5 text-gray-500"/></button>
                          </div>
                          
                          <div className="p-0 max-h-[60vh] overflow-y-auto">
                              {accDetailsModal.items.length === 0 ? (
                                  <div className="p-8 text-center text-gray-400">No hay registros.</div>
                              ) : (
                                  <table className="w-full text-sm">
                                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold sticky top-0">
                                          <tr>
                                              <th className="px-4 py-3 text-left">Club</th>
                                              <th className="px-4 py-3 text-center">Lote</th>
                                              <th className="px-4 py-3 text-right">Importe</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {accDetailsModal.items.map((item, idx) => (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                  <td className="px-4 py-3 font-medium text-gray-700">{item.club}</td>
                                                  <td className="px-4 py-3 text-center">
                                                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">
                                                          #{item.batch}
                                                      </span>
                                                  </td>
                                                  <td className="px-4 py-3 text-right font-mono font-bold">
                                                      {item.amount.toFixed(2)}€
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                      <tfoot className="bg-gray-50 font-bold border-t">
                                          <tr>
                                              <td className="px-4 py-3" colSpan="2">TOTAL</td>
                                              <td className="px-4 py-3 text-right">
                                                  {accDetailsModal.items.reduce((acc, i) => acc + i.amount, 0).toFixed(2)}€
                                              </td>
                                          </tr>
                                      </tfoot>
                                  </table>
                              )}
                          </div>
                          
                          <div className="p-4 border-t bg-gray-50 flex justify-end">
                              <Button variant="secondary" onClick={() => setAccDetailsModal({ ...accDetailsModal, active: false })}>Cerrar</Button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- PESTAÑAS RESTANTES (Special, Seasons, Files, Finances) --- */}
      {tab === 'special-orders' && (
          <div className="bg-white p-6 rounded-xl shadow max-w-4xl mx-auto">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-indigo-700"><Briefcase className="w-5 h-5"/> Registro de Pedidos Especiales</h3>
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-8">
                  <p className="text-sm text-indigo-800 mb-6">Herramienta para registrar servicios adicionales o ventas directas fuera del catálogo estándar.</p>
                  <form onSubmit={handleCreateSpecialOrder} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Club</label><select required className="w-full border rounded p-2.5 text-sm bg-white" value={newSpecialOrder.clubId} onChange={e => setNewSpecialOrder({...newSpecialOrder, clubId: e.target.value})}><option value="">-- Seleccionar Club --</option>{clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                          <div><label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Método de Pago</label><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => setNewSpecialOrder({...newSpecialOrder, paymentMethod: 'invoice'})} className={`flex flex-col items-center justify-center p-2 rounded border text-xs ${newSpecialOrder.paymentMethod === 'invoice' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><FileText className="w-4 h-4 mb-1"/> Factura</button><button type="button" onClick={() => setNewSpecialOrder({...newSpecialOrder, paymentMethod: 'cash'})} className={`flex flex-col items-center justify-center p-2 rounded border text-xs ${newSpecialOrder.paymentMethod === 'cash' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Banknote className="w-4 h-4 mb-1"/> Efectivo</button><button type="button" onClick={() => setNewSpecialOrder({...newSpecialOrder, paymentMethod: 'transfer'})} className={`flex flex-col items-center justify-center p-2 rounded border text-xs ${newSpecialOrder.paymentMethod === 'transfer' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Landmark className="w-4 h-4 mb-1"/> Transf.</button></div></div>
                      </div>
                      <div><div className="flex justify-between items-center mb-2"><label className="block text-xs font-bold text-gray-600 uppercase">Conceptos</label><button type="button" onClick={handleAddSpecialItem} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"><Plus className="w-3 h-3"/> Añadir Línea</button></div><div className="space-y-2">{newSpecialOrder.items.map((item, index) => (<div key={index} className="flex gap-2 items-start"><div className="flex-1"><input required placeholder="Descripción" className="w-full border rounded p-2 text-sm" value={item.description} onChange={e => updateSpecialItem(index, 'description', e.target.value)} /></div><div className="w-20"><input type="number" min="1" placeholder="Cant." className="w-full border rounded p-2 text-sm text-center" value={item.quantity} onChange={e => updateSpecialItem(index, 'quantity', e.target.value)} /></div><div className="w-24 relative"><input type="number" step="0.01" placeholder="PVP" className="w-full border rounded p-2 text-sm text-right pr-6" value={item.price} onChange={e => updateSpecialItem(index, 'price', e.target.value)} /><span className="absolute right-2 top-2 text-gray-400 text-xs">€</span></div><div className="w-24 relative"><input type="number" step="0.01" placeholder="Coste" className="w-full border rounded p-2 text-sm text-right pr-6 bg-gray-50 text-gray-500" value={item.cost} onChange={e => updateSpecialItem(index, 'cost', e.target.value)} /><span className="absolute right-2 top-2 text-gray-400 text-xs">€</span></div>{newSpecialOrder.items.length > 1 && (<button type="button" onClick={() => handleRemoveSpecialItem(index)} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>)}</div>))}</div></div>
                      <div className="bg-white p-4 rounded border border-indigo-100 flex justify-end gap-8"><div className="text-right"><p className="text-xs text-gray-500 uppercase">Coste Total</p><p className="text-lg font-mono text-gray-400">{calculateSpecialTotals().totalCost.toFixed(2)}€</p></div><div className="text-right"><p className="text-xs text-indigo-600 font-bold uppercase">Total a Cobrar</p><p className="text-2xl font-bold text-indigo-900">{calculateSpecialTotals().total.toFixed(2)}€</p></div></div>
                      <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 shadow-lg shadow-indigo-200">Registrar Pedido Especial</Button>
                  </form>
              </div>
              <div><h4 className="font-bold text-gray-700 mb-4">Últimos Pedidos Especiales</h4><div className="space-y-2">{financialOrders.filter(o => o.type === 'special').map(order => (<div key={order.id} className="border p-4 rounded-lg flex justify-between items-center bg-gray-50 hover:bg-white transition-colors"><div><p className="font-bold text-indigo-900">{order.items.length > 1 ? `${order.items.length} Artículos` : order.items[0]?.name}</p><p className="text-xs text-gray-500 flex gap-2"><span>{order.clubName}</span><span>•</span><span>{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</span></p></div><div className="text-right"><span className="block font-bold text-lg">{order.total}€</span></div></div>))}</div></div>
          </div>
      )}

      {tab === 'seasons' && (
          <div className="max-w-4xl mx-auto animate-fade-in-up space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                      <div>
                          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                              <Layers className="w-6 h-6 text-indigo-600"/> 
                              Gestión de Temporadas
                          </h2>
                          <p className="text-gray-500 text-sm">Control de visibilidad, reportes y datos históricos.</p>
                      </div>
                      
                      {/* Formulario rápido creación */}
                      <div className="flex gap-2 items-end bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <div>
                              <label className="text-[10px] uppercase font-bold text-gray-400 block ml-1">Nombre</label>
                              <input id="newSName" placeholder="Ej. 24/25" className="border rounded px-2 py-1 text-sm w-24" />
                          </div>
                          <div>
                              <label className="text-[10px] uppercase font-bold text-gray-400 block ml-1">Inicio</label>
                              <input id="newSStart" type="date" className="border rounded px-2 py-1 text-sm w-32" />
                          </div>
                          <div>
                              <label className="text-[10px] uppercase font-bold text-gray-400 block ml-1">Fin</label>
                              <input id="newSEnd" type="date" className="border rounded px-2 py-1 text-sm w-32" />
                          </div>
                          <button 
                              onClick={() => {
                                  const name = document.getElementById('newSName').value;
                                  const start = document.getElementById('newSStart').value;
                                  const end = document.getElementById('newSEnd').value;
                                  if(name && start && end) {
                                      addSeason({name, startDate: start, endDate: end});
                                      document.getElementById('newSName').value = '';
                                  } else {
                                      alert('Rellena todos los campos');
                                  }
                              }} 
                              className="bg-indigo-600 text-white p-1.5 rounded hover:bg-indigo-700 h-[30px] w-[30px] flex items-center justify-center"
                          >
                              <Plus className="w-4 h-4"/>
                          </button>
                      </div>
                  </div>

                  <div className="space-y-3">
                      {seasons.map(season => (
                          <div key={season.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${season.hiddenForClubs ? 'bg-gray-50 border-gray-200' : 'bg-white border-indigo-100 shadow-sm hover:border-indigo-200'}`}>
                              
                              {/* Info Temporada */}
                              <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                      <span className={`font-bold text-lg ${season.hiddenForClubs ? 'text-gray-500' : 'text-gray-800'}`}>
                                          {season.name}
                                      </span>
                                      {season.hiddenForClubs ? (
                                          <span className="flex items-center gap-1 text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                                              <EyeOff className="w-3 h-3"/> Oculta
                                          </span>
                                      ) : (
                                          <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                                              <Eye className="w-3 h-3"/> Visible
                                          </span>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                      <Calendar className="w-3 h-3"/>
                                      {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                                  </div>
                              </div>

                              {/* ACCIONES (Barra de herramientas completa) */}
                              <div className="flex items-center gap-2">
                                  
                                  {/* 1. VISIBILIDAD */}
                                  <button 
                                      onClick={() => toggleSeasonVisibility(season.id)}
                                      className={`p-2 rounded-lg transition-colors ${season.hiddenForClubs ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                      title={season.hiddenForClubs ? "Mostrar a Clubes" : "Ocultar a Clubes"}
                                  >
                                      {season.hiddenForClubs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>

                                  <div className="w-px h-6 bg-gray-200 mx-1"></div>

                                  {/* 2. EXPORTAR EXCEL */}
                                  <button 
                                      onClick={() => setConfirmation({
                                          title: "Descargar Reporte",
                                          msg: `¿Generar Excel completo de la temporada ${season.name}?`,
                                          onConfirm: () => handleExportSeasonExcel(season.id)
                                      })}
                                      className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                      title="Descargar Excel de Pedidos"
                                  >
                                      <FileSpreadsheet className="w-4 h-4" />
                                  </button>

                                  {/* 3. LIMPIAR DATOS (PEDIDOS) */}
                                  <button 
                                      onClick={() => handleDeleteSeasonData(season.id)}
                                      className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                                      title="Borrar TODOS los pedidos de esta temporada"
                                  >
                                      <Archive className="w-4 h-4" />
                                  </button>

                                  {/* 4. ELIMINAR TEMPORADA (CONFIGURACIÓN) */}
                                  <button 
                                      onClick={() => {
                                          if(window.confirm('¿Seguro que quieres eliminar esta temporada de la configuración?')) deleteSeason(season.id);
                                      }}
                                      className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                      title="Eliminar Temporada (Configuración)"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      ))}
                      
                      {seasons.length === 0 && (
                          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                              <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2"/>
                              <p className="text-gray-500 font-medium">No hay temporadas registradas</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
      {tab === 'files' && (
          <div className="animate-fade-in-up h-full">
              <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      <Folder className="w-6 h-6 text-emerald-600"/> 
                      Gestión de Archivos en la Nube
                  </h3>
              </div>
              
              {/* AQUÍ LLAMAMOS AL NUEVO COMPONENTE */}
              <FilesManager clubs={clubs} />
          </div>
      )}
      {tab === 'finances' && (
          <div className="space-y-8 animate-fade-in-up pb-10">
              {/* CABECERA Y FILTROS */}
              <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
                  <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                          <BarChart3 className="w-8 h-8 text-emerald-600"/> 
                          Cuadro de Mando Integral
                      </h2>
                      <p className="text-gray-500 text-sm">Visión 360º del rendimiento económico y comercial.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                          <Calendar className="w-4 h-4 text-gray-500"/>
                          <select className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" value={financeSeasonId} onChange={(e) => setFinanceSeasonId(e.target.value)}>
                              <option value="all">Histórico Completo</option>
                              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                          <Store className="w-4 h-4 text-gray-500"/>
                          <select className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" value={statsClubFilter} onChange={(e) => setStatsClubFilter(e.target.value)}>
                              <option value="all">Todos los Clubes</option>
                              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                  </div>
              </div>

              {/* KPIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Ventas Totales" value={`${totalRevenue.toFixed(2)}€`} color="#3b82f6" />
                  <StatCard title="Beneficio Neto" value={`${netProfit.toFixed(2)}€`} color="#10b981" highlight />
                  <StatCard title="Pedidos Totales" value={financialOrders.length} color="#f59e0b" />
                  <StatCard title="Ticket Medio" value={`${averageTicket.toFixed(2)}€`} color="#6b7280" />
              </div>

              {/* FILA 1: EVOLUCIÓN Y MÉTODOS DE PAGO */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Gráfico Temporal */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-600"/> Evolución Mensual de Ventas
                      </h3>
                      <div className="flex items-end justify-between h-48 gap-2 pt-4 border-b border-gray-100 pb-2">
                          {statsData.sortedMonths.length > 0 ? statsData.sortedMonths.map((m, idx) => {
                              const maxVal = Math.max(...statsData.sortedMonths.map(i => i.value));
                              const heightPct = (m.value / maxVal) * 100;
                              return (
                                  <div key={idx} className="flex-1 flex flex-col justify-end items-center group">
                                      <div className="text-[10px] font-bold text-blue-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{m.value.toFixed(0)}€</div>
                                      <div className="w-full bg-blue-100 rounded-t-sm relative hover:bg-blue-200 transition-colors" style={{ height: `${heightPct}%` }}>
                                          <div className="absolute top-0 w-full h-1 bg-blue-400 opacity-50"></div>
                                      </div>
                                      <div className="text-[9px] text-gray-400 mt-2 uppercase font-bold rotate-0 truncate w-full text-center">{m.name}</div>
                                  </div>
                              );
                          }) : <p className="w-full text-center text-gray-400 self-center">Sin datos temporales</p>}
                      </div>
                  </div>

                  {/* GRÁFICO MÉTODOS DE PAGO (CAJONES) */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-purple-600"/> Métodos de Pago
                      </h3>
                      <div className="flex-1 flex flex-col gap-4">
                          {statsData.sortedPaymentMethods.map((method, idx) => (
                              <div 
                                  key={idx} 
                                  className={`flex-1 p-6 rounded-2xl border-l-8 shadow-sm flex flex-col justify-center transition-transform hover:scale-[1.02] ${
                                      method.name === 'card' ? 'bg-blue-50 border-blue-500' :
                                      method.name === 'cash' ? 'bg-green-50 border-green-500' :
                                      'bg-gray-50 border-gray-400'
                                  }`}
                              >
                                  <div className="flex justify-between items-center mb-3">
                                      <span className={`font-black text-sm uppercase tracking-widest ${
                                          method.name === 'card' ? 'text-blue-700' :
                                          method.name === 'cash' ? 'text-green-700' : 'text-gray-600'
                                      }`}>
                                          {method.name === 'card' ? 'Pago con Tarjeta' : 
                                           method.name === 'cash' ? 'Pago en Efectivo' : 
                                           method.name === 'transfer' ? 'Transferencia' : 
                                           method.name === 'invoice' ? 'Factura' : method.name}
                                      </span>
                                      {method.name === 'card' && <CreditCard className="w-8 h-8 text-blue-300"/>}
                                      {method.name === 'cash' && <Banknote className="w-8 h-8 text-green-300"/>}
                                  </div>
                                  <div className="flex items-baseline gap-3">
                                      <span className={`text-3xl font-black ${
                                          method.name === 'card' ? 'text-blue-900' :
                                          method.name === 'cash' ? 'text-green-900' : 'text-gray-800'
                                      }`}>
                                          {method.amount.toFixed(2)}€
                                      </span>
                                      <span className={`text-2xl font-light ${
                                          method.name === 'card' ? 'text-blue-300' :
                                          method.name === 'cash' ? 'text-green-300' : 'text-gray-300'
                                      }`}>/</span>
                                      <span className={`text-xl font-bold ${
                                          method.name === 'card' ? 'text-blue-600' :
                                          method.name === 'cash' ? 'text-green-600' : 'text-gray-500'
                                      }`}>
                                          {method.count} peds.
                                      </span>
                                  </div>
                              </div>
                          ))}
                          {statsData.sortedPaymentMethods.length === 0 && (
                              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed h-full flex items-center justify-center">
                                  Sin datos de pago
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* FILA 2: CATEGORÍAS Y PRODUCTOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Facturación por Categoría (VISUAL ACTUALIZADO) */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <Users className="w-5 h-5 text-indigo-600"/> 
                          Facturación por Categoría
                          <span className="text-xs font-normal text-gray-400 ml-auto">(Equipos agrupados)</span>
                      </h3>
                      <div className="space-y-4">
                          {statsData.sortedCategories.length > 0 ? statsData.sortedCategories.map((cat, idx) => (
                              <div key={idx} className="relative">
                                  <div className="flex justify-between text-xs font-bold mb-1">
                                      <span className="capitalize text-gray-600">{cat.name}</span>
                                      {/* CAMBIO AQUÍ: IMPORTE TOTAL / Nº CATEGORÍAS */}
                                      <span className="text-indigo-700 font-bold">
                                          {cat.value.toFixed(2)}€ / {cat.count} categorias
                                      </span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: getWidth(cat.value, statsData.sortedCategories[0].value) }}></div>
                                  </div>
                              </div>
                          )) : <p className="text-center text-gray-400 text-sm py-10">No hay datos de ventas.</p>}
                      </div>
                  </div>

                  {/* Top Productos */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                          <Package className="w-5 h-5 text-emerald-600"/> Productos Estrella
                      </h3>
                      <div className="space-y-5">
                          {statsData.sortedProducts.length > 0 ? statsData.sortedProducts.map((prod, idx) => (
                              <div key={idx} className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">#{idx+1}</div>
                                  <div className="flex-1">
                                      <div className="flex justify-between text-sm font-medium mb-1">
                                          <span className="text-gray-800">{prod.name}</span>
                                          <span className="text-emerald-700 font-bold">{prod.total.toFixed(0)}€ / {prod.qty} uds</span>
                                      </div>
                                      <div className="w-full bg-gray-100 rounded-full h-2">
                                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: getWidth(prod.qty, statsData.sortedProducts[0].qty) }}></div>
                                      </div>
                                  </div>
                              </div>
                          )) : <p className="text-center text-gray-400 text-sm py-10">No hay productos vendidos.</p>}
                      </div>
                  </div>
              </div>

              {/* FILA 3: TABLA FINANCIERA (Igual que antes) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Table className="w-5 h-5 text-blue-600"/> Reporte Financiero Detallado
                      </h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold tracking-wider">
                              <tr>
                                  <th className="px-6 py-4">Club</th>
                                  <th className="px-6 py-4 text-center">Pedidos</th>
                                  <th className="px-6 py-4 text-right text-blue-800">Facturación</th>
                                  <th className="px-6 py-4 text-right text-red-800">Coste Prov.</th>
                                  <th className="px-6 py-4 text-right text-purple-800">Com. Club</th>
                                  <th className="px-6 py-4 text-right text-orange-800">Neto Comercial</th>
                                  <th className="px-6 py-4 text-right text-gray-500">Gasto Pasarela</th>
                                  <th className="px-6 py-4 text-right bg-emerald-50 text-emerald-800">Beneficio Neto</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {statsData.clubFinancials.map(cf => (
                                  <tr key={cf.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 font-bold text-gray-800">{cf.name}</td>
                                      <td className="px-6 py-4 text-center"><span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold">{cf.ordersCount}</span></td>
                                      <td className="px-6 py-4 text-right font-medium">{cf.grossSales.toFixed(2)}€</td>
                                      <td className="px-6 py-4 text-right text-red-600 font-medium">-{cf.supplierCost.toFixed(2)}€</td>
                                      <td className="px-6 py-4 text-right text-purple-600">-{cf.commClub.toFixed(2)}€</td>
                                      <td className="px-6 py-4 text-right text-orange-600">+{cf.commCommercial.toFixed(2)}€</td>
                                      <td className="px-6 py-4 text-right text-gray-500 text-xs">-{cf.gatewayCost.toFixed(2)}€</td>
                                      <td className="px-6 py-4 text-right font-black text-emerald-600 bg-emerald-50/50">{cf.netIncome.toFixed(2)}€</td>
                                  </tr>
                              ))}
                              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                  <td className="px-6 py-4">TOTALES</td>
                                  <td className="px-6 py-4 text-center">{financialOrders.length}</td>
                                  <td className="px-6 py-4 text-right">{statsData.clubFinancials.reduce((s, c) => s + c.grossSales, 0).toFixed(2)}€</td>
                                  <td className="px-6 py-4 text-right text-red-700">-{statsData.clubFinancials.reduce((s, c) => s + c.supplierCost, 0).toFixed(2)}€</td>
                                  <td className="px-6 py-4 text-right text-purple-700">-{statsData.clubFinancials.reduce((s, c) => s + c.commClub, 0).toFixed(2)}€</td>
                                  <td className="px-6 py-4 text-right text-orange-700">+{statsData.clubFinancials.reduce((s, c) => s + c.commCommercial, 0).toFixed(2)}€</td>
                                  <td className="px-6 py-4 text-right text-gray-500">-{statsData.clubFinancials.reduce((s, c) => s + c.gatewayCost, 0).toFixed(2)}€</td>
                                  <td className="px-6 py-4 text-right text-emerald-700">{statsData.clubFinancials.reduce((s, c) => s + c.netIncome, 0).toFixed(2)}€</td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

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

export default function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState('home'); 
  const [cart, setCart] = useState([]);
  const [role, setRole] = useState('public'); 
  const [currentClub, setCurrentClub] = useState(null); 
  const [notification, setNotification] = useState(null); 
  const [confirmation, setConfirmation] = useState(null); 
  
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

  useEffect(() => { const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } }; initAuth(); const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u)); return () => unsubscribe(); }, []);
  useEffect(() => { if (!user) return; const ordersQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); const unsubOrders = onSnapshot(ordersQuery, (snapshot) => { const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); ordersData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds); setOrders(ordersData); }, (err) => console.error("Error fetching orders:", err)); return () => unsubOrders(); }, [user]);

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
  const createOrder = async (orderData) => { if (!user) return; const targetClub = clubs.find(c => c.id === orderData.clubId); const activeGlobalBatch = targetClub ? targetClub.activeGlobalOrderId : 1; try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), { ...orderData, createdAt: serverTimestamp(), globalBatch: activeGlobalBatch, status: orderData.paymentMethod === 'cash' ? 'pendiente_validacion' : 'recopilando', visibleStatus: orderData.paymentMethod === 'cash' ? 'Pendiente pago en Club' : 'Recopilando Pedidos', type: 'standard', incidents: [] }); setCart([]); setView('order-success'); } catch (e) { showNotification('Error al crear el pedido', 'error'); } };
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
  const updateOrderStatus = async (orderId, newStatus, newVisibleStatus) => { try { const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); await updateDoc(orderRef, { status: newStatus, visibleStatus: newVisibleStatus || 'Actualizado' }); showNotification('Estado actualizado'); } catch (e) { showNotification('Error actualizando pedido', 'error'); } };
  const addIncident = async (orderId, incidentData) => { try { const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); await updateDoc(orderRef, { incidents: arrayUnion(incidentData) }); showNotification('Incidencia/Reimpresión registrada'); } catch (e) { showNotification('Error registrando incidencia', 'error'); } };
  const updateIncidentStatus = async (orderId, incidents) => { try { const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId); await updateDoc(orderRef, { incidents }); showNotification('Estado de incidencia actualizado'); } catch(e) { showNotification('Error actualizando incidencia', 'error'); } };
  // --- ACTUALIZAR ESTADO DE LOTE GLOBAL (CON CONFIRMACIÓN DE CIERRE) ---


    const updateGlobalBatchStatus = async (clubId, batchId, newStatus) => { 
        const performUpdate = async () => {
            const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId && o.status !== 'pendiente_validacion'); 
            const batchLabel = newStatus === 'recopilando' ? 'Recopilando' : newStatus === 'en_produccion' ? 'En Producción' : 'Entregado al Club'; 
            
            const batchWrite = writeBatch(db);
            let count = 0; 
            
            batchOrders.forEach(order => {
                if (order.status !== newStatus) { 
                    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                    batchWrite.update(ref, { status: newStatus, visibleStatus: batchLabel });
                    count++; 
                }
            });

            // --- LÓGICA DE TREGUA ---
            // Si volvemos a "Recopilando", guardamos la hora actual.
            // El sistema automático respetará 5 minutos antes de volver a cerrar.
            if (newStatus === 'recopilando') {
                const clubRef = doc(db, 'clubs', clubId);
                batchWrite.update(clubRef, { lastBatchReopenTime: Date.now() });
            }
            // ------------------------

            if (newStatus === 'en_produccion') { 
                const club = clubs.find(c => c.id === clubId); 
                if (club && club.activeGlobalOrderId === batchId) { 
                    const clubRef = doc(db, 'clubs', clubId);
                    batchWrite.update(clubRef, { activeGlobalOrderId: club.activeGlobalOrderId + 1 });
                } 
            } 

            await batchWrite.commit();
            showNotification(`Lote #${batchId}: ${count} pedidos pasaron a "${batchLabel}".`); 
        };

        if (newStatus === 'en_produccion') {
            setConfirmation({
                title: "⚠️ Pasar a Producción",
                msg: `¿Cerrar Lote Global #${batchId}?\n\nLos pedidos pasarán a producción y se abrirá el Lote #${batchId+1} para nuevas compras.`,
                onConfirm: performUpdate
            });
        } else {
            await performUpdate();
        }
    };
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
              username: clubData.username, // Nuevo: Usuario para login
              pass: clubData.pass,         // Nuevo: Contraseña personalizada
              color: clubData.color,
              logoUrl: logoUrl,            // Nuevo: URL del escudo
              commission: 0.12,
              blocked: false,
              activeGlobalOrderId: 1,
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
  
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
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
        {view === 'shop' && <ShopView products={products} addToCart={addToCart} clubs={clubs} modificationFee={financialConfig.modificationFee} storeConfig={storeConfig} setConfirmation={setConfirmation} />}
        {view === 'cart' && <CartView cart={cart} removeFromCart={removeFromCart} createOrder={createOrder} total={cart.reduce((sum, item) => sum + item.price, 0)} clubs={clubs} storeConfig={storeConfig} />}
        {view === 'photo-search' && <PhotoSearchView clubs={clubs} />}
        {view === 'tracking' && <TrackingView orders={orders} />}
        {view === 'login' && <LoginView handleLogin={handleLogin} clubs={clubs} />}
        {view === 'order-success' && <OrderSuccessView setView={setView} />}
        {view === 'right-to-forget' && <RightToForgetView setView={setView} />}
        {view === 'club-dashboard' && role === 'club' && <ClubDashboard club={currentClub} orders={orders} updateOrderStatus={updateOrderStatus} config={financialConfig} seasons={seasons.filter(s => !s.hiddenForClubs)} />}
        {view === 'admin-dashboard' && role === 'admin' && <AdminDashboard products={products} orders={orders} clubs={clubs} updateOrderStatus={updateOrderStatus} financialConfig={financialConfig} setFinancialConfig={setFinancialConfig} updateProduct={updateProduct} addProduct={addProduct} deleteProduct={deleteProduct} createClub={createClub} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} seasons={seasons} addSeason={addSeason} deleteSeason={deleteSeason} toggleSeasonVisibility={toggleSeasonVisibility} storeConfig={storeConfig} setStoreConfig={setStoreConfig} incrementClubGlobalOrder={incrementClubGlobalOrder} decrementClubGlobalOrder={decrementClubGlobalOrder} updateGlobalBatchStatus={updateGlobalBatchStatus} createSpecialOrder={createSpecialOrder} addIncident={addIncident} updateIncidentStatus={updateIncidentStatus} updateFinancialConfig={updateFinancialConfig} />}
      </main>
      <footer className="bg-gray-900 text-white py-12 mt-12"><div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8"><div><div className="mb-4 text-white"><CompanyLogo className="h-40" /></div><p className="text-gray-400">Merchandising personalizado para clubes deportivos. Calidad profesional y gestión integral.</p></div><div><h3 className="text-lg font-semibold mb-4">Legal</h3><ul className="space-y-2 text-gray-400 cursor-pointer"><li>Política de Privacidad</li><li>Aviso Legal</li><li onClick={() => setView('right-to-forget')} className="hover:text-emerald-400 text-emerald-600 font-bold flex items-center gap-2"><UserX className="w-4 h-4"/> Derecho al Olvido (RGPD)</li></ul></div><div><h3 className="text-lg font-semibold mb-4">Contacto</h3><p className="text-gray-400">info@fotoesportmerch.es</p></div></div></footer>
    </div>
  );
}