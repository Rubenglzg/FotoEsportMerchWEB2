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
  serverTimestamp,
  orderBy,
  writeBatch,
  arrayUnion,
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';
import ExcelJS from 'exceljs';



// --- 1. CONFIGURACIÓN FIREBASE CON TUS DATOS ---
const firebaseConfig = {
  apiKey: "AIzaSyCc0R2TidFpqcqsKQIFmP0lnniAzlsuLbA",
  authDomain: "fotoesport-merch.firebaseapp.com",
  projectId: "fotoesport-merch",
  storageBucket: "fotoesport-merch.firebasestorage.app",
  messagingSenderId: "850889568612",
  appId: "1:850889568612:web:64bba766b7b2b16b3f8a71",
  measurementId: "G-TPB1419H31"
};

// Inicialización segura
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Error inicializando Firebase:", error);
}

// --- CONFIGURACIÓN GLOBAL ---
const LOGO_URL = null; 
const appId = 'fotoesport-merch'; // Usamos tu ID de proyecto como referencia

// --- DATOS MOCKADOS Y CONSTANTES ---
const MOCK_PHOTOS_DB = [
    { id: 'p1', filename: 'Lopez_10.jpg', clubId: 'club-demo', folder: 'Temporada_23_24', url: 'https://images.unsplash.com/photo-1526304640152-d4619684e484?auto=format&fit=crop&q=80&w=600' },
    { id: 'p2', filename: 'Garcia_7.jpg', clubId: 'club-demo', folder: 'Temporada_23_24', url: 'https://images.unsplash.com/photo-1517466787929-bc90951d6428?auto=format&fit=crop&q=80&w=600' },
    { id: 'p3', filename: 'Ruiz_23.jpg', clubId: 'club-futbol', folder: 'Torneo_Verano', url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600' },
    { id: 'p4', filename: 'Juan_Perez_10.jpg', clubId: 'club-demo', folder: 'Benjamines', url: 'https://images.unsplash.com/photo-1511512578047-929550a8a23e?auto=format&fit=crop&q=80&w=600' },
    { id: 'p5', filename: 'Foto_Equipo_Tecnico.jpg', clubId: 'club-demo', folder: 'Staff', url: 'https://images.unsplash.com/photo-1551590192-807e80d75d61?auto=format&fit=crop&q=80&w=600' }, 
];

const SEASONS_INITIAL = [
    { id: 's1', name: 'Temporada 2023-2024', startDate: '2023-09-01', endDate: '2024-06-30' },
    { id: 's2', name: 'Temporada 2024-2025', startDate: '2024-09-01', endDate: '2025-06-30' },
];

const PRODUCTS_INITIAL = [
  { id: 1, name: 'Taza Personalizada', price: 12.00, cost: 4.50, category: 'Hogar', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&q=80&w=300', stockType: 'internal', stock: 150, features: { name: true, number: true, photo: true, shield: true, color: false }, defaults: { name: true, number: true, photo: true, shield: true }, modifiable: { name: true, number: true, photo: true, shield: true } },
  { id: 2, name: 'Botella Deportiva', price: 18.00, cost: 6.00, category: 'Deporte', image: 'https://images.unsplash.com/photo-1602143407151-0111419516eb?auto=format&fit=crop&q=80&w=300', stockType: 'external', stock: 0, features: { name: true, number: true, photo: false, shield: true, color: true }, defaults: { name: true, number: true, photo: false, shield: true }, modifiable: { name: true, number: true, photo: false, shield: false } },
  { id: 3, name: 'Llavero Club', price: 5.00, cost: 1.20, category: 'Accesorios', image: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=300', stockType: 'internal', stock: 500, features: { name: false, number: false, photo: false, shield: true, color: false }, defaults: { name: false, number: false, photo: false, shield: true }, modifiable: { name: false, number: false, photo: false, shield: false } },
  { id: 4, name: 'Foto 20x30', price: 8.00, cost: 0.50, category: 'Fotografía', image: 'https://images.unsplash.com/photo-1551590192-807e80d75d61?auto=format&fit=crop&q=80&w=300', stockType: 'external', stock: 0, features: { name: false, number: false, photo: true, shield: false, color: false }, defaults: { name: false, number: false, photo: true, shield: false }, modifiable: { name: false, number: false, photo: false, shield: false } },
  { id: 6, name: 'Gorra Oficial', price: 15.00, cost: 5.00, category: 'Ropa', image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=300', stockType: 'internal', stock: 80, features: { name: false, number: false, photo: false, shield: true, color: true }, defaults: { name: false, number: false, photo: false, shield: true }, modifiable: { name: false, number: false, photo: false, shield: true } },
];

const CLUBS_MOCK = [
  { id: 'club-demo', name: 'C.D. Demo Sport', code: 'CDDS', pass: 'club123', blocked: false, activeGlobalOrderId: 1 },
  { id: 'club-futbol', name: 'Atlético Fútbol', code: 'ATLF', pass: 'club123', blocked: false, activeGlobalOrderId: 1 },
];

const FINANCIAL_CONFIG_INITIAL = {
  clubCommissionPct: 0.12,
  commercialCommissionPct: 0.05
};

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

const CompanyLogo = ({ className = "h-10" }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        {LOGO_URL ? (
            <img src={LOGO_URL} alt="FotoEsport Merch" className="h-full w-auto object-contain" />
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

const ClubEditorRow = ({ club, updateClub, deleteClub, toggleClubBlock }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: club.name, pass: club.pass });
    const [showPass, setShowPass] = useState(false);
    const handleSave = () => { updateClub({ ...club, ...editData }); setIsEditing(false); };

    if (isEditing) {
        return (
            <div className="bg-gray-50 p-3 rounded flex flex-col gap-2 border border-emerald-200">
                <div className="flex gap-2"><input className="flex-1 border rounded px-2 py-1 text-sm" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Nombre Club" /></div>
                <div className="flex gap-2">
                    <div className="flex-1 relative"><input type={showPass ? "text" : "password"} className="w-full border rounded px-2 py-1 text-sm pr-8" value={editData.pass} onChange={e => setEditData({...editData, pass: e.target.value})} placeholder="Contraseña" /><button onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}</button></div>
                    <Button size="sm" onClick={handleSave} className="bg-emerald-600 text-white"><Check className="w-3 h-3"/></Button>
                    <Button size="sm" onClick={() => setIsEditing(false)} className="bg-gray-300 text-gray-700 hover:bg-gray-400"><X className="w-3 h-3"/></Button>
                </div>
            </div>
        )
    }
    return (
        <div className={`flex justify-between items-center p-2 rounded ${club.blocked ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
            <div><p className={`font-bold text-sm flex items-center gap-2 ${club.blocked ? 'text-red-700' : ''}`}>{club.name} {club.blocked && <Ban className="w-3 h-3 text-red-500"/>}</p><div className="flex gap-2 text-xs text-gray-400"><span>User: {club.id}</span><span>Pass: ••••••••</span></div></div>
            <div className="flex gap-1"><button onClick={() => toggleClubBlock(club.id)} className={`p-1 hover:bg-gray-200 rounded ${club.blocked ? 'text-red-500' : 'text-gray-400'}`}>{club.blocked ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}</button><button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-emerald-600 p-1"><Edit3 className="w-4 h-4"/></button><button onClick={() => deleteClub(club.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4"/></button></div>
        </div>
    );
};

const ProductEditorRow = ({ product, updateProduct, deleteProduct }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const features = product.features || { name: true, number: true, photo: true, shield: true, color: true };
    const defaults = product.defaults || { name: true, number: true, photo: false, shield: true };
    const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };
    const toggleFeature = (key) => { updateProduct({ ...product, features: { ...features, [key]: !features[key] } }); }
    const toggleDefault = (key) => { updateProduct({ ...product, defaults: { ...defaults, [key]: !defaults[key] } }); }
    const toggleModifiable = (key) => { updateProduct({ ...product, modifiable: { ...modifiable, [key]: !modifiable[key] } }); }

    return (
        <div className="border-b pb-4 last:border-0">
            <div className="flex items-center gap-3">
                <img src={product.image} className="w-12 h-12 rounded bg-gray-100 object-cover" />
                <div className="flex-1">
                    <div className="flex justify-between items-start"><input className="font-bold text-sm border-b border-transparent hover:border-gray-300 focus:border-emerald-500 outline-none w-1/2" value={product.name} onChange={e => updateProduct({...product, name: e.target.value})} /><div className="flex items-center gap-2"><button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-emerald-600"><Settings className="w-4 h-4"/></button><button type="button" onClick={() => deleteProduct(product.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></div></div>
                    <div className="flex gap-2 mt-1"><div className="flex items-center gap-1"><span className="text-[10px]">PVP:</span><input type="number" className="w-14 text-xs border rounded px-1" value={product.price} onChange={e => updateProduct({...product, price: parseFloat(e.target.value)})} /></div><div className="flex items-center gap-1"><span className="text-[10px]">Coste:</span><input type="number" className="w-14 text-xs border rounded px-1" value={product.cost} onChange={e => updateProduct({...product, cost: parseFloat(e.target.value)})} /></div></div>
                </div>
            </div>
            {isExpanded && (
                <div className="mt-4 bg-gray-50 p-3 rounded-lg text-xs space-y-3 animate-fade-in-down">
                    <div><label className="block text-gray-500 font-bold mb-1">URL Imagen</label><input className="w-full border p-1 rounded" value={product.image} onChange={e => updateProduct({...product, image: e.target.value})} /></div>
                    <div className="bg-white rounded border overflow-hidden">
                        <div className="grid grid-cols-4 gap-2 bg-gray-100 p-2 font-bold text-gray-600 text-[10px] text-center"><div className="text-left">Opción</div><div>Disponible</div><div>Por Defecto</div><div>Modificable</div></div>
                        {['name', 'number', 'shield', 'photo'].map(k => (
                             <div key={k} className="grid grid-cols-4 gap-2 p-2 border-t items-center text-center">
                                 <div className="text-left font-medium capitalize">{k === 'shield' ? 'Escudo' : k === 'number' ? 'Dorsal' : k === 'photo' ? 'Foto' : 'Nombre'}</div>
                                 <div className="flex justify-center"><input type="checkbox" checked={features[k]} onChange={() => toggleFeature(k)} className="accent-emerald-600" /></div>
                                 <div className="flex justify-center"><input type="checkbox" checked={defaults[k]} onChange={() => toggleDefault(k)} disabled={!features[k]} className="accent-blue-500 disabled:opacity-30" /></div>
                                 <div className="flex justify-center"><button onClick={() => toggleModifiable(k)} disabled={!features[k]} className={`p-1 rounded ${!features[k] ? 'opacity-30' : ''} ${modifiable[k] ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>{modifiable[k] ? <Unlock className="w-3 h-3"/> : <Lock className="w-3 h-3"/>}</button></div>
                             </div>
                        ))}
                    </div>
                </div>
            )}
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
      includeName: defaults.name ?? true, 
      includeNumber: defaults.number ?? true, 
      includePhoto: defaults.photo ?? false, 
      includeShield: defaults.shield ?? true 
  });

  // Sugerencias de Clubes
  const clubSuggestions = useMemo(() => {
      if (clubInput.length < 2) return [];
      return clubs.filter(c => c.name.toLowerCase().includes(clubInput.toLowerCase()));
  }, [clubInput, clubs]);

  // Obtener carpetas del club seleccionado
  const availableCategories = useMemo(() => {
      return getClubFolders(customization.clubId);
  }, [customization.clubId]);

  // Sugerencias de Categorías
  const categorySuggestions = useMemo(() => {
      if (categoryInput.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()));
  }, [categoryInput, availableCategories]);

  // Selección de Club
  const handleSelectClub = (club) => {
      setCustomization({ ...customization, clubId: club.id, category: '' });
      setClubInput(club.name);
      setCategoryInput(''); // Reset categoría
      setShowClubSuggestions(false);
  };

  // Selección de Categoría
  const handleSelectCategory = (cat) => {
      setCustomization({ ...customization, category: cat });
      setCategoryInput(cat);
      setShowCategorySuggestions(false);
  };

  const isModified = useMemo(() => { const checkDiff = (key) => { if (!features[key]) return false; if (!modifiable[key]) return false; return customization[`include${key.charAt(0).toUpperCase() + key.slice(1)}`] !== defaults[key]; }; return checkDiff('name') || checkDiff('number') || checkDiff('photo') || checkDiff('shield'); }, [customization, defaults, features, modifiable]);
  const finalPrice = product.price + (isModified ? modificationFee : 0);
  
  const handleSubmit = (e) => { 
      e.preventDefault(); 
      if (!storeConfig.isOpen) return; 
      
      // Validaciones
      if (!customization.clubId) { alert("Debes seleccionar un club válido de la lista."); return; }
      if (!customization.category) { alert("Debes seleccionar una categoría (archivo) de la lista."); return; }
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
        <div className="flex items-end gap-2 mb-6"><p className="text-emerald-600 font-bold text-3xl">{finalPrice.toFixed(2)}€</p>{isModified && (<span className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-1 rounded mb-1 border border-orange-200">+{modificationFee}€ por modificación</span>)}</div>
        
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

          {/* BUSCADOR DE CATEGORÍA (Visible solo si hay club) */}
          {customization.clubId && (
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
          
          {features.color && (<div><label className="block text-sm font-medium text-gray-700 mb-2">Color Principal</label><div className="flex gap-3">{['white', 'red', 'blue', 'green', 'black', 'yellow'].map(color => (<button key={color} type="button" onClick={() => setCustomization({...customization, color})} className={`w-8 h-8 rounded-full border-2 transition-transform ${customization.color === color ? 'border-gray-900 scale-125 ring-2 ring-offset-2 ring-emerald-500' : 'border-gray-200 hover:scale-110'}`} style={{ backgroundColor: color }} />))}</div></div>)}
          
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

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sugerencias Clubs
  const clubSuggestions = useMemo(() => { if (clubInput.length < 2) return []; return clubs.filter(c => c.name.toLowerCase().includes(clubInput.toLowerCase())); }, [clubInput, clubs]);
  
  // Sugerencias Categorías
  const clubCategories = useMemo(() => { return selectedClub ? getClubFolders(selectedClub.id) : []; }, [selectedClub]);
  const categorySuggestions = useMemo(() => {
      if (categoryInput.length < 2) return [];
      return clubCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()));
  }, [categoryInput, clubCategories]);

  const selectClub = (club) => { setSelectedClub(club); setClubInput(club.name); setStep(2); setError(''); setResult(null); };
  
  const selectCategory = (cat) => {
      setSearch({ ...search, category: cat });
      setCategoryInput(cat);
      setShowCategorySuggestions(false);
  };

  const clearSelection = () => { setSelectedClub(null); setClubInput(''); setStep(1); setSearch({ category: '', name: '', number: '' }); setCategoryInput(''); setResult(null); };
  
  const handleSearch = (e) => { 
      e.preventDefault(); 
      if (!selectedClub) return; 
      
      // Validación estricta
      if (!search.category) { setError("Debes seleccionar una categoría."); return; }
      if (!search.name) { setError("El nombre es obligatorio."); return; }
      if (!search.number) { setError("El dorsal es obligatorio."); return; }

      setLoading(true); setError(''); setResult(null); 
      
      setTimeout(() => { 
          setLoading(false); 
          const formattedName = search.name.trim().replace(/\s+/g, '_'); 
          const dorsalSuffix = search.number ? `_${search.number}` : ''; 
          const searchPattern = formattedName + dorsalSuffix; 
          
          const photo = MOCK_PHOTOS_DB.find(p => { 
              const matchesClub = p.clubId === selectedClub.id;
              const matchesCategory = p.folder === search.category;
              const matchesName = p.filename.toLowerCase().includes(searchPattern.toLowerCase()); 
              return matchesClub && matchesCategory && matchesName; 
          }); 
          
          if (photo) { 
              setResult(photo.url); 
          } else { 
              setError(`No se encontraron fotos en ${selectedClub.name} (${search.category}) para "${formattedName.replace(/_/g, ' ')}" con dorsal ${search.number}.`); 
          } 
      }, 1200); 
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Buscador de Fotos Segura</h2>
            <p className="text-gray-500">Área protegida. Solo para jugadores y familiares.</p>
            {/* CORRECCIÓN: Se han cambiado los '->' por '→' para evitar errores de sintaxis JSX */}
            <div className="bg-yellow-50 text-yellow-800 text-xs inline-block px-3 py-1 rounded-full mt-2 border border-yellow-200">
                Pista Demo: "Demo Sport" → "Temporada_23_24" → "Lopez" + "10"
            </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
            <div className={`transition-all duration-300 ${step === 1 ? 'opacity-100' : 'hidden'}`}>
                <label className="block text-sm font-bold text-gray-700 mb-2">1. Selecciona tu Club</label>
                <div className="relative">
                    <Input placeholder="Escribe el nombre de tu club (ej. Demo)" value={clubInput} onChange={e => setClubInput(e.target.value)} autoFocus />
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
                        
                        {/* BUSCADOR DE CATEGORÍA (Mismo sistema) */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría / Archivo <span className="text-red-500">*</span></label>
                            <Input 
                                placeholder="Escribe para buscar categoría..." 
                                value={categoryInput} 
                                onChange={e => { setCategoryInput(e.target.value); setSearch({...search, category: ''}); setShowCategorySuggestions(true); }}
                                onFocus={() => setShowCategorySuggestions(true)}
                                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                            />
                            {showCategorySuggestions && categorySuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                    {categorySuggestions.map(cat => (
                                        <div key={cat} onClick={() => selectCategory(cat)} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer flex justify-between items-center group">
                                            <span className="font-medium text-gray-700 group-hover:text-emerald-700">{cat}</span>
                                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500"/>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <Input label="Nombre o Texto (Espacios = _)" placeholder="Ej. Juan Perez" value={search.name} onChange={e => setSearch({...search, name: e.target.value})} required />
                            </div>
                            <div className="md:col-span-1">
                                <Input label="Dorsal" placeholder="Ej. 10" value={search.number} onChange={e => setSearch({...search, number: e.target.value})} required />
                            </div>
                        </div>
                        
                        <div className="mt-2">
                            <Button type="submit" disabled={loading} className="w-full h-[48px] text-lg shadow-emerald-200 shadow-lg">{loading ? 'Buscando...' : 'Buscar Fotos'}</Button>
                        </div>
                    </form>
                </div>
            )}
            
            {error && <p className="text-red-500 text-sm mt-4 text-center bg-red-50 p-2 rounded border border-red-100">{error}</p>}
        </div>
        
        {result && (
            <div className="bg-white p-4 rounded-xl shadow-lg relative overflow-hidden group animate-fade-in-up border border-gray-100">
                <div className="relative">
                    <img src={result} alt="Resultado" className="w-full rounded-lg" onContextMenu={(e) => e.preventDefault()} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                        <div className="w-full h-full flex flex-wrap content-center justify-center opacity-40 rotate-12 scale-150">
                            {Array.from({ length: 20 }).map((_, i) => <span key={i} className="text-3xl font-black text-white m-8 shadow-sm">MUESTRA</span>)}
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 text-center">
                        <ShieldCheck className="w-12 h-12 mb-2 text-emerald-400" />
                        <p className="font-bold text-lg">Protegido por Copyright</p>
                        <p className="text-sm text-gray-300">Prohibida la descarga. Compra la foto para obtener el original sin marca de agua.</p>
                        <Button className="mt-4 bg-white text-black hover:bg-gray-200">Añadir al Carrito (8.00€)</Button>
                    </div>
                </div>
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

function AdminDashboard({ products, orders, clubs, updateOrderStatus, financialConfig, setFinancialConfig, updateProduct, addProduct, deleteProduct, createClub, deleteClub, updateClub, toggleClubBlock, modificationFee, setModificationFee, seasons, addSeason, deleteSeason, toggleSeasonVisibility, storeConfig, setStoreConfig, incrementClubGlobalOrder, decrementClubGlobalOrder, updateGlobalBatchStatus, createSpecialOrder, addIncident, updateIncidentStatus }) {
  const [tab, setTab] = useState('management');
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
  // --- ESTADOS PARA EDICIÓN Y MOVIMIENTOS ---
  const [editOrderModal, setEditOrderModal] = useState({ 
      active: false, 
      original: null, 
      modified: null 
  });

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
      recharge: false,  // Si es fallo del club, ¿se cobra?
      targetBatch: ''   // A qué lote va la reposición
  });

  // --- FUNCIÓN PARA ABRIR EL MODAL ---
  const handleOpenIncident = (order, item) => {
      const club = clubs.find(c => c.id === order.clubId);
      setIncidentForm({
          active: true,
          order: order,
          item: item,
          qty: item.quantity || 1, // Por defecto toda la cantidad
          cost: item.cost || 0,    // Por defecto el coste original
          reason: '',
          responsibility: 'internal',
          recharge: false,
          targetBatch: club ? club.activeGlobalOrderId : 1
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

      // Tabla Financiera
      const clubFinancials = clubs.map(club => {
          const clubOrders = financialOrders.filter(o => o.clubId === club.id);
          let grossSales = 0;
          let supplierCost = 0;
          
          clubOrders.forEach(order => {
              grossSales += order.total;
              const orderCost = order.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 1)), 0);
              const incidentCost = order.incidents?.reduce((sum, inc) => sum + (inc.cost || 0), 0) || 0;
              supplierCost += (orderCost + incidentCost);
          });

          const commClub = grossSales * financialConfig.clubCommissionPct;
          const commCommercial = grossSales * financialConfig.commercialCommissionPct;
          const netIncome = grossSales - supplierCost - commClub - commCommercial;

          return {
              id: club.id, name: club.name, ordersCount: clubOrders.length,
              grossSales, supplierCost, commClub, commCommercial, netIncome
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

  const totalRevenue = financialOrders.reduce((sum, o) => sum + o.total, 0);
  const totalIncidentCosts = financialOrders.reduce((sum, o) => {
      return sum + (o.incidents?.reduce((iSum, inc) => iSum + (inc.cost || 0), 0) || 0);
  }, 0);

  const netProfit = totalRevenue - 
                    financialOrders.reduce((sum, o) => sum + (o.items ? o.items.reduce((s, i) => s + ((i.cost || 0) * (i.quantity || 1)), 0) : (o.cost || 0)), 0) - 
                    totalIncidentCosts - 
                    (totalRevenue * financialConfig.clubCommissionPct) - 
                    (totalRevenue * financialConfig.commercialCommissionPct);
  
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

      const { order, item, qty, cost, reason, responsibility, recharge, targetBatch } = incidentForm;
      
      // Si es fallo interno/fabrica o club sin cobro, precio 0. Si se cobra, precio original.
      const finalPrice = (responsibility === 'club' && recharge) ? item.price : 0;
      const totalOrder = finalPrice * qty;

      // Determinar el ID del lote (Número o String 'INDIVIDUAL')
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
                  cost: parseFloat(cost),
                  name: `${item.name} [REP]`
              }],
              total: totalOrder,
              status: targetBatch === 'INDIVIDUAL' ? 'en_produccion' : 'recopilando', // Si es individual pasa directo
              visibleStatus: 'Reposición / Incidencia',
              type: 'replacement',
              paymentMethod: 'incident', 
              globalBatch: batchIdToSave, // <--- AQUÍ GUARDAMOS EL LOTE O 'INDIVIDUAL'
              relatedOrderId: order.id,
              incidentDetails: {
                  originalItemId: item.cartId,
                  reason: reason,
                  responsibility: responsibility
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

{tab === 'management' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* COLUMNA IZQUIERDA: TIENDA Y PRODUCTOS */}
              <div className="bg-white p-6 rounded-xl shadow h-fit space-y-6">
                  {/* Configuración Tienda */}
                  <div className={`p-4 rounded-lg border ${storeConfig.isOpen ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex justify-between items-center mb-2">
                          <h4 className={`font-bold ${storeConfig.isOpen ? 'text-emerald-800' : 'text-red-800'}`}>Tienda Global</h4>
                          <button onClick={() => setStoreConfig({...storeConfig, isOpen: !storeConfig.isOpen})} className={`px-3 py-1 rounded-full text-xs font-bold ${storeConfig.isOpen ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                              {storeConfig.isOpen ? 'ABIERTA' : 'CERRADA'}
                          </button>
                      </div>
                      {!storeConfig.isOpen && <input className="w-full text-xs border p-1 rounded" value={storeConfig.closedMessage} onChange={e => setStoreConfig({...storeConfig, closedMessage: e.target.value})} placeholder="Mensaje..."/>}
                  </div>

                  {/* Productos */}
                  <div>
                      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Productos</h3><Button size="sm" onClick={addProduct}><Plus className="w-4 h-4"/></Button></div>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">{products.map(p => <ProductEditorRow key={p.id} product={p} updateProduct={updateProduct} deleteProduct={deleteProduct} />)}</div>
                  </div>
              </div>

              {/* COLUMNA DERECHA: SOLO CLUBES (Temporadas eliminado) */}
              <div className="space-y-8">
                  <div className="bg-white p-6 rounded-xl shadow h-fit">
                      <div>
                          <h3 className="font-bold mb-4 text-lg">Clubes</h3>
                          <div className="flex gap-2 mb-4">
                              <input id="newClubName" placeholder="Nombre" className="border rounded px-3 py-2 flex-1" />
                              <Button onClick={() => { const input = document.getElementById('newClubName'); if(input.value) createClub({name: input.value, code: input.value.slice(0,3).toUpperCase()}); }} size="sm"><Plus className="w-4 h-4"/></Button>
                          </div>
                          <div className="space-y-2">
                              {clubs.map(c => (
                                  <ClubEditorRow key={c.id} club={c} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} />
                              ))}
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
                                  className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
                                  value={incidentForm.qty} 
                                  onChange={e => setIncidentForm({...incidentForm, qty: e.target.value})} 
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Coste Reimpresión</label>
                              <div className="relative">
                                  <input 
                                      type="number" 
                                      step="0.01" 
                                      className="w-full border rounded p-2 pl-6 text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
                                      value={incidentForm.cost} 
                                      onChange={e => setIncidentForm({...incidentForm, cost: e.target.value})} 
                                  />
                                  <span className="absolute left-2 top-2 text-gray-400 text-sm">€</span>
                              </div>
                          </div>
                      </div>

                      {/* Responsabilidad y Cobro */}
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Origen del Fallo</label>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                              <button 
                                  type="button"
                                  onClick={() => setIncidentForm({...incidentForm, responsibility: 'internal'})}
                                  className={`p-2 rounded text-sm border flex flex-col items-center gap-1 ${incidentForm.responsibility === 'internal' ? 'bg-red-50 border-red-200 text-red-700 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}
                              >
                                  <span>Interno / Fabrica</span>
                                  <span className="text-[10px] font-normal">Nosotros asumimos coste</span>
                              </button>
                              <button 
                                  type="button"
                                  onClick={() => setIncidentForm({...incidentForm, responsibility: 'club'})}
                                  className={`p-2 rounded text-sm border flex flex-col items-center gap-1 ${incidentForm.responsibility === 'club' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}
                              >
                                  <span>Error del Club</span>
                                  <span className="text-[10px] font-normal">Decidir si cobrar</span>
                              </button>
                          </div>

                          {/* Opción de Cobrar solo si es fallo del club */}
                          {incidentForm.responsibility === 'club' && (
                              <div className="flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100 animate-fade-in">
                                  <input 
                                      type="checkbox" 
                                      id="recharge" 
                                      className="w-4 h-4 text-blue-600 rounded"
                                      checked={incidentForm.recharge}
                                      onChange={e => setIncidentForm({...incidentForm, recharge: e.target.checked})}
                                  />
                                  <label htmlFor="recharge" className="text-sm text-blue-800 font-medium cursor-pointer">
                                      ¿Volver a cobrar el precio de venta ({incidentForm.item.price}€)?
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

{/* --- PESTAÑA DE PEDIDOS (V12 - DISEÑO INTEGRADO) --- */}
      {tab === 'accounting' && (
          <div className="bg-white p-6 rounded-xl shadow h-full animate-fade-in-up">
              {/* CABECERA Y FILTROS */}
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b pb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600"/> 
                      Gestión de Pedidos
                  </h3>
                  
                  <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                          <Store className="w-4 h-4 text-gray-500"/>
                          <select 
                              className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm w-32 md:w-auto" 
                              value={filterClubId} 
                              onChange={(e) => setFilterClubId(e.target.value)}
                          >
                              <option value="all">Todos los Clubes</option>
                              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
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
              </div>

              {/* --- PANEL DE GESTIÓN DE LOTES (BARRA DE HERRAMIENTAS) --- */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                          <Layers className="w-5 h-5"/>
                      </div>
                      <div>
                          <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Control de Lotes</h4>
                          <p className="text-xs text-slate-500">Gestionar apertura y cierre de pedidos globales.</p>
                      </div>
                  </div>

                    {/* Selector de Club y Lote Activo (DISEÑO LIMPIO) */}
                  <div className="flex flex-col md:flex-row items-center gap-6 flex-1 justify-center bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 mx-4">
                      
                      {/* SELECTOR DE CLUB (Sin bordes) */}
                      <div className="relative group flex items-center">
                          <select 
                            className="appearance-none bg-transparent text-base font-extrabold text-slate-700 pr-8 cursor-pointer focus:outline-none hover:text-blue-600 transition-colors text-center md:text-left"
                            value={selectedClubId}
                            onChange={(e) => setSelectedClubId(e.target.value)}
                          >
                              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          {/* Flecha personalizada usando ChevronRight rotado */}
                          <ChevronRight className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none group-hover:text-blue-500 rotate-90 transition-colors"/>
                      </div>
                      
                      <div className="h-8 w-px bg-slate-100 hidden md:block"></div>

                      <div className="flex items-center gap-3">
                          {/* ETIQUETA MÁS VISIBLE (Gris oscuro en vez de claro) */}
                          <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Lote Activo</span>
                          
                          {isEditingActiveBatch ? (
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                  <span className="text-base font-extrabold text-slate-500 pl-2">#</span>
                                  <input 
                                      type="number" 
                                      // TAMAÑO REDUCIDO EN EDICIÓN TAMBIÉN
                                      className="w-12 bg-transparent border-none p-0 text-base font-extrabold text-slate-800 focus:ring-0" 
                                      value={tempBatchValue} 
                                      onChange={(e) => setTempBatchValue(e.target.value)}
                                      autoFocus
                                  />
                                  <button onClick={saveActiveBatchManually} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check className="w-4 h-4"/></button>
                                  <button onClick={() => setIsEditingActiveBatch(false)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X className="w-4 h-4"/></button>
                              </div>
                          ) : (
                              <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors group" 
                                  onClick={() => { setTempBatchValue(selectedClub?.activeGlobalOrderId); setIsEditingActiveBatch(true); }}
                                  title="Click para editar"
                              >
                                  {/* TAMAÑO REDUCIDO (text-base) PARA IGUALAR AL NOMBRE DEL CLUB */}
                                  <span className="text-base font-extrabold text-slate-800">#{selectedClub?.activeGlobalOrderId}</span>
                                  
                                  {/* LÁPIZ MÁS VISIBLE (Verde intenso) */}
                                  <Edit3 className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700 transition-colors"/>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center gap-2">
                      {selectedClub && selectedClub.activeGlobalOrderId > 1 && (
                          <button 
                              onClick={() => setConfirmation({
                                  title: "⚠️ ¿Reabrir Lote Anterior?",
                                  msg: `Estás a punto de cancelar el Lote Global #${selectedClub.activeGlobalOrderId} (Actual) para volver a activar el Lote #${selectedClub.activeGlobalOrderId - 1}.\n\nSi el lote actual tiene pedidos, se te pedirá qué hacer con ellos.\n\n¿Continuar?`,
                                  onConfirm: () => handleRevertGlobalBatch(selectedClubId)
                              })}
                              className="text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded transition-colors flex items-center gap-2"
                          >
                              <RotateCcw className="w-3 h-3"/> Deshacer
                          </button>
                      )}
                      
                      <Button 
                          onClick={() => incrementClubGlobalOrder(selectedClubId)} 
                          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md text-xs py-2 px-4"
                      >
                          <Archive className="w-4 h-4 mr-2"/> Cerrar y Abrir Nuevo
                      </Button>
                  </div>
              </div>
              {/* ------------------------------------------------------------- */}
              
              <div className="space-y-12">
                  {accountingData.map(({ club, batches }) => (
                      <div key={club.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">{club.code}</div>
                                  <h4 className="font-bold text-lg">{club.name}</h4>
                              </div>
                              <span className="text-xs bg-gray-700 px-3 py-1 rounded-full text-gray-300">{batches.length} Lotes</span>
                          </div>
                          
                          {batches.length === 0 ? (
                              <p className="p-8 text-gray-400 text-sm text-center italic">No hay pedidos registrados.</p>
                          ) : (
                              <div className="divide-y divide-gray-200">
                                  {batches.map(batch => {
                                      const isSpecialBatch = batch.id === 'SPECIAL';
                                      const isIndividualBatch = batch.id === 'INDIVIDUAL';
                                      const isStandardBatch = typeof batch.id === 'number'; 
                                      
                                      const isActiveBatch = isStandardBatch && batch.id === club.activeGlobalOrderId;
                                      
                                      const batchTotal = batch.orders.reduce((sum, o) => sum + o.total, 0);
                                      const batchStatus = (isSpecialBatch || isIndividualBatch) ? 'special' : (batch.orders[0]?.status || 'recopilando');
                                      
                                      return (
                                          <div key={batch.id} className={`p-4 ${!isStandardBatch ? 'bg-indigo-50/30' : isActiveBatch ? 'bg-emerald-50/30' : 'bg-white hover:bg-gray-50'}`}>
                                              {/* CABECERA DEL LOTE */}
                                              <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                                                  <div className="flex items-center gap-4">
                                                      {isSpecialBatch ? (
                                                          <span className="font-black text-lg text-indigo-700 flex items-center gap-2">
                                                              <Briefcase className="w-5 h-5"/> PEDIDOS ESPECIALES
                                                          </span>
                                                      ) : isIndividualBatch ? (
                                                          <span className="font-black text-lg text-orange-700 flex items-center gap-2">
                                                              <Package className="w-5 h-5"/> ENTREGAS INDIVIDUALES
                                                          </span>
                                                      ) : (
                                                          <div className="flex items-center gap-2">
                                                              <span className="font-bold text-lg text-emerald-900">Pedido Global #{batch.id}</span>
                                                              {/* ETIQUETA DE LOTE ACTIVO (SIN PARPADEO) */}
                                                              {isActiveBatch && (
                                                                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded border border-emerald-700 font-bold uppercase tracking-wide shadow-sm">
                                                                      Lote Activo
                                                                  </span>
                                                              )}
                                                          </div>
                                                      )}
                                                      
                                                      {isStandardBatch && <Badge status={batchStatus} />}
                                                      
                                                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border">
                                                          Total: {batchTotal.toFixed(2)}€
                                                      </span>
                                                  </div>

                                                  <div className="flex items-center gap-2">
                                                      {/* Botones de Documentos */}
                                                      <Button size="xs" variant="outline" disabled={batch.orders.length === 0} onClick={() => generateBatchExcel(batch.id, batch.orders, club.name)}>
                                                          <FileDown className="w-3 h-3 mr-1"/> Excel
                                                      </Button>
                                                      <Button size="xs" variant="outline" disabled={batch.orders.length === 0} onClick={() => printBatchAlbaran(batch.id, batch.orders, club.name, financialConfig.clubCommissionPct)}>
                                                          <Printer className="w-3 h-3 mr-1"/> Albarán
                                                      </Button>

                                                      {/* --- NUEVOS BOTONES GLOBALES DE LOTE --- */}
                                                      {isStandardBatch && (
                                                          <>
                                                              <div className="h-6 w-px bg-gray-300 mx-1"></div>
                                                              
                                                              <button 
                                                                  onClick={() => setMoveSeasonModal({ active: true, target: { clubId: club.id, batchId: batch.id }, type: 'batch' })}
                                                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                                                                  title="Mover todo el lote de temporada"
                                                              >
                                                                  <Calendar className="w-4 h-4"/>
                                                              </button>

                                                              <button 
                                                                  onClick={() => handleDeleteGlobalBatch(club.id, batch.id)}
                                                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200"
                                                                  title="Eliminar Lote Completo"
                                                              >
                                                                  <Trash2 className="w-4 h-4"/>
                                                              </button>
                                                          </>
                                                      )}

                                                      {/* Selector de Estado */}
                                                      {isStandardBatch && (
                                                          <div className="flex items-center gap-2 ml-2 border-l pl-2 border-gray-300">
                                                              <select 
                                                                  value={batchStatus}
                                                                  onChange={(e) => updateGlobalBatchStatus(club.id, batch.id, e.target.value)}
                                                                  className="text-xs border rounded py-1 px-2 font-bold cursor-pointer bg-white"
                                                              >
                                                                  <option value="recopilando">Recopilando</option>
                                                                  <option value="en_produccion">En Producción</option>
                                                                  <option value="entregado_club">Entregado</option>
                                                              </select>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>

                                              {/* LISTA DE PEDIDOS */}
                                              {batch.orders.length === 0 ? (
                                                  <div className="pl-4 border-l-4 border-gray-200 py-4 text-gray-400 text-sm italic">
                                                      Aún no hay pedidos en este lote activo.
                                                  </div>
                                              ) : (
                                                  <div className="pl-4 border-l-4 border-gray-200 space-y-2">
                                                      {batch.orders.map(order => (
                                                          <div key={order.id} className="border rounded-lg bg-white shadow-sm overflow-hidden transition-all">
                                                              <div 
                                                                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} 
                                                                  className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 select-none"
                                                              >
                                                                  <div className="flex gap-4 items-center">
                                                                      {order.type === 'special' ? (
                                                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">ESP</span>
                                                                      ) : order.globalBatch === 'INDIVIDUAL' ? (
                                                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">IND</span>
                                                                      ) : (
                                                                          <span className="font-mono text-xs font-bold bg-gray-100 border px-1 rounded">#{order.id.slice(0,6)}</span>
                                                                      )}
                                                                      
                                                                      <span className="font-bold text-sm text-gray-800">{order.customer.name}</span>
                                                                      
                                                                      {!isStandardBatch && <Badge status={order.status} />}
                                                                  </div>
                                                                  <div className="flex gap-4 items-center text-sm">
                                                                      <span className="font-bold">{order.total.toFixed(2)}€</span>
                                                                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-90' : ''}`}/>
                                                                  </div>
                                                              </div>
                                                              
                                                              {expandedOrderId === order.id && (
                                                                  <div className="p-4 bg-gray-50 border-t border-gray-100 text-sm animate-fade-in-down">
                                                                      {!isStandardBatch && (
                                                                          <div className="mb-6 bg-white p-4 rounded-lg border-2 border-indigo-100 shadow-sm flex flex-wrap items-center gap-4">
                                                                              <div className="flex items-center gap-2 text-indigo-700">
                                                                                  <Briefcase className="w-5 h-5"/>
                                                                                  <span className="font-bold text-xs uppercase tracking-wide">Gestión Individual</span>
                                                                              </div>
                                                                              <div className="flex flex-col">
                                                                                  <label className="text-[10px] text-gray-400 font-bold uppercase mb-1">Estado</label>
                                                                                  <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value, e.target.options[e.target.selectedIndex].text)} className="text-xs border-indigo-200 rounded py-1.5 px-2 bg-indigo-50 font-medium focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                                                                                      <option value="recopilando">Recopilando</option>
                                                                                      <option value="en_produccion">En Producción</option>
                                                                                      <option value="entregado_club">Entregado</option>
                                                                                  </select>
                                                                              </div>
                                                                              <div className="h-8 w-px bg-gray-200 mx-2"></div>
                                                                              <div className="flex gap-2">
                                                                                  <Button size="sm" variant="outline" className="bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm" onClick={() => generateBatchExcel(`IND-${order.id.slice(0,6)}`, [order], club.name)}><FileDown className="w-4 h-4 mr-1"/> Excel</Button>
                                                                                  <Button size="sm" variant="outline" className="bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm" onClick={() => printBatchAlbaran(`IND-${order.id.slice(0,6)}`, [order], club.name, 0)}><Printer className="w-4 h-4 mr-1"/> Albarán</Button>
                                                                              </div>
                                                                          </div>
                                                                      )}
                                                                      <h5 className="font-bold text-gray-500 mb-3 text-xs uppercase flex items-center gap-2"><Package className="w-3 h-3"/> Productos del Pedido</h5>
                                                                      <div className="bg-white rounded border border-gray-200 divide-y divide-gray-100">
                                                                          {order.items.map(item => {
                                                                              const isIncident = order.incidents?.some(inc => inc.itemId === item.cartId && !inc.resolved);
                                                                              const itemTotal = (item.quantity || 1) * item.price;
                                                                              return (
                                                                                <div key={item.cartId || Math.random()} className="flex justify-between items-center p-3 hover:bg-gray-50">
                                                                                    <div className="flex gap-3 items-center flex-1">
                                                                                        {item.image ? <img src={item.image} className="w-10 h-10 object-cover rounded bg-gray-200 border" /> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300"><Package className="w-5 h-5"/></div>}
                                                                                        <div><p className="font-bold text-gray-800 text-sm">{item.name}</p><p className="text-xs text-gray-500">{renderProductDetails(item)}</p></div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-6 mr-4">
                                                                                        <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Cantidad</p><p className="font-medium text-sm">{item.quantity || 1} ud.</p></div>
                                                                                        <div className="text-right"><p className="text-[10px] text-gray-400 uppercase font-bold">Precio Unit.</p><p className="font-medium text-sm">{item.price.toFixed(2)}€</p></div>
                                                                                        <div className="text-right w-20"><p className="text-[10px] text-gray-400 uppercase font-bold">Subtotal</p><p className="font-bold text-emerald-600 text-sm">{itemTotal.toFixed(2)}€</p></div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3 border-l pl-4">
                                                                                        {isIncident && <span className="text-xs text-red-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Reportado</span>}
                                                                                        <button onClick={(e) => { e.stopPropagation(); handleOpenIncident(order, item); }} className="text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 p-1.5 rounded-md transition-colors flex items-center gap-1 font-medium text-xs border border-red-100 shadow-sm" title="Reportar Incidencia"><AlertTriangle className="w-4 h-4"/> Reportar Fallo</button>
                                                                                    </div>
                                                                                </div>
                                                                              );
                                                                          })}
                                                                      </div>
                                                                        {/* --- ACCIONES INDIVIDUALES (EDITAR / ELIMINAR) --- */}
                                                                        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-3 justify-end bg-gray-50/50 p-2 rounded">
                                                                            <span className="text-xs font-bold text-gray-400 uppercase self-center mr-auto">Gestión Pedido:</span>
                                                                            
                                                                            {/* Botón MODIFICAR DATOS (Nuevo) */}
                                                                            <button 
                                                                                onClick={(e) => { 
                                                                                    e.stopPropagation(); 
                                                                                    // CORRECCIÓN: Crear dos copias independientes para que la comparación funcione
                                                                                    const original = JSON.parse(JSON.stringify(order));
                                                                                    const modified = JSON.parse(JSON.stringify(order));
                                                                                    setEditOrderModal({ active: true, original, modified }); 
                                                                                }}
                                                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                                                                            >
                                                                                <Edit3 className="w-3 h-3"/> Modificar Datos
                                                                            </button>

                                                                            {/* Botón ELIMINAR (Corregido) */}
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
                                      )
                                  })}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
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
                      if (Math.abs(amount) < 0.01) return <span className="text-green-600 font-bold">Al día (0.00€)</span>;
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

                                                  <td className="px-4 py-4">
                                                      <div className="flex justify-between items-center mb-1"><span className="text-xs text-red-500 font-bold">-{bCost.toFixed(2)}€</span><button onClick={() => toggleBatchPaymentStatus(club, batch.id, 'supplierPaid')} className={`text-[10px] px-2 py-0.5 rounded border ${status.supplierPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200'}`}>{status.supplierPaid ? 'PAGADO' : 'PENDIENTE'}</button></div>
                                                      <AdjustmentInputs fieldOver="supplierOver" fieldUnder="supplierUnder" />
                                                  </td>

                                                  <td className="px-4 py-4">
                                                      <div className="flex justify-between items-center mb-1"><span className="text-xs text-blue-500 font-bold">-{bCommComm.toFixed(2)}€</span><button onClick={() => toggleBatchPaymentStatus(club, batch.id, 'commercialPaid')} className={`text-[10px] px-2 py-0.5 rounded border ${status.commercialPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200'}`}>{status.commercialPaid ? 'PAGADO' : 'PENDIENTE'}</button></div>
                                                      <AdjustmentInputs fieldOver="commercialOver" fieldUnder="commercialUnder" />
                                                  </td>

                                                  <td className="px-4 py-4">
                                                      <div className="flex justify-between items-center mb-1"><span className="text-xs text-purple-500 font-bold">-{bCommClub.toFixed(2)}€</span><button onClick={() => toggleBatchPaymentStatus(club, batch.id, 'clubPaid')} className={`text-[10px] px-2 py-0.5 rounded border ${status.clubPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200'}`}>{status.clubPaid ? 'PAGADO' : 'PENDIENTE'}</button></div>
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
      {tab === 'files' && (<div className="bg-white p-6 rounded-xl shadow h-full min-h-[500px]"><h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Folder className="w-5 h-5 text-emerald-600"/> Explorador de Archivos</h3><div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-full"><div className="border-r pr-4"><h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Clubes</h4><div className="space-y-1">{clubs.map(c => (<div key={c.id} onClick={() => { setSelectedClubFiles(c.id); setSelectedFolder(null); }} className={`p-2 rounded cursor-pointer text-sm flex items-center justify-between ${selectedClubFiles === c.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'hover:bg-gray-50'}`}>{c.name}<ChevronRight className="w-4 h-4 opacity-50"/></div>))}</div></div><div className="border-r pr-4"><h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Carpetas</h4>{!selectedClubFiles ? <p className="text-sm text-gray-400 italic">Selecciona un club</p> : <div className="space-y-1">{getClubFolders(selectedClubFiles).map(folder => (<div key={folder} onClick={() => setSelectedFolder(folder)} className={`p-2 rounded cursor-pointer text-sm flex items-center gap-2 ${selectedFolder === folder ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50'}`}><Folder className={`w-4 h-4 ${selectedFolder === folder ? 'fill-current' : ''}`}/>{folder}</div>))}</div>}</div><div className="col-span-2"><h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Archivos</h4>{!selectedFolder ? <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed rounded-lg"><CornerDownRight className="w-8 h-8 mb-2 opacity-50"/><p className="text-sm">Selecciona carpeta</p></div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{getFolderPhotos(selectedClubFiles, selectedFolder).map(photo => (<div key={photo.id} className="group relative border rounded-lg p-2 hover:shadow-md transition-shadow"><div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden"><img src={photo.url} className="w-full h-full object-cover" /></div><p className="text-xs font-medium truncate" title={photo.filename}>{photo.filename}</p></div>))}</div>}</div></div></div>)}
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
  const [products, setProducts] = useState(PRODUCTS_INITIAL);
  const [clubs, setClubs] = useState(CLUBS_MOCK);
  const [seasons, setSeasons] = useState(SEASONS_INITIAL);
  
  const [financialConfig, setFinancialConfig] = useState(FINANCIAL_CONFIG_INITIAL);
  const [modificationFee, setModificationFee] = useState(1.00);
  const [storeConfig, setStoreConfig] = useState({ isOpen: true, closedMessage: "Tienda cerrada temporalmente por mantenimiento. Disculpen las molestias." });

  useEffect(() => { const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } }; initAuth(); const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u)); return () => unsubscribe(); }, []);
  useEffect(() => { if (!user) return; const ordersQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); const unsubOrders = onSnapshot(ordersQuery, (snapshot) => { const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); ordersData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds); setOrders(ordersData); }, (err) => console.error("Error fetching orders:", err)); return () => unsubOrders(); }, [user]);

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
      // Definimos la lógica de actualización para ejecutarla después de confirmar
      const performUpdate = async () => {
          const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId && o.status !== 'pendiente_validacion'); 
          const batchLabel = newStatus === 'recopilando' ? 'Recopilando' : newStatus === 'en_produccion' ? 'En Producción' : 'Entregado al Club'; 
          
          let count = 0; 
          for (const order of batchOrders) { 
              if (order.status !== newStatus) { 
                  const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id); 
                  await updateDoc(orderRef, { status: newStatus, visibleStatus: batchLabel }); 
                  count++; 
              } 
          } 

          // Si pasamos a producción, cerramos el lote actual y abrimos el siguiente
          if (newStatus === 'en_produccion') { 
              const club = clubs.find(c => c.id === clubId); 
              if (club && club.activeGlobalOrderId === batchId) { 
                  // Incrementamos el contador global del club
                  setClubs(prevClubs => prevClubs.map(c => c.id === clubId ? { ...c, activeGlobalOrderId: c.activeGlobalOrderId + 1 } : c)); 
                  showNotification(`Lote Global enviado a Producción. Se ha abierto automáticamente el Lote #${batchId + 1} para nuevos pedidos.`, 'success'); 
              } 
          } 
          showNotification(`Se actualizaron ${count} pedidos del Lote #${batchId} a "${batchLabel}".`); 
      };

      // Si el estado es 'en_produccion', pedimos confirmación de seguridad
      if (newStatus === 'en_produccion') {
          const club = clubs.find(c => c.id === clubId);
          // Verificamos si es el lote activo para personalizar el mensaje
          if (club && club.activeGlobalOrderId === batchId) {
              setConfirmation({
                  msg: `¿Estás seguro de pasar el Lote Global #${batchId} a PRODUCCIÓN? \n\n⚠️ Esta acción cerrará el lote actual y abrirá automáticamente el Lote Global #${batchId + 1}. Los nuevos pedidos que entren se anotarán en este nuevo lote.`,
                  onConfirm: performUpdate
              });
          } else {
              // Si es un lote antiguo, solo confirmamos el cambio de estado sin aviso de cierre
              setConfirmation({
                  msg: `¿Estás seguro de cambiar el estado del Lote Global #${batchId} a PRODUCCIÓN?`,
                  onConfirm: performUpdate
              });
          }
      } else {
          // Para otros estados (recopilando/entregado), ejecutamos directamente
          await performUpdate();
      }
  };
  const incrementClubGlobalOrder = (clubId) => { const club = clubs.find(c => c.id === clubId); setConfirmation({ msg: `¿Cerrar el Pedido Global #${club.activeGlobalOrderId} para ${club.name}? Se abrirá el #${club.activeGlobalOrderId + 1}.`, onConfirm: () => { setClubs(clubs.map(c => c.id === clubId ? { ...c, activeGlobalOrderId: c.activeGlobalOrderId + 1 } : c)); showNotification(`Nuevo Pedido Global iniciado para ${club.name}`); } }); };
  const decrementClubGlobalOrder = (clubId, newActiveId) => { setClubs(clubs.map(c => c.id === clubId ? { ...c, activeGlobalOrderId: newActiveId } : c)); showNotification(`Se ha reabierto el Pedido Global #${newActiveId}`); };
  const updateProduct = (updatedProduct) => { setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p)); showNotification('Producto actualizado'); };
  const addProduct = () => { const newProduct = { id: Date.now(), name: 'Nuevo Producto', price: 10.00, cost: 5.00, category: 'General', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=300', stockType: 'internal', stock: 0, features: { name: true, number: true, photo: false, shield: true, color: false }, defaults: { name: true, number: true, photo: false, shield: true }, modifiable: { name: true, number: true, photo: false, shield: true } }; setProducts([...products, newProduct]); showNotification('Nuevo producto creado'); };
  const deleteProduct = (id) => { setConfirmation({ msg: '¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.', onConfirm: () => { setProducts(prevProducts => prevProducts.filter(p => p.id !== id)); showNotification('Producto eliminado'); } }); };
  const createClub = (newClub) => { setClubs([...clubs, { ...newClub, id: `club-${Date.now()}`, pass: 'club123', blocked: false, activeGlobalOrderId: 1 }]); showNotification('Nuevo club creado'); };
  const updateClub = (updatedClub) => { setClubs(clubs.map(c => c.id === updatedClub.id ? updatedClub : c)); showNotification('Datos del club actualizados'); };
  const deleteClub = (clubId) => { setConfirmation({ msg: '¿Seguro que quieres eliminar este club?', onConfirm: () => { setClubs(prevClubs => prevClubs.filter(c => c.id !== clubId)); showNotification('Club eliminado'); } }); }
  const toggleClubBlock = (clubId) => { const club = clubs.find(c => c.id === clubId); const newStatus = !club.blocked; setClubs(clubs.map(c => c.id === clubId ? { ...c, blocked: newStatus } : c)); showNotification(newStatus ? `Club ${club.name} bloqueado` : `Club ${club.name} desbloqueado`, newStatus ? 'error' : 'success'); };
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
  const handleLogin = (username, password) => { if (username === 'admin' && password === 'admin123') { setRole('admin'); setView('admin-dashboard'); showNotification('Bienvenido Administrador'); } else { const club = clubs.find(c => c.id === username && password === c.pass); if (club) { setRole('club'); setCurrentClub(club); setView('club-dashboard'); showNotification(`Bienvenido ${club.name}`); } else { showNotification('Credenciales incorrectas', 'error'); } } };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {!storeConfig.isOpen && <div className="bg-red-600 text-white p-3 text-center font-bold sticky top-0 z-[60] shadow-md flex items-center justify-center gap-2"><Ban className="w-5 h-5"/>{storeConfig.closedMessage}</div>}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200" style={{top: !storeConfig.isOpen ? '48px' : '0'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer" onClick={() => setView('home')}><CompanyLogo /></div>
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
        {view === 'shop' && <ShopView products={products} addToCart={addToCart} clubs={clubs} modificationFee={modificationFee} storeConfig={storeConfig} setConfirmation={setConfirmation} />}
        {view === 'cart' && <CartView cart={cart} removeFromCart={removeFromCart} createOrder={createOrder} total={cart.reduce((sum, item) => sum + item.price, 0)} clubs={clubs} storeConfig={storeConfig} />}
        {view === 'photo-search' && <PhotoSearchView clubs={clubs} />}
        {view === 'tracking' && <TrackingView orders={orders} />}
        {view === 'login' && <LoginView handleLogin={handleLogin} clubs={clubs} />}
        {view === 'order-success' && <OrderSuccessView setView={setView} />}
        {view === 'right-to-forget' && <RightToForgetView setView={setView} />}
        {view === 'club-dashboard' && role === 'club' && <ClubDashboard club={currentClub} orders={orders} updateOrderStatus={updateOrderStatus} config={financialConfig} seasons={seasons.filter(s => !s.hiddenForClubs)} />}
        {view === 'admin-dashboard' && role === 'admin' && <AdminDashboard products={products} orders={orders} clubs={clubs} updateOrderStatus={updateOrderStatus} financialConfig={financialConfig} setFinancialConfig={setFinancialConfig} updateProduct={updateProduct} addProduct={addProduct} deleteProduct={deleteProduct} createClub={createClub} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} modificationFee={modificationFee} setModificationFee={setModificationFee} seasons={seasons} addSeason={addSeason} deleteSeason={deleteSeason} toggleSeasonVisibility={toggleSeasonVisibility} storeConfig={storeConfig} setStoreConfig={setStoreConfig} incrementClubGlobalOrder={incrementClubGlobalOrder} decrementClubGlobalOrder={decrementClubGlobalOrder} updateGlobalBatchStatus={updateGlobalBatchStatus} createSpecialOrder={createSpecialOrder} addIncident={addIncident} updateIncidentStatus={updateIncidentStatus} />}
      </main>
      <footer className="bg-gray-900 text-white py-12 mt-12"><div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8"><div><div className="mb-4 text-white"><CompanyLogo className="h-8" /></div><p className="text-gray-400">Merchandising personalizado para clubes deportivos. Calidad profesional y gestión integral.</p></div><div><h3 className="text-lg font-semibold mb-4">Legal</h3><ul className="space-y-2 text-gray-400 cursor-pointer"><li>Política de Privacidad</li><li>Aviso Legal</li><li onClick={() => setView('right-to-forget')} className="hover:text-emerald-400 text-emerald-600 font-bold flex items-center gap-2"><UserX className="w-4 h-4"/> Derecho al Olvido (RGPD)</li></ul></div><div><h3 className="text-lg font-semibold mb-4">Contacto</h3><p className="text-gray-400">info@fotoesportmerch.es</p></div></div></footer>
    </div>
  );
}