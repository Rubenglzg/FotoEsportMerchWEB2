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
  Hash, Factory, MapPin, Contact, Phone
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

        // Columnas (Añadida "Detalles Extra")
        csvBody += "ID Pedido;Fecha Pedido;Cliente;Tipo Pedido;Producto;Cantidad;Precio Unit.;Subtotal;Pers. Nombre;Pers. Dorsal;Talla;Color;Detalles Extra;Estado Actual\n";

        let grandTotal = 0;

        if (orders && orders.length > 0) {
            orders.forEach(order => {
                const orderDate = order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : '-';
                
                order.items.forEach(item => {
                    const quantity = item.quantity || 1;
                    const price = item.price || 0;
                    const lineTotal = quantity * price;
                    grandTotal += lineTotal;

                    // Limpieza de datos
                    const clean = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;

                    // --- LÓGICA DE EXTRAS ---
                    let extras = [];
                    if (item.details) {
                         if (item.details.variant) extras.push(`[${item.details.variant}]`);
                         if (item.details.player2) extras.push(`J2: ${item.details.player2.name} #${item.details.player2.number}`);
                         if (item.details.player3) extras.push(`J3: ${item.details.player3.name} #${item.details.player3.number}`);
                    }
                    const extrasStr = extras.join(' | ');

                    const row = [
                        clean(order.id ? order.id.slice(0,8) : 'ID-ERROR'),
                        clean(orderDate),
                        clean(order.customer ? order.customer.name : 'Sin Nombre'),
                        clean(order.type === 'special' ? 'ESPECIAL' : 'WEB'),
                        clean(item.name),
                        quantity,
                        price.toFixed(2).replace('.', ','), 
                        lineTotal.toFixed(2).replace('.', ','),
                        clean(item.playerName),
                        clean(item.playerNumber),
                        clean(item.size),
                        clean(item.color),
                        clean(extrasStr), // <--- Nueva columna
                        clean(order.status)
                    ].join(";");
                    csvBody += row + "\n";
                });
            });
        }

        csvBody += `\n;;;;;;;TOTAL LOTE:;${grandTotal.toFixed(2).replace('.', ',')} €\n`;

        const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Lote_Global_${batchId}_${clubName ? clubName.replace(/\s+/g, '_') : 'Club'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); 

    } catch (e) {
        console.error("Error generando Excel:", e);
        alert("Hubo un error al generar el Excel. Por favor revisa la consola.");
    }
};

// --- FUNCIÓN ALBARÁN LOTE (CORREGIDA - EVITA NaN) ---
const printBatchAlbaran = (batchId, orders, clubName, commissionPct) => {
    const safeCommission = (typeof commissionPct === 'number' && !isNaN(commissionPct)) ? commissionPct : 0;
    const printWindow = window.open('', '_blank');
    const today = new Date().toLocaleDateString();
    
    const totalAmount = orders.reduce((sum, o) => sum + o.total, 0);
    const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.quantity || 1), 0), 0);
    
    const commissionAmount = totalAmount * safeCommission;
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
                @media print { body { -webkit-print-color-adjust: exact; padding: 0; } }
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
                        <th width="40%">Producto</th>
                        <th width="40%">Detalle / Personalización</th>
                        <th width="5%" class="text-right">Cant.</th>
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
                        ${order.items.map(item => {
                            // EXTRAER DATOS EXTRA PARA IMPRESIÓN
                            let extraInfo = '';
                            if (item.details) {
                                 const parts = [];
                                 if (item.details.player2) parts.push(`J2: ${item.details.player2.name} #${item.details.player2.number}`);
                                 if (item.details.player3) parts.push(`J3: ${item.details.player3.name} #${item.details.player3.number}`);
                                 if (parts.length > 0) extraInfo = parts.join(' | ');
                            }

                            return `
                            <tr>
                                <td style="padding-left: 20px;">
                                    ${item.name}
                                    ${item.details?.variant ? `<br><span style="font-size:10px;color:#059669;font-weight:bold;">[${item.details.variant}]</span>` : ''}
                                </td>
                                <td style="color: #555; font-size: 11px;">
                                    ${[
                                        item.playerName ? `Nom: ${item.playerName}` : '',
                                        item.playerNumber ? `Num: ${item.playerNumber}` : '',
                                        item.size ? `Talla: ${item.size}` : '',
                                        item.color ? `Color: ${item.color}` : '',
                                        extraInfo ? `<strong style="color:#000;">${extraInfo}</strong>` : ''
                                    ].filter(Boolean).join(' | ')}
                                </td>
                                <td class="text-right">${item.quantity || 1}</td>
                                <td class="text-right">${((item.quantity || 1) * item.price).toFixed(2)}€</td>
                            </tr>
                        `}).join('')}
                    `).join('')}
                </tbody>
            </table>

            <div class="financial-section">
                <table class="financial-table">
                    <tr>
                        <td class="f-label">Importe Total Pedido</td>
                        <td class="f-value">${totalAmount.toFixed(2)}€</td>
                    </tr>
                    <tr>
                        <td class="f-label" style="color: #dc2626;">(-) Retención / Comisión Club (${(safeCommission * 100).toFixed(0)}%)</td>
                        <td class="f-value" style="color: #dc2626;">-${commissionAmount.toFixed(2)}€</td>
                    </tr>
                    <tr class="f-row-total">
                        <td class="f-label" style="color: #065f46;">IMPORTE A COBRAR</td>
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

// --- HELPER: PLANTILLA EMAIL PREVISIÓN STOCK ---
const generateStockEmailHTML = (supplierName, batchId, clubName, productsList) => {
    const rows = productsList.map(p => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${p.size || 'Única'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${p.qty}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: sans-serif; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; }
        </style>
    </head>
    <body>
        <h2 style="color: #059669;">Previsión de Stock - ${clubName}</h2>
        <p>Buenas <strong>${supplierName}</strong>,</p>
        <p>Adjuntamos la previsión de productos necesarios para el <strong>Pedido Global #${batchId}</strong> del club <strong>${clubName}</strong>.</p>
        <p>Por favor, revisad si disponéis de stock mientras preparamos los diseños.</p>
        
        <table border="0" cellpadding="0" cellspacing="0">
            <thead>
                <tr>
                    <th width="50%">Producto</th>
                    <th width="25%" style="text-align: center;">Talla / Detalle</th>
                    <th width="25%" style="text-align: center;">Cantidad</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Este es un correo automático de previsión generado por FotoEsport Merch.
        </p>
    </body>
    </html>
    `;
};

// --- HELPER: PLANTILLA DE EMAIL (CORREGIDA CANTIDAD) ---
const generateEmailHTML = (order, newStatus, clubName) => {
    // Definir textos según estado
    const statusMessages = {
        'recopilando': 'Tu pedido ha sido validado y está en fase de recopilación.',
        'en_produccion': '¡Buenas noticias! Tu pedido ha entrado en fábrica para su producción.',
        'entregado_club': '¡Ya está aquí! Tu pedido ha llegado al club y está listo para ser recogido.',
        'pendiente_validacion': 'Tu pedido está registrado pendiente de pago/validación.'
    };

    const statusColor = {
        'recopilando': '#3b82f6', // Azul
        'en_produccion': '#9333ea', // Morado
        'entregado_club': '#10b981', // Verde
        'pendiente_validacion': '#f59e0b' // Naranja
    }[newStatus] || '#333';

    // URL DEL LOGO
    const LOGO_FULL_URL = "https://raw.githubusercontent.com/Rubenglzg/FotoEsportMerchWEB2/b740c87f99da10c1044474dbfdc8993c413347ff/public/logo.png"; 

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; border: 1px solid #e1e4e8; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            
            /* Cabecera negra compacta */
            .header { background-color: #000000; padding: 10px 0; text-align: center; border-bottom: 4px solid #10b981; }
            
            /* Logo grande */
            .logo-img { height: 150px; width: auto; display: block; margin: 0 auto; }
            
            .content { padding: 40px 30px; background-color: #ffffff; }
            .status-badge { 
                background-color: ${statusColor}; color: white; padding: 12px 24px; 
                border-radius: 50px; display: inline-block; font-weight: bold; margin: 25px 0;
                font-size: 16px; letter-spacing: 0.5px; text-transform: uppercase;
            }
            .order-details { width: 100%; border-collapse: collapse; margin-top: 25px; background-color: #f9fafb; border-radius: 8px; overflow: hidden; }
            .order-details th { text-align: left; background-color: #f3f4f6; padding: 12px 15px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
            .order-details td { border-bottom: 1px solid #e5e7eb; padding: 12px 15px; font-size: 14px; vertical-align: top; }
            .item-meta { display: block; color: #555; font-size: 13px; margin-top: 4px; line-height: 1.4; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${LOGO_FULL_URL}" alt="FotoEsport Merch" class="logo-img" />
            </div>
            <div class="content">
                <h2 style="color: #111827; margin-top: 0;">Hola, ${order.customer.name}</h2>
                <p style="color: #4b5563;">Te informamos que el estado de tu pedido para el club <strong>${clubName}</strong> ha cambiado.</p>
                
                <div style="text-align: center;">
                    <div class="status-badge">
                        ${newStatus.replace(/_/g, ' ')}
                    </div>
                </div>
                
                <p style="text-align: center; color: #374151; font-weight: 500;">${statusMessages[newStatus] || 'Estado actualizado.'}</p>

                <h3 style="margin-top: 30px; font-size: 16px; color: #111827;">Resumen del Pedido #${order.id.slice(0, 6)}</h3>
                <table class="order-details">
                    <thead>
                        <tr>
                            <th width="40%">Producto</th>
                            <th width="45%">Detalles</th>
                            <th width="15%" style="text-align:right;">Cant.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => {
                            // Obtener nombre del color
                            const colorObj = AVAILABLE_COLORS.find(c => c.id === item.color);
                            const colorName = colorObj ? colorObj.label : item.color;
                            
                            // Lista de detalles
                            const detailsList = [
                                item.playerName ? `Nombre: <strong>${item.playerName}</strong>` : null,
                                item.playerNumber ? `Dorsal: <strong>${item.playerNumber}</strong>` : null,
                                item.size ? `Talla: <strong>${item.size}</strong>` : null,
                                item.color ? `Color: <strong>${colorName}</strong>` : null
                            ].filter(Boolean).join(', ');

                            return `
                            <tr>
                                <td style="font-weight: 600; color: #111;">${item.name}</td>
                                <td>
                                    <span class="item-meta">
                                        ${detailsList || '-'}
                                    </span>
                                </td>
                                <td style="text-align:right; font-weight: bold;">${item.quantity || 1}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; text-align: right; padding-right: 15px;">
                    <p style="font-size: 18px; color: #10b981; font-weight: bold; margin: 0;">Total: ${order.total.toFixed(2)}€</p>
                    <p style="font-size: 15px; color: #4b5563; font-weight: bold; margin: 8px 0 0;">
                        Lote Global: #${order.globalBatch || 1}
                    </p>
                </div>

                <div style="margin-top: 30px; padding: 15px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 13px; display: flex; align-items: start; gap: 10px;">
                    <span>ℹ️</span>
                    <span>Si tienes alguna duda sobre la entrega o los plazos, por favor contacta directamente con los responsables de <strong>${clubName}</strong>.</span>
                </div>
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} FotoEsport Merch - Gestión Integral de Clubes</p>
                <p>Mensaje automático. Por favor, no respondas a este correo.</p>
            </div>
        </div>
    </body>
    </html>
    `;
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

// --- COMPONENTE AUXILIAR: INPUT CON GUARDADO AL SALIR (Para evitar cortes al escribir) ---
const DelayedInput = ({ value, onSave, className, placeholder, type = "text" }) => {
    const [localValue, setLocalValue] = useState(value || '');

    // Sincronizar estado local si el valor externo cambia (ej. al cargar)
    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    return (
        <input 
            type={type}
            placeholder={placeholder}
            className={className}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => onSave(localValue)} // Guarda solo al perder el foco (salir del input)
        />
    );
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
    // 1. AÑADIDO: cashPaymentEnabled al estado (por defecto true si no existe)
    const [editData, setEditData] = useState({ 
        name: club.name, 
        pass: club.pass, 
        username: club.username || '', 
        color: club.color || 'white',
        commission: club.commission || 0.12,
        cashPaymentEnabled: club.cashPaymentEnabled !== false // true por defecto
    });
    const [showPass, setShowPass] = useState(false);
    const [newLogo, setNewLogo] = useState(null); 

    const handleSave = () => { 
        // 2. AÑADIDO: Se pasa cashPaymentEnabled al actualizar
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
                     <div className="flex gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Comisión Venta</label>
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded border">
                                <input type="number" step="1" className="w-12 bg-transparent text-right text-sm font-bold outline-none" value={(editData.commission * 100).toFixed(0)} onChange={e => setEditData({...editData, commission: parseFloat(e.target.value) / 100})} />
                                <span className="text-xs font-bold">%</span>
                            </div>
                        </div>
                        
                        {/* 3. AÑADIDO: Checkbox Efectivo */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Métodos Pago</label>
                            <label className={`flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer transition-colors ${editData.cashPaymentEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <input 
                                    type="checkbox" 
                                    className="accent-green-600 w-4 h-4"
                                    checked={editData.cashPaymentEnabled} 
                                    onChange={e => setEditData({...editData, cashPaymentEnabled: e.target.checked})} 
                                />
                                <span className="text-xs font-bold flex items-center gap-1">
                                    <Banknote className="w-3.5 h-3.5"/> Efectivo
                                </span>
                            </label>
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

    // 4. AÑADIDO: Indicador visual en modo "Ver"
    return (
        <div className={`flex justify-between items-center p-4 rounded-xl border mb-3 transition-all group ${club.blocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md'}`}>
            <div className="flex items-center gap-5">
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
                         {/* Indicador de efectivo */}
                         {club.cashPaymentEnabled === false && (
                             <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded font-bold" title="Pago en efectivo desactivado">
                                 <Ban className="w-3 h-3"/> No Efectivo
                             </span>
                         )}
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

const ProductEditorRow = ({ product, updateProduct, deleteProduct, suppliers }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // --- ESTADO LOCAL PARA TALLAS (Solución comas) ---
    const [localSizeInput, setLocalSizeInput] = useState(product.sizes ? product.sizes.join(', ') : '');

    // Sincronizar estado local si viene de fuera (pero no mientras editamos)
    useEffect(() => {
        if (!isExpanded) { 
             setLocalSizeInput(product.sizes ? product.sizes.join(', ') : '');
        }
    }, [product.sizes, isExpanded]);

    // Guardar tallas solo al salir del input (onBlur)
    const handleSizeBlur = () => {
        const newSizes = localSizeInput.split(',')
            .map(s => s.trim())
            .filter(s => s !== ''); 
        updateProduct({ ...product, sizes: newSizes });
    };
    // ------------------------------------------------

    const features = product.features || { name: true, number: true, photo: true, shield: true, size: true, color: true };
    const defaults = product.defaults || { name: false, number: false, photo: false, shield: true };
    const modifiable = product.modifiable || { name: true, number: true, photo: true, shield: true };
    const variants = product.variants || [];

    // --- FUNCIONES DE TOGGLES ---
    const toggleFeature = (key) => {
        const newValue = !features[key];
        let newFeatures = { ...features, [key]: newValue };
        let newDefaults = { ...defaults };
        let newModifiable = { ...modifiable };

        // Si activamos FOTO, forzamos default=true y modifiable=false
        if (key === 'photo' && newValue === true) {
            newDefaults.photo = true;      
            newModifiable.photo = false;   
        }

        updateProduct({ 
            ...product, 
            features: newFeatures,
            defaults: newDefaults,
            modifiable: newModifiable
        });
    };

    const toggleDefault = (key) => updateProduct({ ...product, defaults: { ...defaults, [key]: !defaults[key] } });
    const toggleModifiable = (key) => updateProduct({ ...product, modifiable: { ...modifiable, [key]: !modifiable[key] } });

    // --- FUNCIONES DE VARIANTES (Restauradas) ---
    const addVariant = () => {
        const newVariants = [...variants, { id: Date.now(), name: '', priceMod: 0, image: '' }];
        updateProduct({ ...product, variants: newVariants });
    };
    const updateVariant = (id, field, value) => {
        const newVariants = variants.map(v => v.id === id ? { ...v, [field]: value } : v);
        updateProduct({ ...product, variants: newVariants });
    };
    const deleteVariant = (id) => {
        const newVariants = variants.filter(v => v.id !== id);
        updateProduct({ ...product, variants: newVariants });
    };

    const currentSupplier = suppliers ? suppliers.find(s => s.id === product.supplierId) : null;

    return (
        <div className={`bg-white rounded-xl transition-all duration-300 overflow-hidden group mb-3 ${isExpanded ? 'border-2 border-emerald-500 shadow-xl ring-4 ring-emerald-50/50 z-10 transform scale-[1.01]' : 'border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md'}`}>
            
            {/* CABECERA RESUMEN */}
            <div className="p-4 flex items-center gap-5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="relative w-14 h-14 shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                    {product.image ? (
                        <img src={product.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="w-6 h-6 opacity-50"/></div>
                    )}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-base truncate mb-1 group-hover:text-emerald-700 transition-colors">
                        {product.name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold">
                            PVP: {product.price.toFixed(2)}€
                        </span>
                        {product.sizes && product.sizes.length > 0 && (
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-medium">
                                {product.sizes.length} Tallas
                            </span>
                        )}
                        {variants.length > 0 && (
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-medium">
                                {variants.length} Tipos
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
                    <button className={`p-2 rounded-lg transition-all ${isExpanded ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                        {isExpanded ? <ChevronRight className="w-5 h-5 rotate-90"/> : <Settings className="w-5 h-5"/>}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }} className="p-2 rounded-lg bg-white border border-transparent text-gray-300 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors">
                        <Trash2 className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            {/* 2. PANEL EXPANDIDO (CONFIGURACIÓN) */}
            {isExpanded && (
                <div className="bg-gray-50/80 border-t border-gray-100 p-6 animate-fade-in-down">
                    
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                        
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
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className={`w-full border rounded-lg py-2 pl-3 pr-8 text-sm font-bold outline-none ${currentSupplier ? 'bg-indigo-50 border-indigo-200 text-indigo-700 cursor-not-allowed' : 'bg-gray-50 border-gray-200 text-gray-600 focus:ring-2 focus:ring-gray-200'}`}
                                                value={product.cost} 
                                                onChange={e => !currentSupplier && updateProduct({...product, cost: parseFloat(e.target.value)})}
                                                readOnly={!!currentSupplier}
                                            />
                                            <span className="absolute right-3 top-2 text-gray-400 text-xs font-bold">€</span>
                                        </div>
                                        {currentSupplier && <p className="text-[9px] text-indigo-500 mt-1 flex items-center gap-1"><Lock className="w-3 h-3"/> Gestionado por proveedor</p>}
                                    </div>
                                </div>

                                {/* SELECTOR PROVEEDOR */}
                                <div className="pt-2 border-t border-gray-100">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Proveedor Asignado</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none appearance-none"
                                            value={product.supplierId || ''}
                                            onChange={(e) => {
                                                const supId = e.target.value;
                                                let newCost = product.cost;
                                                if (supId) {
                                                    const s = suppliers.find(su => su.id === supId);
                                                    if (s && s.priceList && s.priceList[product.id]) {
                                                        newCost = s.priceList[product.id];
                                                    }
                                                }
                                                updateProduct({...product, supplierId: supId, cost: newCost});
                                            }}
                                        >
                                            <option value="">-- Sin asignar (Coste manual) --</option>
                                            {suppliers && suppliers.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        <Truck className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- SECCIÓN NUEVA: VARIANTES / TIPOS --- */}
                    <div className="bg-blue-50/50 rounded-xl border border-blue-100 overflow-hidden shadow-sm mt-6 mb-6">
                        <div className="bg-blue-100 px-6 py-3 border-b border-blue-200 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-blue-800 uppercase flex items-center gap-2">
                                <Layers className="w-4 h-4"/> Variantes Visuales (Calendarios / Fotos)
                            </h4>
                            <button onClick={addVariant} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 font-bold flex items-center gap-1">
                                <Plus className="w-3 h-3"/> Añadir Opción
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {variants.length === 0 && <p className="text-xs text-gray-400 italic text-center">Sin variantes (Producto único). Añade "Doble", "Triple" o "Equipo" aquí.</p>}
                            {variants.map((variant, idx) => (
                                <div key={variant.id} className="flex gap-3 items-center bg-white p-3 rounded border border-blue-100">
                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center shrink-0 overflow-hidden border">
                                        {variant.image ? <img src={variant.image} className="w-full h-full object-cover"/> : <ImageIcon className="w-4 h-4 text-gray-300"/>}
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Nombre Opción</label>
                                        <input 
                                            placeholder="Ej. Calendario Doble"
                                            className="w-full text-sm font-bold border-b border-gray-200 outline-none focus:border-blue-500 bg-transparent"
                                            value={variant.name}
                                            onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Extra Precio</label>
                                        <div className="relative">
                                            <input 
                                                type="number" step="0.50"
                                                className="w-full text-sm font-bold border rounded p-1 text-right pr-4 outline-none focus:border-blue-500"
                                                value={variant.priceMod}
                                                onChange={(e) => updateVariant(variant.id, 'priceMod', parseFloat(e.target.value))}
                                            />
                                            <span className="absolute right-1 top-1 text-xs text-gray-400">€</span>
                                        </div>
                                    </div>
                                    
                                    <label className="cursor-pointer p-2 bg-gray-50 rounded hover:bg-gray-100 text-gray-500" title="Subir foto para esta opción">
                                        <Upload className="w-4 h-4"/>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                             /* Nota: Idealmente subir a Firebase aquí, por simplicidad usamos URL local temporal para preview 
                                                En producción real: subir fichero y guardar URL igual que product.image */
                                             const file = e.target.files[0];
                                             if(file) {
                                                // Simulación subida rápida (En real pasar callback para subir)
                                                 const reader = new FileReader();
                                                 reader.onload = (ev) => updateVariant(variant.id, 'image', ev.target.result); // Base64 temp
                                                 reader.readAsDataURL(file);
                                             }
                                        }}/>
                                    </label>

                                    <button onClick={() => deleteVariant(variant.id)} className="p-2 text-red-400 hover:bg-red-50 rounded">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* --- REGLAS DE PERSONALIZACIÓN ACTUALIZADAS --- */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-6">
                        <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                                <Settings className="w-4 h-4"/> Opciones y Personalización
                            </h4>
                            <div className="flex gap-8 text-[9px] font-bold uppercase text-gray-400 pr-2">
                                <span className="w-12 text-center">Activo</span>
                                <span className="w-12 text-center">Default</span>
                                <span className="w-12 text-center">Lock</span>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-50 p-4">
                            
                            {/* 1. TALLA (INPUT MEJORADO CON onBlur) */}
                            <div className="flex flex-col gap-2 py-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${features.size ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><Hash className="w-5 h-5"/></div>
                                        <span className="text-sm font-bold text-gray-700">Talla</span>
                                    </div>
                                    <div className="flex gap-8 pr-2 items-center">
                                        <div className="w-12 flex justify-center"><input type="checkbox" checked={features.size} onChange={() => toggleFeature('size')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                        <div className="w-12 flex justify-center opacity-20"><input type="checkbox" disabled checked={true}/></div>
                                        <div className="w-12 flex justify-center opacity-20"><Lock className="w-4 h-4 text-gray-300"/></div>
                                    </div>
                                </div>
                                {features.size && (
                                    <div className="ml-12 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in">
                                        <label className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Lista de Tallas (Separadas por comas)</label>
                                        {/* Aquí usamos localSizeInput para permitir escribir libremente */}
                                        <input 
                                            type="text" 
                                            className="w-full border border-blue-200 rounded p-2 text-xs bg-white focus:ring-2 focus:ring-blue-200 outline-none font-medium text-gray-700" 
                                            placeholder="Ej: S, M, L, XL, XXL (o dejar vacío para texto libre)" 
                                            value={localSizeInput} 
                                            onChange={(e) => setLocalSizeInput(e.target.value)} 
                                            onBlur={handleSizeBlur}
                                        />
                                        <p className="text-[9px] text-blue-400 mt-1">Escribe tallas separadas por comas. Se guardarán al salir del campo.</p>
                                    </div>
                                )}
                            </div>

                            {/* 2. NOMBRE */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.name ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><FileText className="w-5 h-5"/></div>
                                    <span className="text-sm font-bold text-gray-700">Nombre Jugador</span>
                                </div>
                                <div className="flex gap-8 pr-2 items-center">
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={features.name} onChange={() => toggleFeature('name')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={defaults.name} onChange={() => toggleDefault('name')} disabled={!features.name} className="rounded text-blue-600 cursor-pointer disabled:opacity-30"/></div>
                                    <div className="w-12 flex justify-center"><button onClick={() => toggleModifiable('name')} disabled={!features.name}>{modifiable.name ? <Unlock className="w-4 h-4 text-emerald-500"/> : <Lock className="w-4 h-4 text-red-500"/>}</button></div>
                                </div>
                            </div>

                            {/* 3. DORSAL */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.number ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><Hash className="w-5 h-5"/></div>
                                    <span className="text-sm font-bold text-gray-700">Dorsal</span>
                                </div>
                                <div className="flex gap-8 pr-2 items-center">
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={features.number} onChange={() => toggleFeature('number')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={defaults.number} onChange={() => toggleDefault('number')} disabled={!features.number} className="rounded text-blue-600 cursor-pointer disabled:opacity-30"/></div>
                                    <div className="w-12 flex justify-center"><button onClick={() => toggleModifiable('number')} disabled={!features.number}>{modifiable.number ? <Unlock className="w-4 h-4 text-emerald-500"/> : <Lock className="w-4 h-4 text-red-500"/>}</button></div>
                                </div>
                            </div>

                            {/* 4. ESCUDO */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.shield ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><ShieldCheck className="w-5 h-5"/></div>
                                    <span className="text-sm font-bold text-gray-700">Escudo</span>
                                </div>
                                <div className="flex gap-8 pr-2 items-center">
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={features.shield} onChange={() => toggleFeature('shield')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={defaults.shield} onChange={() => toggleDefault('shield')} disabled={!features.shield} className="rounded text-blue-600 cursor-pointer disabled:opacity-30"/></div>
                                    <div className="w-12 flex justify-center"><button onClick={() => toggleModifiable('shield')} disabled={!features.shield}>{modifiable.shield ? <Unlock className="w-4 h-4 text-emerald-500"/> : <Lock className="w-4 h-4 text-red-500"/>}</button></div>
                                </div>
                            </div>

                            {/* 5. FOTO */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${features.photo ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}><ImageIcon className="w-5 h-5"/></div>
                                    <div>
                                        <span className="text-sm font-bold text-gray-700 block">Foto Personal</span>
                                        <span className="text-[9px] text-gray-400">Si se activa, es obligatoria.</span>
                                    </div>
                                </div>
                                <div className="flex gap-8 pr-2 items-center">
                                    <div className="w-12 flex justify-center"><input type="checkbox" checked={features.photo} onChange={() => toggleFeature('photo')} className="rounded text-emerald-600 cursor-pointer"/></div>
                                    <div className="w-12 flex justify-center">
                                        <input type="checkbox" checked={features.photo ? true : defaults.photo} disabled className="rounded text-blue-600 opacity-50 cursor-not-allowed"/>
                                    </div>
                                    <div className="w-12 flex justify-center">
                                        <button disabled className="opacity-50 cursor-not-allowed">
                                            {features.photo ? <Lock className="w-4 h-4 text-red-500"/> : <Unlock className="w-4 h-4 text-gray-300"/>}
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
  const variants = product.variants || []; 
  const sizeOptions = product.sizes && product.sizes.length > 0 ? product.sizes : null;

  const [clubInput, setClubInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [showClubSuggestions, setShowClubSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Inicialización correcta de estados basada en defaults
  const [customization, setCustomization] = useState({ 
      clubId: '', 
      category: '', 
      playerName: '', 
      playerNumber: '', 
      playerName2: '',
      playerNumber2: '', 
      playerName3: '',
      playerNumber3: '',
      color: 'white',
      size: sizeOptions ? sizeOptions[0] : '', 
      selectedPhoto: '',
      // Si el default es undefined, asumimos false para ser seguros, excepto shield que suele ser true
      includeName: defaults.name ?? false, 
      includeNumber: defaults.number ?? false, 
      includePhoto: defaults.photo ?? false, 
      includeShield: defaults.shield ?? true,
      selectedVariantId: null 
  });

  const [quantity, setQuantity] = useState(1);

  const isPhotoProduct = product.name.toLowerCase().includes('foto');
  const isCalendarProduct = product.name.toLowerCase().includes('calendario');
  const activeVariant = variants.find(v => v.id === customization.selectedVariantId);
  const isDouble = activeVariant && activeVariant.name.toLowerCase().includes('doble');
  const isTriple = activeVariant && activeVariant.name.toLowerCase().includes('triple');
  const isTeamPhoto = isPhotoProduct && activeVariant && activeVariant.name.toLowerCase().includes('equipo');

  // ... (Efectos de categorías y sugerencias se mantienen igual) ...
  useEffect(() => {
        const fetchCategories = async () => {
            if (customization.clubId) {
                try {
                    const club = clubs.find(c => c.id === customization.clubId);
                    if (club) {
                        const clubRef = ref(storage, club.name);
                        const res = await listAll(clubRef);
                        setAvailableCategories(res.prefixes.map(p => p.name));
                    }
                } catch (error) {
                    setAvailableCategories([]);
                }
            } else { setAvailableCategories([]); }
        };
        fetchCategories();
    }, [customization.clubId, clubs]);

  const clubSuggestions = useMemo(() => {
      if (clubInput.length < 2) return [];
      return clubs.filter(c => c.name.toLowerCase().includes(clubInput.toLowerCase()));
  }, [clubInput, clubs]);

  const categorySuggestions = useMemo(() => {
      if (categoryInput.length < 2) return [];
      return availableCategories.filter(c => c.toLowerCase().includes(categoryInput.toLowerCase()));
  }, [categoryInput, availableCategories]);

  const handleSelectClub = (club) => {
      setCustomization({ ...customization, clubId: club.id, category: '', color: club.color || 'white' });
      setClubInput(club.name); setCategoryInput(''); setShowClubSuggestions(false);
  };

    // --- LÓGICA DE COBRO ACTUALIZADA: Cualquier diferencia con el default se cobra ---
    const modificationCount = useMemo(() => {
        let count = 0;
        const checkExtra = (key) => {
            if (!features[key]) return false; // Si no existe, no cuenta
            if (!modifiable[key]) return false; // Si no se puede tocar, no cuenta
            
            // Valores actuales (seleccionados por usuario)
            const isSelected = customization[`include${key.charAt(0).toUpperCase() + key.slice(1)}`];
            // Valores por defecto (del producto)
            const isDefault = !!defaults[key];

            // SI HAY DIFERENCIA, HAY COBRO.
            // Caso 1: Default OFF, Usuario ON -> Cobra
            // Caso 2: Default ON, Usuario OFF -> Cobra
            if (isSelected !== isDefault) {
                return true;
            }
            return false;
        };
        
        if (checkExtra('name')) count++;
        if (checkExtra('number')) count++;
        if (checkExtra('shield')) count++;
        
        return count;
    }, [customization, defaults, features, modifiable]);

    const isModified = modificationCount > 0;
    const variantPrice = activeVariant ? (activeVariant.priceMod || 0) : 0;
    const unitPrice = product.price + variantPrice + (modificationCount * (modificationFee || 0));
    const totalPrice = unitPrice * quantity;
  
  const handleSubmit = (e) => { 
      e.preventDefault(); 
      if (!storeConfig.isOpen) return; 
      if (!customization.clubId) { alert("Debes seleccionar un club."); return; }
      
      if (!isTeamPhoto) {
          if (customization.includeName && !customization.playerName) { alert("El nombre es obligatorio."); return; }
          if (customization.includeNumber && !customization.playerNumber) { alert("El dorsal es obligatorio."); return; }
      }
      if (features.size && !customization.size) { alert("Debes seleccionar una talla."); return; }
      if ((isDouble || isTriple) && (!customization.playerName2 || !customization.playerNumber2)) { alert("Datos del J2 obligatorios."); return; }
      if (isTriple && (!customization.playerName3 || !customization.playerNumber3)) { alert("Datos del J3 obligatorios."); return; }

      let extendedName = product.name;
      if (activeVariant) extendedName += ` (${activeVariant.name})`;
      
      let fullDetails = `Jugador 1: ${customization.playerName} #${customization.playerNumber}`;
      if(isDouble || isTriple) fullDetails += ` | J2: ${customization.playerName2} #${customization.playerNumber2}`;
      if(isTriple) fullDetails += ` | J3: ${customization.playerName3} #${customization.playerNumber3}`;
      if(isTeamPhoto) fullDetails = "Foto de Equipo";
      if(features.size) fullDetails += ` | Talla: ${customization.size}`;

      let confirmMsg = `Producto: ${extendedName}\nCantidad: ${quantity}\nClub: ${clubInput}\n${fullDetails}`;
      if (modificationCount > 0) confirmMsg += `\n\n(Incluye ${modificationCount} modificación/es)`;

      setConfirmation({
          msg: confirmMsg,
          onConfirm: () => {
              const finalItem = {
                  ...product,
                  name: extendedName,
                  playerName: isTeamPhoto ? '' : customization.playerName,
                  playerNumber: isTeamPhoto ? '' : customization.playerNumber,
                  quantity: quantity, 
                  size: customization.size,
                  details: {
                      player2: (isDouble || isTriple) ? { name: customization.playerName2, number: customization.playerNumber2 } : null,
                      player3: (isTriple) ? { name: customization.playerName3, number: customization.playerNumber3 } : null,
                      variant: activeVariant ? activeVariant.name : 'Standard'
                  }
              };
              onAdd(finalItem, customization, unitPrice); 
              onBack(); 
          }
      });
  };

  const displayImage = (activeVariant && activeVariant.image) ? activeVariant.image : product.image;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row">
      <div className="md:w-1/2 bg-gray-100 p-8 flex items-center justify-center relative">
          <img src={displayImage} className="max-w-full h-auto rounded-lg shadow-md" />
      </div>
      <div className="md:w-1/2 p-8 overflow-y-auto max-h-[90vh]">
        <button onClick={onBack} className="text-gray-500 mb-4 hover:text-gray-700 flex items-center gap-1"><ChevronLeft className="rotate-180 w-4 h-4" /> Volver</button>
        <h2 className="text-2xl font-bold mb-2">Personalizar {product.name}</h2>
        
        <div className="flex items-end gap-2 mb-6">
            <p className="text-emerald-600 font-bold text-3xl">{unitPrice.toFixed(2)}€</p>
            <span className="text-gray-400 text-sm mb-1">/ unidad</span>
            {modificationCount > 0 && (
                <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded mb-1 font-bold">
                   +{modificationCount} Modificación/es (+{modificationCount * modificationFee}€)
                </span>
            )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {(variants.length > 0 || isPhotoProduct || isCalendarProduct) && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-bold text-blue-800 mb-2 uppercase">Tipo</label>
                  <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setCustomization({...customization, selectedVariantId: null})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${!customization.selectedVariantId ? 'bg-blue-600 text-white' : 'bg-white'}`}>Estándar</button>
                      {variants.map(v => (
                          <button key={v.id} type="button" onClick={() => setCustomization({...customization, selectedVariantId: v.id})} className={`px-4 py-2 rounded-lg text-sm font-bold border ${customization.selectedVariantId === v.id ? 'bg-blue-600 text-white' : 'bg-white'}`}>{v.name}</button>
                      ))}
                  </div>
              </div>
          )}

          <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Club <span className="text-red-500">*</span></label>
              <Input placeholder="Buscar club..." value={clubInput} onChange={e => { setClubInput(e.target.value); setCustomization({...customization, clubId: ''}); setShowClubSuggestions(true); }} onFocus={() => setShowClubSuggestions(true)} onBlur={() => setTimeout(() => setShowClubSuggestions(false), 200)} />
              {showClubSuggestions && clubSuggestions.length > 0 && (
                  <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {clubSuggestions.map(c => <div key={c.id} onClick={() => handleSelectClub(c)} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer">{c.name}</div>)}
                  </div>
              )}
          </div>

          {customization.clubId && (
                <div className="relative animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                    <Input placeholder="Buscar categoría..." value={categoryInput} onChange={e => { setCategoryInput(e.target.value); setCustomization({...customization, category: ''}); setShowCategorySuggestions(true); }} onFocus={() => setShowCategorySuggestions(true)} onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)} />
                    {showCategorySuggestions && categorySuggestions.length > 0 && (
                        <div className="absolute top-full w-full bg-white border rounded-b-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                            {categorySuggestions.map(cat => <div key={cat} onClick={() => { setCustomization({ ...customization, category: cat }); setCategoryInput(cat); setShowCategorySuggestions(false); }} className="px-4 py-3 hover:bg-emerald-50 cursor-pointer">{cat}</div>)}
                        </div>
                    )}
                </div>
            )}

            {features.size && (
                <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Talla <span className="text-red-500">*</span></label>
                    {sizeOptions ? (
                        <select className="w-full px-3 py-2 border rounded-md bg-white" value={customization.size} onChange={(e) => setCustomization({...customization, size: e.target.value})}>
                            <option value="">-- Selecciona Talla --</option>
                            {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    ) : (
                        <Input placeholder="Tu talla..." value={customization.size} onChange={e => setCustomization({...customization, size: e.target.value})}/>
                    )}
                </div>
            )}

          {!isTeamPhoto && (
              <div className="space-y-4 border-t pt-4 border-gray-100">
                  <h4 className="font-bold text-gray-600 text-xs uppercase">Datos Personalización</h4>
                  <div className="flex gap-4 flex-wrap">
                      {features.name && modifiable.name && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includeName} onChange={e => setCustomization({...customization, includeName: e.target.checked})}/>
                              <span className="text-sm">Incluir Nombre</span>
                              {customization.includeName !== !!defaults.name && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                      {features.number && modifiable.number && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includeNumber} onChange={e => setCustomization({...customization, includeNumber: e.target.checked})}/>
                              <span className="text-sm">Incluir Dorsal</span>
                              {customization.includeNumber !== !!defaults.number && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                      {features.shield && modifiable.shield && (
                          <label className="flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg hover:bg-gray-50">
                              <input type="checkbox" className="accent-emerald-600" checked={customization.includeShield} onChange={e => setCustomization({...customization, includeShield: e.target.checked})}/>
                              <span className="text-sm">Incluir Escudo</span>
                              {customization.includeShield !== !!defaults.shield && <span className="text-xs text-orange-500 font-bold ml-1">(Modificado)</span>}
                          </label>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {features.name && (
                        <div className={!customization.includeName ? 'opacity-30 pointer-events-none' : ''}>
                            <label className="text-sm font-medium mb-1 block">Nombre</label>
                            <Input value={customization.playerName} onChange={e => setCustomization({...customization, playerName: e.target.value})}/>
                        </div>
                    )}
                    {features.number && (
                        <div className={!customization.includeNumber ? 'opacity-30 pointer-events-none' : ''}>
                            <label className="text-sm font-medium mb-1 block">Dorsal</label>
                            <Input type="number" value={customization.playerNumber} onChange={e => setCustomization({...customization, playerNumber: e.target.value})}/>
                        </div>
                    )}
                  </div>
              </div>
          )}

          {(isDouble || isTriple) && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-800 text-xs uppercase mb-3">Datos Jugador 2</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="Nombre J2" value={customization.playerName2} onChange={e => setCustomization({...customization, playerName2: e.target.value})}/>
                      <Input placeholder="Dorsal J2" type="number" value={customization.playerNumber2} onChange={e => setCustomization({...customization, playerNumber2: e.target.value})}/>
                  </div>
              </div>
          )}
          {isTriple && (
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                   <h4 className="font-bold text-purple-800 text-xs uppercase mb-3">Datos Jugador 3</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <Input placeholder="Nombre J3" value={customization.playerName3} onChange={e => setCustomization({...customization, playerName3: e.target.value})}/>
                      <Input placeholder="Dorsal J3" type="number" value={customization.playerNumber3} onChange={e => setCustomization({...customization, playerNumber3: e.target.value})}/>
                  </div>
              </div>
          )}
          
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border mt-6">
              <label className="font-bold text-gray-700 text-sm">CANTIDAD:</label>
              <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full bg-white border font-bold">-</button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full bg-white border font-bold">+</button>
              </div>
          </div>

          <div className="pt-2 border-t">
              <Button type="submit" disabled={!storeConfig.isOpen} className="w-full py-4 text-lg">
                  {storeConfig.isOpen ? `Añadir al Carrito (${totalPrice.toFixed(2)}€)` : 'TIENDA CERRADA'}
              </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CartView({ cart, removeFromCart, createOrder, total, clubs, storeConfig }) {
  const [formData, setFormData] = useState({ 
      name: '', 
      email: '', 
      phone: '', 
      notification: 'email', 
      rgpd: false,
      marketingConsent: false 
  });
  const [paymentMethod, setPaymentMethod] = useState('card');

  // --- 1. LÓGICA DE DETECCIÓN DEL CLUB Y PERMISOS DE PAGO ---
  // Obtenemos el club del carrito (asumiendo que todos los items son del mismo club o usamos el primero)
  const currentClubId = cart.length > 0 ? cart[0].clubId : null;
  const currentClub = clubs.find(c => c.id === currentClubId);
  
  // Si no está definido (legacy), asumimos que sí se permite (true)
  const isCashEnabled = currentClub ? (currentClub.cashPaymentEnabled !== false) : true;

  // Si el usuario tenía seleccionado Efectivo pero el club lo prohíbe, cambiar a tarjeta automáticamente
  useEffect(() => {
      if (!isCashEnabled && paymentMethod === 'cash') {
          setPaymentMethod('card');
      }
  }, [isCashEnabled, paymentMethod]);
  // ------------------------------------------------------------

  const handleSubmit = (e) => { 
      e.preventDefault(); 
      createOrder({ 
          items: cart, 
          customer: formData, 
          total: total, 
          paymentMethod, 
          clubId: cart[0]?.clubId || 'generic', 
          clubName: clubs.find(c => c.id === (cart[0]?.clubId))?.name || 'Club Generico' 
      }); 
  };

  if (cart.length === 0) return <div className="text-center py-20 text-gray-500 font-bold text-xl flex flex-col items-center"><ShoppingCart className="w-16 h-16 mb-4 text-gray-300"/>Tu carrito está vacío</div>;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ... (La columna de items del carrito se queda igual) ... */}
      <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold mb-4">Resumen</h2>
            {cart.map((item, index) => (
                <div key={item.cartId || index} className="flex gap-4 mb-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0 relative">
                        <img src={item.image} className="w-full h-full object-cover" alt="" />
                        {item.quantity > 1 && (
                            <div className="absolute bottom-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tl-lg">
                                x{item.quantity}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-gray-800 text-sm truncate pr-2" title={item.name}>
                                {item.name}
                            </h4>
                            <p className="font-bold text-emerald-600 text-sm whitespace-nowrap">
                                {(item.price * (item.quantity || 1)).toFixed(2)}€
                            </p>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                            <span className="font-semibold">{item.clubName || 'Club'}</span>
                            {item.category && <span className="opacity-75"> | {item.category}</span>}
                            {item.playerName && <div className="text-gray-500">J1: {item.playerName} <strong className="text-gray-700">#{item.playerNumber}</strong></div>}
                        </div>
                        {item.details && (item.details.player2 || item.details.player3 || item.details.variant !== 'Standard') && (
                            <div className="bg-slate-50 border border-slate-100 rounded p-2 text-[10px] space-y-1 mt-1.5">
                                {item.details.variant && item.details.variant !== 'Standard' && (
                                    <div className="font-bold text-blue-600 uppercase tracking-wide mb-1 border-b border-slate-200 pb-0.5">
                                        Opción: {item.details.variant}
                                    </div>
                                )}
                                {item.details.player2 && (
                                    <div className="flex items-center gap-1 text-slate-600">
                                        <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[8px]">J2</span>
                                        <span>{item.details.player2.name} <strong>#{item.details.player2.number}</strong></span>
                                    </div>
                                )}
                                {item.details.player3 && (
                                    <div className="flex items-center gap-1 text-slate-600">
                                        <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[8px]">J3</span>
                                        <span>{item.details.player3.name} <strong>#{item.details.player3.number}</strong></span>
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={() => removeFromCart(item.cartId)} className="text-[10px] text-red-400 hover:text-red-600 underline mt-2 flex items-center gap-1">
                            <Trash2 className="w-3 h-3"/> Eliminar producto
                        </button>
                    </div>
                </div>
            ))}
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md h-fit sticky top-24">
          <h3 className="text-xl font-bold mb-4">Finalizar Compra</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nombre y Apellidos" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              
              <Input 
                  label="Email (Opcional)" 
                  type="email" 
                  required={false}
                  placeholder="ejemplo@correo.com"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
              />
              
              <Input 
                  label="Teléfono Contacto (Opcional)" 
                  type="tel" 
                  required={false} 
                  placeholder="Opcional"
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
              
              <div className="mb-3 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                      <p className="text-xs text-blue-800 font-bold mb-1">Avisos de Pedido</p>
                      <p className="text-xs text-blue-600">
                          Si indicas tu email, te enviaremos las actualizaciones de estado (producción y entrega).
                      </p>
                  </div>
              </div>

              <div className="flex items-start gap-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <input 
                      type="checkbox" 
                      id="marketing"
                      checked={formData.marketingConsent} 
                      onChange={e => setFormData({...formData, marketingConsent: e.target.checked})} 
                      className="mt-1 accent-emerald-600" 
                  />
                  <label htmlFor="marketing" className="text-xs text-gray-600 cursor-pointer">
                      (Opcional) Deseo recibir información sobre ofertas, campañas y novedades de mi club.
                  </label>
              </div>

              {/* --- SECCIÓN PAGO MODIFICADA --- */}
              <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">Pago</label>
                  <div className={`grid gap-2 mb-4 ${isCashEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      
                      {/* TARJETA (Siempre visible) */}
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer text-center flex flex-col items-center gap-1 transition-all ${paymentMethod === 'card' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 hover:bg-gray-50'}`} 
                        onClick={() => setPaymentMethod('card')}
                      >
                          <CreditCard className="w-5 h-5"/> 
                          Tarjeta
                      </div>

                      {/* EFECTIVO (Solo si el club lo permite) */}
                      {isCashEnabled && (
                          <div 
                            className={`p-3 border rounded-lg cursor-pointer text-center flex flex-col items-center gap-1 transition-all ${paymentMethod === 'cash' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 hover:bg-gray-50'}`} 
                            onClick={() => setPaymentMethod('cash')}
                          >
                              <Banknote className="w-5 h-5"/> 
                              Efectivo
                          </div>
                      )}
                  </div>

                  {/* Mensajes según método */}
                  {paymentMethod === 'cash' && isCashEnabled && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mb-4 border border-yellow-200 animate-fade-in">
                          El pedido quedará marcado como "Pendiente" hasta que abones el importe en tu club.
                      </p>
                  )}
                  {paymentMethod === 'card' && (
                      <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded mb-4 border border-blue-200 animate-fade-in">
                          Pago seguro con tarjeta. El pedido se procesará inmediatamente.
                      </p>
                  )}
              </div>
              {/* ------------------------------------- */}

              <div className="flex items-start gap-2 mb-4">
                  <input type="checkbox" required checked={formData.rgpd} onChange={e => setFormData({...formData, rgpd: e.target.checked})} className="mt-1 accent-emerald-600" />
                  <span className="text-xs text-gray-500">He leído y acepto la Política de Privacidad y el tratamiento de datos.</span>
              </div>
              
              <Button type="submit" disabled={!storeConfig.isOpen} className="w-full py-3 text-lg">
                  {storeConfig.isOpen ? `Pagar ${total.toFixed(2)}€` : 'TIENDA CERRADA'}
              </Button>
          </form>
      </div>
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
    // Estado para controlar qué lotes están desplegados (vacío = todos plegados)
    const [expandedBatchIds, setExpandedBatchIds] = useState([]);

    // 1. Filtrado por Temporada
    const filteredHistory = useMemo(() => { 
        let result = orders.filter(o => o.clubId === club.id); 
        if (selectedSeasonId !== 'all') { 
            const season = seasons.find(s => s.id === selectedSeasonId); 
            if (season) { 
                const start = new Date(season.startDate).getTime(); 
                const end = new Date(season.endDate).getTime(); 
                result = result.filter(o => { 
                    const orderDate = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : Date.now(); 
                    return orderDate >= start && orderDate <= end; 
                }); 
            } 
        } 
        // Filtramos solo los que NO están pendientes de validación para estadísticas
        return result.filter(o => o.status !== 'pendiente_validacion'); 
    }, [orders, club.id, selectedSeasonId, seasons]);

    // 2. Agrupación de Lotes (Globales, Individuales, Errores)
    const batches = useMemo(() => { 
        const groups = {}; 
        
        filteredHistory.forEach(order => { 
            let batchId = order.globalBatch || 1;
            // Normalizar IDs
            if (order.type === 'special') batchId = 'SPECIAL';
            else if (String(batchId) === 'INDIVIDUAL') batchId = 'INDIVIDUAL';
            
            if (!groups[batchId]) groups[batchId] = []; 
            groups[batchId].push(order); 
        }); 

        return Object.entries(groups).map(([id, orders]) => {
            const isError = String(id).startsWith('ERR');
            const isIndividual = String(id) === 'INDIVIDUAL';
            const isSpecial = String(id) === 'SPECIAL';
            const numericId = (!isError && !isIndividual && !isSpecial) ? parseInt(id) : id;
            
            return { 
                id: numericId,
                displayId: id,
                orders, 
                type: isError ? 'error' : isIndividual ? 'individual' : isSpecial ? 'special' : 'global'
            };
        }).sort((a, b) => {
            // Orden: Errores, luego Lotes numéricos descendentes, luego Individuales
            if (a.type === 'error' && b.type !== 'error') return -1;
            if (a.type !== 'error' && b.type === 'error') return 1;
            if (a.type === 'global' && b.type === 'global') return b.id - a.id;
            return 0;
        }); 
    }, [filteredHistory]);

    // 3. Cálculos Estadísticos
    // A) Total Productos Vendidos (Número de artículos)
    const totalProducts = filteredHistory.reduce((sum, o) => sum + o.items.reduce((is, i) => is + (i.quantity || 1), 0), 0);

    // B) Total Comisión Ganada por el Club (Su beneficio)
    const totalSales = filteredHistory.reduce((sum, o) => sum + o.total, 0);
    const totalCommission = totalSales * (club.commission || config.clubCommissionPct || 0.12);

    // C) Lógica de Efectivo (Dinero en mano del club pendiente de que FotoEsport lo recoja)
    // Se calcula sumando los pedidos en efectivo de lotes que NO han sido marcados como "cashCollected" por el admin
    const cashHeldByClub = batches.reduce((sum, batch) => {
        const batchLog = club.accountingLog?.[batch.displayId];
        // Si el admin YA lo marcó como recogido (cashCollected == true), entonces el club ya no tiene ese dinero.
        if (batchLog?.cashCollected) return sum;

        // Si no está recogido, sumamos el efectivo de ese lote
        const batchCash = batch.orders
            .filter(o => o.paymentMethod === 'cash')
            .reduce((s, o) => s + o.total, 0);
        
        return sum + batchCash;
    }, 0);

    // D) Pedidos pendientes de validación (El cliente dice que pagó, el club debe confirmar)
    const pendingCashOrders = orders.filter(o => o.clubId === club.id && o.status === 'pendiente_validacion');

    const toggleBatch = (batchId) => {
        if (expandedBatchIds.includes(batchId)) {
            setExpandedBatchIds(expandedBatchIds.filter(id => id !== batchId));
        } else {
            setExpandedBatchIds([...expandedBatchIds, batchId]);
        }
    };

    const isCashEnabled = club.cashPaymentEnabled !== false;

    return (
        <div className="space-y-8 animate-fade-in">
            
            {/* 1. CABECERA Y SELECTOR */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Hola, {club.name}</h1>
                    <p className="text-gray-500 text-sm mt-1">Resumen de actividad y estado financiero.</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                    <Calendar className="w-5 h-5 text-emerald-600"/>
                    <select 
                        className="bg-transparent border-none font-bold text-gray-700 focus:ring-0 cursor-pointer text-sm outline-none" 
                        value={selectedSeasonId} 
                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                    >
                        <option value="all">Todas las Temporadas</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* 2. TARJETAS DE ESTADÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Total Merchandising */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Package className="w-24 h-24"/>
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-100 font-bold text-xs uppercase tracking-wider mb-2">Merchandising Vendido</p>
                        <p className="text-4xl font-extrabold">{totalProducts}</p>
                        <p className="text-sm text-blue-100 mt-1">Productos totales</p>
                    </div>
                </div>

                {/* Total Ganado (Comisión) */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Euro className="w-24 h-24"/>
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-bold text-xs uppercase tracking-wider mb-2">Beneficio del Club</p>
                        <p className="text-4xl font-extrabold">{totalCommission.toFixed(2)}€</p>
                        <p className="text-sm text-emerald-100 mt-1">Total ganado esta temporada</p>
                    </div>
                </div>

                {/* Panel Efectivo */}
                {isCashEnabled ? (
                    <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Banknote className="w-24 h-24"/>
                        </div>
                        <div className="relative z-10">
                            <p className="text-orange-100 font-bold text-xs uppercase tracking-wider mb-2">Efectivo en Caja</p>
                            <p className="text-4xl font-extrabold">{cashHeldByClub.toFixed(2)}€</p>
                            <div className="mt-2 bg-black/10 p-2 rounded text-[10px] text-orange-50 backdrop-blur-sm">
                                Pendiente de entregar a FotoEsport.
                                <br/>(Se descuenta al liquidar lotes)
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-100 rounded-2xl p-6 border-2 border-gray-200 border-dashed relative overflow-hidden flex flex-col justify-center items-center text-center opacity-70">
                        <Ban className="w-12 h-12 text-gray-400 mb-2"/>
                        <p className="text-gray-500 font-bold text-lg">Efectivo No Activado</p>
                        <p className="text-gray-400 text-xs">Gestión desactivada por FotoEsport Merch</p>
                    </div>
                )}
            </div>

            {/* 3. ALERTA DE PAGOS EN EFECTIVO PENDIENTES */}
            {isCashEnabled && pendingCashOrders.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm animate-pulse-slow">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-100 p-3 rounded-full text-red-600">
                            <AlertTriangle className="w-6 h-6"/>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-red-800 text-lg">Acción Requerida: Validar Cobros</h3>
                            <p className="text-red-600 text-sm mb-4">
                                Tienes <strong>{pendingCashOrders.length} pedidos</strong> marcados como "Pago en Efectivo" que los clientes dicen haber pagado. 
                                Confirma que has recibido el dinero para que pasen a producción.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {pendingCashOrders.map(order => (
                                    <div key={order.id} className="bg-white p-3 rounded-lg border border-red-200 shadow-sm flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">#{order.id.slice(0,6)}</p>
                                            <p className="text-xs text-gray-500">{order.customer.name}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-bold text-gray-800">{order.total.toFixed(2)}€</span>
                                            <Button 
                                                size="xs" 
                                                onClick={() => updateOrderStatus(order.id, 'recopilando', 'Pago validado', order)} 
                                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] py-1 px-2 h-auto"
                                            >
                                                Confirmar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. LISTADO DE LOTES Y PEDIDOS */}
            <div className="space-y-6">
                <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2 border-b pb-2">
                    <Layers className="w-6 h-6 text-indigo-600"/> 
                    Historial de Lotes y Pedidos
                </h3>
                
                {batches.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                        <p className="text-gray-500 font-medium">No hay pedidos registrados en este periodo.</p>
                    </div>
                ) : (
                    batches.map(batch => {
                        const isExpanded = expandedBatchIds.includes(batch.displayId);
                        const status = batch.orders[0]?.status || 'recopilando';
                        const itemCount = batch.orders.reduce((acc, o) => acc + o.items.reduce((iAcc, i) => iAcc + (i.quantity || 1), 0), 0);
                        
                        // Estilos según tipo
                        let headerClass = "bg-white border-gray-200 hover:border-gray-300";
                        let titleColor = "text-gray-800";
                        let icon = <Package className="w-5 h-5 text-indigo-600"/>;

                        if (batch.type === 'error') {
                            headerClass = "bg-red-50 border-red-200 hover:border-red-300";
                            titleColor = "text-red-700";
                            icon = <AlertTriangle className="w-5 h-5 text-red-600"/>;
                        } else if (batch.type === 'individual') {
                            headerClass = "bg-orange-50 border-orange-200 hover:border-orange-300";
                            titleColor = "text-orange-800";
                            icon = <User className="w-5 h-5 text-orange-600"/>;
                        }

                        return (
                            <div key={batch.displayId} className={`border rounded-xl overflow-hidden transition-all shadow-sm ${headerClass}`}>
                                {/* CABECERA DEL ACORDEÓN */}
                                <div 
                                    onClick={() => toggleBatch(batch.displayId)}
                                    className="p-5 flex flex-col md:flex-row justify-between items-center cursor-pointer select-none gap-4"
                                >
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`p-3 rounded-full ${batch.type === 'error' ? 'bg-red-100' : 'bg-gray-100'}`}>
                                            {icon}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${titleColor}`}>
                                                {batch.type === 'global' ? `Pedido Global #${batch.id}` : 
                                                 batch.type === 'error' ? `Lote de Incidencias #${batch.displayId.split('-')[1]}` : 
                                                 batch.type === 'special' ? 'Pedidos Especiales' :
                                                 'Pedidos Individuales'}
                                            </h4>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <span className="bg-white px-2 py-0.5 rounded border shadow-sm font-medium text-xs">
                                                    {batch.orders.length} pedidos
                                                </span>
                                                <span>•</span>
                                                <span className="font-medium">{itemCount} productos</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                        <Badge status={status} />
                                        <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'bg-gray-200 rotate-180' : 'bg-gray-100'}`}>
                                            <ChevronRight className="w-5 h-5 text-gray-600 rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                {/* CONTENIDO DESPLEGABLE */}
                                {isExpanded && (
                                    <div className="border-t border-gray-200 bg-gray-50/50 p-4 animate-fade-in">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {batch.orders.map(order => (
                                                <div key={order.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-3 pb-2 border-b border-gray-50">
                                                        <div>
                                                            <p className="font-bold text-gray-800">{order.customer.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono">ID: {order.id.slice(0,8)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${order.paymentMethod === 'cash' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {order.paymentMethod === 'cash' ? 'Efectivo' : 'Online'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* LISTA DE ITEMS (SIN PRECIO, COMO PEDISTE) */}
                                                    <div className="space-y-2">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 text-sm">
                                                                <div className="bg-gray-100 w-8 h-8 rounded flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">
                                                                    {item.quantity || 1}x
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-700 truncate">{item.name}</p>
                                                                    <p className="text-xs text-gray-400 truncate">
                                                                        {[
                                                                            item.size ? `T: ${item.size}` : null,
                                                                            item.playerName ? `N: ${item.playerName}` : null,
                                                                            item.playerNumber ? `#: ${item.playerNumber}` : null
                                                                        ].filter(Boolean).join(' | ')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
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

// --- GESTOR DE PROVEEDORES ---
const SupplierManager = ({ suppliers, products, createSupplier, updateSupplier, deleteSupplier, updateProductCostBatch }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState(null);
    const [activeTab, setActiveTab] = useState('info'); // info | contacts | products

    const INITIAL_SUPPLIER = {
        name: '',
        taxId: '',
        address: '',
        email: '',
        phone: '',
        contacts: [], 
        priceList: {} 
    };

    const handleEdit = (supplier) => {
        setCurrentSupplier({ ...supplier });
        setIsEditing(true);
        setActiveTab('info');
    };

    const handleCreate = () => {
        setCurrentSupplier(INITIAL_SUPPLIER);
        setIsEditing(true);
        setActiveTab('info');
    };

    const handleSave = async () => {
        if (!currentSupplier.name) return alert("El nombre es obligatorio");
        if (currentSupplier.id) {
            await updateSupplier(currentSupplier);
        } else {
            await createSupplier(currentSupplier);
        }
        setIsEditing(false);
        setCurrentSupplier(null);
    };

    const addContact = () => {
        setCurrentSupplier({
            ...currentSupplier,
            contacts: [...(currentSupplier.contacts || []), { name: '', role: '', phone: '', email: '' }]
        });
    };

    const updateContact = (idx, field, val) => {
        const newContacts = [...currentSupplier.contacts];
        newContacts[idx][field] = val;
        setCurrentSupplier({ ...currentSupplier, contacts: newContacts });
    };

    const removeContact = (idx) => {
        const newContacts = currentSupplier.contacts.filter((_, i) => i !== idx);
        setCurrentSupplier({ ...currentSupplier, contacts: newContacts });
    };

    const updateProductCost = (productId, newCost) => {
        const cost = parseFloat(newCost) || 0;
        const newPriceList = { ...currentSupplier.priceList, [productId]: cost };
        setCurrentSupplier({ ...currentSupplier, priceList: newPriceList });
    };

    const toggleProductLink = (productId) => {
        const newPriceList = { ...currentSupplier.priceList };
        if (newPriceList[productId] !== undefined) {
            delete newPriceList[productId];
        } else {
            const prod = products.find(p => p.id === productId);
            newPriceList[productId] = prod ? prod.cost : 0;
        }
        setCurrentSupplier({ ...currentSupplier, priceList: newPriceList });
    };

    const savePricesAndSync = async () => {
        if (!currentSupplier.id) return alert("Guarda primero el proveedor antes de asignar precios.");
        await updateSupplier(currentSupplier);
        await updateProductCostBatch(currentSupplier.id, currentSupplier.priceList);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-fade-in">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {currentSupplier.id ? <Edit3 className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                        {currentSupplier.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </h3>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>
                        <Button onClick={activeTab === 'products' ? savePricesAndSync : handleSave}>
                            {activeTab === 'products' ? 'Guardar y Sincronizar Costes' : 'Guardar Datos'}
                        </Button>
                    </div>
                </div>

                <div className="flex gap-4 mb-6">
                    <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'info' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}>Datos Generales</button>
                    <button onClick={() => setActiveTab('contacts')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'contacts' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}>Personas de Contacto</button>
                    <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'products' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}>Catálogo y Costes</button>
                </div>

                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nombre Fiscal / Comercial" value={currentSupplier.name} onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})} />
                        <Input label="CIF / NIF" value={currentSupplier.taxId || ''} onChange={e => setCurrentSupplier({...currentSupplier, taxId: e.target.value})} />
                        <div className="md:col-span-2">
                            <Input label="Dirección Completa" value={currentSupplier.address || ''} onChange={e => setCurrentSupplier({...currentSupplier, address: e.target.value})} />
                        </div>
                        <Input label="Email Central" value={currentSupplier.email || ''} onChange={e => setCurrentSupplier({...currentSupplier, email: e.target.value})} />
                        <Input label="Teléfono Central" value={currentSupplier.phone || ''} onChange={e => setCurrentSupplier({...currentSupplier, phone: e.target.value})} />
                    </div>
                )}

                {activeTab === 'contacts' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-700">Agenda de Contactos</h4>
                            <Button size="sm" onClick={addContact}><Plus className="w-4 h-4"/> Añadir Persona</Button>
                        </div>
                        {currentSupplier.contacts?.map((c, i) => (
                            <div key={i} className="flex gap-2 items-end bg-gray-50 p-3 rounded border">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Nombre</label>
                                    <input className="w-full border rounded p-1 text-sm" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Cargo</label>
                                    <input className="w-full border rounded p-1 text-sm" value={c.role} onChange={e => updateContact(i, 'role', e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Email</label>
                                    <input className="w-full border rounded p-1 text-sm" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} />
                                </div>
                                <div className="w-32">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Teléfono</label>
                                    <input className="w-full border rounded p-1 text-sm" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} />
                                </div>
                                
                                {/* --- NUEVO CHECKBOX CC --- */}
                                <div className="w-10 flex flex-col items-center justify-center pb-2">
                                    <label className="text-[8px] uppercase font-bold text-gray-400 mb-1" title="Poner en Copia por defecto">CC</label>
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={c.ccDefault || false} 
                                        onChange={e => updateContact(i, 'ccDefault', e.target.checked)} 
                                    />
                                </div>
                                {/* ------------------------- */}

                                <button onClick={() => removeContact(i)} className="p-2 text-red-500 hover:bg-red-50 rounded mb-0.5"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                        {(!currentSupplier.contacts || currentSupplier.contacts.length === 0) && <p className="text-gray-400 text-sm italic">Sin contactos registrados.</p>}
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-4">
                         <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800 flex gap-2">
                            <AlertCircle className="w-5 h-5"/>
                            <p>Marca los productos que suministra este proveedor. El <strong>coste</strong> que definas aquí se aplicará automáticamente al producto al guardar.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto border rounded-lg p-2 bg-gray-50">
                            {products.map(prod => {
                                const isLinked = currentSupplier.priceList && currentSupplier.priceList[prod.id] !== undefined;
                                const cost = isLinked ? currentSupplier.priceList[prod.id] : (prod.cost || 0);
                                
                                return (
                                    <div key={prod.id} className={`flex items-center justify-between p-3 rounded border transition-colors ${isLinked ? 'bg-white border-emerald-300 shadow-sm' : 'bg-gray-100 opacity-70 border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={isLinked} 
                                                onChange={() => toggleProductLink(prod.id)}
                                                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                            {prod.image && <img src={prod.image} className="w-8 h-8 rounded object-cover" />}
                                            <span className={`font-bold text-sm ${isLinked ? 'text-gray-800' : 'text-gray-500'}`}>{prod.name}</span>
                                        </div>
                                        
                                        {isLinked && (
                                            <div className="flex items-center gap-2 animate-fade-in">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Coste:</label>
                                                <div className="relative w-24">
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        className="w-full border border-gray-300 rounded p-1 text-right font-bold text-gray-800 pr-5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                                        value={cost}
                                                        onChange={(e) => updateProductCost(prod.id, e.target.value)}
                                                    />
                                                    <span className="absolute right-1 top-1 text-gray-400 text-xs">€</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Factory className="w-6 h-6 text-indigo-600"/> Gestión de Proveedores
                    </h3>
                    <p className="text-sm text-gray-500">Administra tus proveedores, contactos y costes de compra.</p>
                </div>
                <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2"/> Nuevo Proveedor
                </Button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                {suppliers.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-400">
                        <Truck className="w-16 h-16 mx-auto mb-2 opacity-20"/>
                        <p>No hay proveedores registrados.</p>
                    </div>
                ) : (
                    suppliers.map(sup => (
                        <div key={sup.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                        {sup.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">{sup.name}</h4>
                                        <p className="text-xs text-gray-500">{sup.email || 'Sin email'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(sup)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit3 className="w-4 h-4"/></button>
                                    <button onClick={() => { if(window.confirm('¿Borrar proveedor?')) deleteSupplier(sup.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                            
                            <div className="space-y-2 text-xs text-gray-600 mt-4">
                                {sup.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-gray-400"/> {sup.phone}</div>}
                                {sup.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-gray-400"/> <span className="truncate">{sup.address}</span></div>}
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                                    <Package className="w-3 h-3 text-gray-400"/> 
                                    <span className="font-bold text-indigo-700">
                                        {sup.priceList ? Object.keys(sup.priceList).filter(pid => products.some(p => p.id === pid)).length : 0} productos suministrados
                                    </span>
                                </div>
                                {sup.contacts?.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Contact className="w-3 h-3 text-gray-400"/> 
                                        <span>{sup.contacts.length} personas de contacto</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// --- MODAL DE PREVISIÓN DE STOCK (CON COMPARATIVA DE CANTIDADES) ---
const SupplierStockModal = ({ active, onClose, batchId, orders, suppliers, products, club, onSend }) => {
    const [selectedSuppliers, setSelectedSuppliers] = useState([]);
    const [supplierData, setSupplierData] = useState([]);

    // Calcular datos al abrir
    useEffect(() => {
        if (!active || !orders || !products) return;

        const dataMap = {}; 

        orders.forEach(order => {
            if (!order.items || !Array.isArray(order.items)) return;

            order.items.forEach(item => {
                const realProductId = item.productId || item.id;
                const productDef = products.find(p => p.id === realProductId);
                const supplierId = productDef?.supplierId;

                if (supplierId) {
                    const supplier = suppliers.find(s => s.id === supplierId);
                    if (supplier) {
                        if (!dataMap[supplierId]) {
                            dataMap[supplierId] = { supplier, items: {}, totalQty: 0 };
                        }
                        const pName = productDef?.name || item.name;
                        const pSize = item.size || 'Única';
                        const key = `${pName}-${pSize}`;
                        
                        if (!dataMap[supplierId].items[key]) {
                            dataMap[supplierId].items[key] = { name: pName, size: pSize, qty: 0 };
                        }
                        const qty = parseInt(item.quantity || 1);
                        dataMap[supplierId].items[key].qty += qty;
                        dataMap[supplierId].totalQty += qty;
                    }
                }
            });
        });

        const result = Object.values(dataMap).map(d => ({
            ...d.supplier,
            stockItems: Object.values(d.items),
            totalUnits: d.totalQty
        }));

        setSupplierData(result);
        setSelectedSuppliers(result.filter(s => s.email).map(s => s.id));

    }, [active, orders, products, suppliers]);

    const handleSend = () => {
        const toSend = supplierData.filter(s => selectedSuppliers.includes(s.id));
        onSend(toSend, batchId, club);
        onClose();
    };

    const toggleSelect = (id) => {
        if (selectedSuppliers.includes(id)) setSelectedSuppliers(selectedSuppliers.filter(sid => sid !== id));
        else setSelectedSuppliers([...selectedSuppliers, id]);
    };

    // Obtener historial global del lote
    const batchLog = (club?.accountingLog && club.accountingLog[batchId]) || {};
    const emailHistoryMap = batchLog.supplierEmails || {}; 

    if (!active) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Factory className="w-5 h-5 text-emerald-400"/> Gestión de Stock y Avisos
                        </h3>
                        <p className="text-xs text-gray-400">Lote Global #{batchId} - {club?.name}</p>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 p-6">
                    {supplierData.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <p>No se han encontrado productos asociados a proveedores en este lote.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm flex gap-3 text-sm text-indigo-900">
                                <Mail className="w-5 h-5 text-indigo-500 shrink-0"/>
                                <p>Selecciona proveedores para enviar previsión. El historial muestra cuántas unidades había cuando enviaste el aviso anterior frente a las actuales.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {supplierData.map(data => {
                                    // Procesar historial (soporte para string antiguo o array nuevo)
                                    let history = emailHistoryMap[data.id];
                                    if (history && !Array.isArray(history)) history = [{ sentAt: history, qty: '?', refs: '?' }];
                                    if (!history) history = [];
                                    
                                    // Ordenar: el último primero
                                    history = [...history].reverse();

                                    const hasEmail = !!data.email;
                                    const isSelected = selectedSuppliers.includes(data.id);
                                    
                                    return (
                                        <div key={data.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${isSelected ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-gray-200'}`}>
                                            {/* CABECERA */}
                                            <div className="p-4 flex flex-col md:flex-row md:items-start gap-4 bg-gray-50/50">
                                                <div className="flex items-center gap-3 min-w-[220px]">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected}
                                                        onChange={() => hasEmail && toggleSelect(data.id)}
                                                        disabled={!hasEmail}
                                                        className="w-5 h-5 accent-emerald-600 cursor-pointer mt-1"
                                                    />
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-sm">{data.name}</h4>
                                                        <p className="text-xs text-gray-500 mb-1">{data.email || <span className="text-red-500">Sin Email</span>}</p>
                                                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200">
                                                            ACTUAL: {data.totalUnits} uds
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* ZONA DE HISTORIAL */}
                                                <div className="flex-1 border-l border-gray-200 pl-4 md:pl-6">
                                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                                        <Check className="w-3 h-3"/> Historial de envíos
                                                    </h5>
                                                    
                                                    {history.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">Nunca enviado</p>
                                                    ) : (
                                                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                                            {history.map((entry, idx) => {
                                                                const date = new Date(entry.sentAt);
                                                                // Calcular diferencia: Actual - Lo que había en ese envío
                                                                const diff = typeof entry.qty === 'number' ? data.totalUnits - entry.qty : 0;
                                                                
                                                                return (
                                                                    <div key={idx} className="flex items-center justify-between text-xs bg-white border border-gray-100 p-2 rounded shadow-sm">
                                                                        <div className="text-gray-600">
                                                                            <span className="font-bold">{date.toLocaleDateString()}</span> {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                                        </div>
                                                                        
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="text-right">
                                                                                <span className="block text-[9px] text-gray-400 uppercase">En el aviso</span>
                                                                                <span className="font-bold text-gray-700">{entry.qty} uds</span>
                                                                            </div>
                                                                            
                                                                            {/* Indicador de Diferencia */}
                                                                            {diff > 0 && (
                                                                                <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold text-[10px] border border-red-100" title="Han aumentado las unidades desde este correo">
                                                                                    +{diff} nuevos
                                                                                </span>
                                                                            )}
                                                                            {diff === 0 && typeof entry.qty === 'number' && (
                                                                                 <span className="text-emerald-500 font-bold text-[10px]">
                                                                                    = Igual
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* DETALLES DE PRODUCTOS (Solo si seleccionado) */}
                                            {isSelected && (
                                                <div className="border-t border-gray-100 p-4 bg-white animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Contenido a enviar ahora ({data.totalUnits} uds)</h5>
                                                        <div className="max-h-32 overflow-y-auto border rounded bg-gray-50 text-xs">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-gray-100 text-gray-500 sticky top-0"><tr><th className="p-1">Prod</th><th className="p-1">Talla</th><th className="p-1 text-right">Cant</th></tr></thead>
                                                                <tbody className="divide-y divide-gray-200">
                                                                    {data.stockItems.map((item, i) => (
                                                                        <tr key={i}><td className="p-1">{item.name}</td><td className="p-1">{item.size || '-'}</td><td className="p-1 text-right font-bold">{item.qty}</td></tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-500 space-y-2">
                                                        <p className="font-bold text-gray-700">Destinatario:</p>
                                                        <div className="flex items-center gap-2"><Mail className="w-3 h-3"/> {data.email}</div>
                                                        {data.contacts?.filter(c => c.ccDefault).length > 0 && (
                                                            <>
                                                                <p className="font-bold text-gray-700 mt-2">En Copia (CC):</p>
                                                                <ul className="list-disc pl-4 text-gray-400">
                                                                    {data.contacts.filter(c => c.ccDefault).map((c, i) => (
                                                                        <li key={i}>{c.email} ({c.name})</li>
                                                                    ))}
                                                                </ul>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t flex justify-between items-center shadow-lg z-10">
                    <div className="text-xs text-gray-500">
                        Se enviarán <strong>{selectedSuppliers.length}</strong> correos de previsión.
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button 
                            onClick={handleSend} 
                            disabled={selectedSuppliers.length === 0} 
                            className="bg-gray-900 text-white hover:bg-black"
                        >
                            <Mail className="w-4 h-4 mr-2"/> Enviar Avisos
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function AdminDashboard({ products, orders, clubs, incrementClubErrorBatch, updateOrderStatus, financialConfig, setFinancialConfig, updateFinancialConfig, updateProduct, addProduct, deleteProduct, createClub, deleteClub, updateClub, toggleClubBlock, modificationFee, setModificationFee, seasons, addSeason, deleteSeason, toggleSeasonVisibility, storeConfig, setStoreConfig, incrementClubGlobalOrder, decrementClubGlobalOrder, showNotification, createSpecialOrder, addIncident, updateIncidentStatus, suppliers, createSupplier, updateSupplier, deleteSupplier, updateProductCostBatch}) {
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

  // --- NUEVO ESTADO PARA GESTIÓN AVANZADA DE LOTES ---
    const [manageBatchModal, setManageBatchModal] = useState({
        active: false,
        club: null,
        batchId: null,
        orders: [],
        action: 'move',     // 'move' | 'delete'
        targetBatch: '',    // Para mover
        deleteType: 'full'  // 'full' (Borrar Lote y Retroceder) | 'empty' (Solo vaciar pedidos)
    });

// ABRIR MODAL
  const openManageBatchModal = (club, batchId, batchOrders) => {
      let defaultTarget = '';
      if (String(batchId).startsWith('ERR')) {
          defaultTarget = club.activeGlobalOrderId; 
      } else {
          defaultTarget = club.activeGlobalOrderId;
          if(batchId === club.activeGlobalOrderId) defaultTarget = 'INDIVIDUAL';
      }

      setManageBatchModal({
          active: true,
          club: club,
          batchId: batchId,
          orders: batchOrders,
          action: batchOrders.length > 0 ? 'move' : 'delete',
          targetBatch: defaultTarget,
          deleteType: 'full' // Por defecto eliminar completo
      });
  };

// --- FUNCIÓN EJECUTAR (ROBUSTA) ---
  const executeBatchManagement = async () => {
      const { club, batchId, orders: batchOrders, action, targetBatch, deleteType } = manageBatchModal;
      if (!club || !batchId) return;

      if (action === 'move' && !targetBatch) {
          showNotification("Debes seleccionar un lote de destino", "error");
          return;
      }

      try {
          const batch = writeBatch(db);
          
          // Lógica robusta para identificar IDs numéricos
          let batchNum = typeof batchId === 'number' ? batchId : 0;
          let isErrorBatch = false;

          if (typeof batchId === 'string' && batchId.startsWith('ERR')) {
              isErrorBatch = true;
              batchNum = parseInt(batchId.split('-')[1]); // "ERR-2" -> 2
          }

          // 1. PROCESAR PEDIDOS (Mover o Borrar)
          batchOrders.forEach(order => {
              const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
              if (action === 'delete') {
                  batch.delete(ref);
              } else {
                  // Lógica de mover (igual que antes)
                  let finalGlobalBatch = targetBatch;
                  if (targetBatch === 'ERR_ACTIVE') {
                      finalGlobalBatch = `ERR-${club.activeErrorBatchId || 1}`;
                  } else if (targetBatch !== 'INDIVIDUAL' && targetBatch !== 'SPECIAL') {
                      if (!String(targetBatch).startsWith('ERR')) finalGlobalBatch = parseInt(targetBatch);
                  }
                  batch.update(ref, { 
                      globalBatch: finalGlobalBatch, 
                      status: 'recopilando', 
                      visibleStatus: 'Recopilando (Traspasado)' 
                  });
              }
          });

          // 2. RETROCEDER CONTADOR (Solo si es 'delete full' y coincide con el activo)
          if (action === 'delete' && deleteType === 'full') {
              const clubRef = doc(db, 'clubs', club.id);
              
              if (isErrorBatch) {
                  // CASO ERROR: ERR-2 -> Retroceder a 1
                  const currentActiveErr = parseInt(club.activeErrorBatchId || 1);
                  if (batchNum === currentActiveErr && batchNum >= 1) {
                      // Restamos 1 (si es 1 pasa a 0 y desaparecen los errores)
                      batch.update(clubRef, { activeErrorBatchId: batchNum - 1 });
                      
                      // Reabrir pedidos del anterior (si existen)
                      if (batchNum > 1) {
                          const prevBatchId = `ERR-${batchNum - 1}`;
                          const prevOrders = orders.filter(o => o.clubId === club.id && o.globalBatch === prevBatchId);
                          prevOrders.forEach(po => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'orders', po.id), { status: 'recopilando' }));
                      }
                  }
              } else {
                  // CASO STANDARD: 5 -> Retroceder a 4
                  const currentActiveStd = parseInt(club.activeGlobalOrderId || 1);
                  if (batchNum === currentActiveStd && batchNum >= 1) {
                      batch.update(clubRef, { activeGlobalOrderId: batchNum - 1 });
                      
                      if (batchNum > 1) {
                          const prevOrders = orders.filter(o => o.clubId === club.id && o.globalBatch === batchNum - 1);
                          prevOrders.forEach(po => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'orders', po.id), { status: 'recopilando' }));
                      }
                  }
              }
          }

          await batch.commit();
          
          showNotification(action === 'move' ? 'Pedidos traspasados' : 'Lote eliminado correctamente');
          setManageBatchModal({ ...manageBatchModal, active: false });

      } catch (error) {
          console.error("Error batch management:", error);
          showNotification("Error al procesar", "error");
      }
  };

  // Dentro de AdminDashboard, junto a los otros useState...
    const [collapsedBatches, setCollapsedBatches] = useState([]); // <--- NUEVO ESTADO

    // Función auxiliar para alternar (abrir/cerrar)
    const toggleBatch = (batchId) => {
        if (collapsedBatches.includes(batchId)) {
            setCollapsedBatches(collapsedBatches.filter(id => id !== batchId));
        } else {
            setCollapsedBatches([...collapsedBatches, batchId]);
        }
    };

  // Estado para controlar el modal de cambio de estado con notificación
    const [statusChangeModal, setStatusChangeModal] = useState({ 
        active: false, clubId: null, batchId: null, newStatus: '' 
    });

    const [supplierStockModal, setSupplierStockModal] = useState({ 
        active: false, batchId: null, orders: [], club: null
    });

    const initiateStatusChange = (clubId, batchId, newStatus) => {
    console.log("CLICK DETECTADO:", { clubId, batchId, newStatus }); // <--- Añade esto para comprobar
    setStatusChangeModal({ active: true, clubId, batchId, newStatus });
    };

    // --- FUNCIÓN PARA ENVIAR CORREOS DE PREVISIÓN (CON HISTORIAL DETALLADO) ---
    const handleSendSupplierEmails = async (targetSuppliers, batchId, club) => {
        if (!targetSuppliers.length) return;
        
        const batchWrite = writeBatch(db);
        let sentCount = 0;
        const nowStr = new Date().toISOString();
        
        // Obtenemos el historial actual del club para no perder datos al escribir
        // (Nota: club ya viene actualizado en las props si se usa onSnapshot en App)
        const currentBatchLog = (club.accountingLog && club.accountingLog[batchId]) ? club.accountingLog[batchId] : {};
        const currentEmailHistory = currentBatchLog.supplierEmails || {};

        const clubRef = doc(db, 'clubs', club.id);
        const updates = {};

        targetSuppliers.forEach(data => {
            if (!data.email) return;

            // 1. Preparar destinatarios y CC
            const ccEmails = (data.contacts || [])
                .filter(c => c.ccDefault === true && c.email)
                .map(c => c.email);

            const emailSubject = `FotoEsport Merch // ${club.name} // Pedido Global ${batchId}`;

            // 2. Crear documento de Email
            const mailRef = doc(collection(db, 'mail'));
            batchWrite.set(mailRef, {
                to: [data.email],
                cc: ccEmails, 
                message: {
                    subject: emailSubject,
                    html: generateStockEmailHTML(data.name, batchId, club.name, data.stockItems),
                    text: `Previsión de stock para ${club.name}. Lote ${batchId}.`
                },
                metadata: {
                    type: 'stock_forecast',
                    supplierId: data.id,
                    clubId: club.id,
                    batchId: batchId,
                    sentAt: nowStr,
                    snapshotQty: data.totalUnits // Guardamos cuántos había al enviar
                }
            });

            // 3. Preparar el nuevo objeto de historial
            const newHistoryEntry = {
                sentAt: nowStr,
                qty: data.totalUnits,     // Cantidad total en este momento
                refs: data.stockItems.length // Cantidad de productos distintos
            };

            // 4. Obtener historial previo de este proveedor
            let supplierHistory = currentEmailHistory[data.id];

            // Gestión de compatibilidad: si antes era un string (código antiguo), lo convertimos a array
            if (typeof supplierHistory === 'string') {
                supplierHistory = [{ sentAt: supplierHistory, qty: '?', refs: '?' }];
            } else if (!Array.isArray(supplierHistory)) {
                supplierHistory = [];
            }

            // Añadimos la nueva entrada
            const newHistoryList = [...supplierHistory, newHistoryEntry];
            
            // Preparamos el update usando notación de punto para este proveedor específico
            updates[`accountingLog.${batchId}.supplierEmails.${data.id}`] = newHistoryList;

            sentCount++;
        });

        if (sentCount > 0) {
            // Ejecutamos todos los updates del club en el batch
            batchWrite.update(clubRef, updates);

            try {
                await batchWrite.commit();
                showNotification(`✅ Enviados ${sentCount} correos y actualizado historial.`);
            } catch (e) {
                console.error("Error envío:", e);
                showNotification("Error al enviar correos.", "error");
            }
        }
    };


    // --- FUNCIÓN ACTUALIZADA: GUARDA HISTORIAL GLOBAL EN EL CLUB CON VALIDACIÓN DE TIPOS ---
    const executeBatchStatusUpdate = async (shouldNotify) => {
        const { clubId, batchId, newStatus } = statusChangeModal;
        if (!clubId || !batchId || !newStatus) return;

        // --- NUEVA VALIDACIÓN: IMPEDIR MÚLTIPLES LOTES ACTIVOS DEL MISMO TIPO ---
        if (newStatus === 'recopilando') {
            // 1. Determinar el tipo del lote que intentamos activar
            const targetIsError = String(batchId).startsWith('ERR');
            const targetIsIndividual = batchId === 'INDIVIDUAL';
            const targetIsGlobal = !targetIsError && !targetIsIndividual; // Lotes numéricos normales (1, 2, 3...)

            // 2. Buscar si ya existe algún pedido/lote en 'recopilando' que sea conflictivo
            const conflictOrder = orders.find(o => {
                // Solo revisar pedidos de este club
                if (o.clubId !== clubId) return false;
                // Solo nos importan los que están activos actualmente
                if (o.status !== 'recopilando') return false;
                // Ignoramos los pedidos que pertenecen al lote que estamos editando (no son conflicto)
                if (o.globalBatch === batchId) return false;

                // Determinar tipo del pedido encontrado
                const currentIsError = String(o.globalBatch).startsWith('ERR');
                const currentIsIndividual = o.globalBatch === 'INDIVIDUAL';
                const currentIsGlobal = !currentIsError && !currentIsIndividual;

                // 3. Verificar colisión de tipos
                if (targetIsError && currentIsError) return true;       // Conflicto: Dos lotes de errores abiertos
                if (targetIsIndividual && currentIsIndividual) return true; // Conflicto: Dos grupos individuales (raro)
                if (targetIsGlobal && currentIsGlobal) return true;     // Conflicto: Lote 1 abierto y abrimos Lote 2

                return false;
            });

            if (conflictOrder) {
                showNotification(`⛔ ACCIÓN DENEGADA: Ya tienes el Lote Global #${conflictOrder.globalBatch} en estado "Recopilando". Debes pasarlo a producción antes de abrir otro del mismo tipo.`, 'error');
                setStatusChangeModal({ ...statusChangeModal, active: false });
                return; // DETENEMOS LA EJECUCIÓN AQUÍ
            }
        }
        // --------------------------------------------------------------------------

        setStatusChangeModal({ ...statusChangeModal, active: false });

        // Filtramos los pedidos del lote
        const batchOrders = orders.filter(o => o.clubId === clubId && o.globalBatch === batchId && o.status !== 'pendiente_validacion'); 
        
        // Obtenemos el nombre del club para el email
        const club = clubs.find(c => c.id === clubId);
        const clubName = club ? club.name : 'Tu Club';

        const batchWrite = writeBatch(db);
        let count = 0; 
        let notifiedCount = 0;
        const now = new Date().toISOString();
        
        // Estado anterior para el log
        const prevStatus = batchOrders[0]?.status || 'desconocido';

        // 1. Actualizar Pedidos Individuales y PREPARAR EMAILS
        batchOrders.forEach(order => {
            // Solo actualizamos si el estado es diferente
            if (order.status !== newStatus) { 
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
                
                // Actualización del pedido
                const updates = { 
                    status: newStatus, 
                    visibleStatus: newStatus === 'recopilando' ? 'Recopilando' : newStatus === 'en_produccion' ? 'En Producción' : 'Entregado al Club'
                };
                
                // LOGICA DE EMAIL
                if (shouldNotify) {
                    const targetEmail = order.customer.email;
                    if (targetEmail && targetEmail.includes('@') && targetEmail.length > 5) {
                        const mailRef = doc(collection(db, 'mail'));
                        batchWrite.set(mailRef, {
                            to: [targetEmail],
                            message: {
                                subject: `📢 Estado Actualizado: Pedido ${clubName} (#${order.id.slice(0,6)})`,
                                html: generateEmailHTML(order, newStatus, clubName),
                                text: `Tu pedido ha cambiado al estado: ${newStatus}. Contacta con tu club para más detalles.`
                            },
                            metadata: {
                                orderId: order.id,
                                clubId: clubId,
                                batchId: batchId,
                                timestamp: serverTimestamp()
                            }
                        });
                        updates.notificationLog = arrayUnion({ 
                            date: now, 
                            statusFrom: order.status,
                            statusTo: newStatus, 
                            method: 'email' 
                        });
                        notifiedCount++;
                    }
                }

                batchWrite.update(ref, updates);
                count++; 
            }
        });

        // 2. Guardar Historial GLOBAL en el Club
        const clubRefDoc = doc(db, 'clubs', clubId);
        const globalLogEntry = {
            batchId: batchId,
            date: now,
            statusFrom: prevStatus,
            statusTo: newStatus,
            notifiedCount: shouldNotify ? notifiedCount : 0,
            action: 'Cambio de Estado'
        };
        
        batchWrite.update(clubRefDoc, {
            batchHistory: arrayUnion(globalLogEntry)
        });

        // 3. Lógica de Tregua y Avance de Contadores
        if (newStatus === 'recopilando') {
            // Si activamos un lote, reseteamos el tiempo de reapertura (Tregua)
            batchWrite.update(clubRefDoc, { lastBatchReopenTime: Date.now() });
            
            // ADICIONAL: Si es un lote numérico, nos aseguramos de que el club apunte a este como activo
            // Esto corrige inconsistencias si se reabre un lote antiguo manualmente
            if (typeof batchId === 'number' && !String(batchId).startsWith('ERR')) {
                batchWrite.update(clubRefDoc, { activeGlobalOrderId: batchId });
            }
        }
        
        if (newStatus === 'en_produccion') { 
            // A) Lógica existente para Lotes Globales Numéricos (1, 2, 3...)
            if (club && club.activeGlobalOrderId === batchId) { 
                batchWrite.update(clubRefDoc, { activeGlobalOrderId: club.activeGlobalOrderId + 1 });
            } 

            // B) Lógica: Lotes de Errores (ERR-1, ERR-2...)
            if (typeof batchId === 'string' && batchId.startsWith('ERR-')) {
                const currentErrNum = parseInt(batchId.split('-')[1]);
                const activeErrNum = parseInt(club.activeErrorBatchId || 1);
                
                if (!isNaN(currentErrNum) && currentErrNum === activeErrNum) {
                    batchWrite.update(clubRefDoc, { activeErrorBatchId: activeErrNum + 1 });
                }
            }
        }

        try {
            await batchWrite.commit();
            let msg = `Lote #${batchId}: ${count} pedidos actualizados.`;
            if (shouldNotify) msg += ` Se han puesto en cola ${notifiedCount} correos electrónicos.`;
            if (showNotification) showNotification(msg, 'success');
        } catch (e) {
            console.error(e);
            if (showNotification) showNotification("Error al actualizar lote y enviar correos", "error");
        }
    };

    // Función para mostrar nombres bonitos de los estados
    const formatStatus = (status) => {
        switch(status) {
            case 'recopilando': return 'Recopilando';
            case 'en_produccion': return 'En Producción';
            case 'entregado_club': return 'Entregado';
            case 'pendiente_validacion': return 'Pendiente';
            case 'pagado': return 'Pagado';
            default: return status || '-';
        }
    };

    // --- NUEVO ESTADO: VISOR DE HISTORIAL DE LOTE ---
    const [batchHistoryModal, setBatchHistoryModal] = useState({ 
        active: false, 
        history: [], 
        batchId: null, 
        clubName: '' 
    });

    const INITIAL_MANUAL_FORM_STATE = {
        clubId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        paymentMethod: 'transfer',
        targetBatch: '',
        
        // --- ESTOS CAMPOS SON OBLIGATORIOS PARA EVITAR ERRORES ---
        classification: 'standard', // 'standard', 'gift', 'incident'
        incidentResponsibility: 'internal', // 'internal', 'supplier', 'club'
        
        items: [],
        tempItem: {
            productId: '',
            size: '',
            name: '',
            number: '',
            price: 0,
            quantity: 1,
            activeName: false,
            activeNumber: false,
            activeSize: false,
            activeShield: false
        }
    };

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
    const [manualOrderForm, setManualOrderForm] = useState(INITIAL_MANUAL_FORM_STATE);

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
        const visibleClubs = filterClubId === 'all' ? clubs : clubs.filter(c => c.id === filterClubId);

        return visibleClubs.map(club => {
            const clubOrders = financialOrders.filter(o => o.clubId === club.id);
            const batches = {};
            
            clubOrders.forEach(order => {
                let batchId = order.globalBatch || 1;
                // Asegurar que string ids se traten como strings
                if (typeof batchId === 'string' && batchId.startsWith('ERR')) {
                    // Mantener batchId tal cual (ej: "ERR-1")
                } else {
                    if (order.type === 'special') batchId = 'SPECIAL';
                    if (batchId === 'INDIVIDUAL') batchId = 'INDIVIDUAL';
                }
                
                if (!batches[batchId]) batches[batchId] = [];
                batches[batchId].push(order);
            });

            // Asegurar Lote Activo Standard
            if (club.activeGlobalOrderId && !batches[club.activeGlobalOrderId]) {
                batches[club.activeGlobalOrderId] = [];
            }

            // Asegurar Lote Activo de Errores (para que salga aunque esté vacío)
            const activeErr = `ERR-${club.activeErrorBatchId || 1}`;
            if (!batches[activeErr]) batches[activeErr] = [];

            const sortedBatches = Object.entries(batches)
                .map(([id, orders]) => {
                    // Detectar si es un lote de errores (string que empieza por ERR)
                    const isError = typeof id === 'string' && id.startsWith('ERR');
                    // Si es SPECIAL, INDIVIDUAL o ERROR, mantenemos el ID como string. Si no, número.
                    return { id: (id === 'SPECIAL' || id === 'INDIVIDUAL' || isError) ? id : parseInt(id), orders, isError };
                })
                .sort((a, b) => {
                    // 1. Especiales primero
                    if (a.id === 'SPECIAL') return -1;
                    if (b.id === 'SPECIAL') return 1;
                    
                    // 2. Errores después (Ordenados del más nuevo al más viejo: ERR-2, ERR-1...)
                    if (a.isError && b.isError) {
                        const numA = parseInt(a.id.split('-')[1]);
                        const numB = parseInt(b.id.split('-')[1]);
                        return numB - numA; 
                    }
                    if (a.isError) return -1; // Errores van antes que los lotes normales
                    if (b.isError) return 1;

                    // 3. Individuales al final
                    if (a.id === 'INDIVIDUAL') return 1;
                    if (b.id === 'INDIVIDUAL') return -1;
                    
                    // 4. Lotes numéricos normales (descendente)
                    return b.id - a.id; 
                });

            return { club, batches: sortedBatches };
        });
    }, [clubs, financialOrders, filterClubId]);

  // 1. Estado para el modal de detalles
  const [accDetailsModal, setAccDetailsModal] = useState({ active: false, title: '', items: [], type: '' });

// 2. Lógica de cálculo de totales (ACTUALIZADA: Errores individuales no afectan al comercial)
  const globalAccountingStats = useMemo(() => {
      const stats = {
        cardTotal: 0,
        cardFees: 0,
        totalNetProfit: 0,
        cash: { collected: 0, pending: 0, listPending: [], listCollected: [] },
        supplier: { paid: 0, pending: 0, listPending: [], listPaid: [] },
        commercial: { paid: 0, pending: 0, listPending: [], listPaid: [] },
        club: { paid: 0, pending: 0, listPending: [], listPaid: [] }
    };

    accountingData.forEach(({ club, batches }) => {
        batches.forEach(batch => {
            const log = club.accountingLog?.[batch.id] || {};
            
            // --- A. DEFINICIÓN DE EXENCIONES DE LOTE ---
            const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
            // Si es un lote entero de errores, nadie cobra comisión
            const isCommissionExempt = isErrorBatch; 

            // --- B. FILTROS DE PAGO (GENERALES) ---
            const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
            const nonCashOrders = batch.orders.filter(o => o.paymentMethod !== 'cash');

            // --- C. TOTALES REALES DEL LOTE (Para Cajas y Neto Empresa) ---
            const cashRevenue = cashOrders.reduce((sum, o) => sum + o.total, 0);
            const nonCashRevenue = nonCashOrders.reduce((sum, o) => sum + o.total, 0);
            const totalBatchRevenue = cashRevenue + nonCashRevenue;

            // Coste TOTAL (Incluye coste de errores/reposiciones)
            const totalCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
            
            // Pasarela TOTAL (Solo pedidos tarjeta)
            const totalFees = batch.orders.reduce((sum, o) => {
                if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                return sum;
            }, 0);

            // --- D. CÁLCULO DE COMISIONES (FILTRADO) ---
            // "Los pedidos de errores no afectan al comercial" -> Filtramos los pedidos que generan comisión
            const commissionableOrders = batch.orders.filter(o => 
                o.paymentMethod !== 'incident' && 
                o.paymentMethod !== 'gift' && 
                o.type !== 'replacement'
            );

            // Base para comisiones (Solo pedidos válidos)
            const commRevenue = commissionableOrders.reduce((sum, o) => sum + o.total, 0);
            const commCost = commissionableOrders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
            const commFees = commissionableOrders.reduce((sum, o) => {
                if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                return sum;
            }, 0);

            // 1. PAGO CLUB (Sobre ventas reales, si no es lote exento)
            const clubCommissionRate = isCommissionExempt ? 0 : (club.commission !== undefined ? club.commission : 0.12);
            const commClub = commRevenue * clubCommissionRate;

            // 2. PAGO COMERCIAL (Sobre base limpia de errores)
            // Base = Ingresos Reales - Pasarela Real - Coste Real - Club Real
            const commercialBase = commRevenue - commFees - commCost - commClub;
            const commComm = isCommissionExempt ? 0 : (commercialBase * financialConfig.commercialCommissionPct);

            // --- E. BENEFICIO NETO EMPRESA ---
            // Ingresos Totales - Costes Totales (inc. errores) - Pagos a terceros
            const batchNetProfit = totalBatchRevenue - totalCost - commClub - commComm - totalFees;

            // ACUMULADORES GLOBALES
            stats.cardTotal += nonCashRevenue; 
            stats.cardFees += totalFees;
            stats.totalNetProfit += batchNetProfit;

            // Lógica de Cajas y Deudas
            const cashVal = cashRevenue + (log.cashUnder || 0) - (log.cashOver || 0);
            if (log.cashCollected) {
                stats.cash.collected += cashVal;
                if(cashVal > 0) stats.cash.listCollected.push({ club: club.name, batch: batch.id, amount: cashVal });
            } else {
                stats.cash.pending += cashVal;
                if(cashVal > 0) stats.cash.listPending.push({ club: club.name, batch: batch.id, amount: cashVal });
            }

            const suppVal = totalCost + (log.supplierUnder || 0) - (log.supplierOver || 0);
            if (log.supplierPaid) {
                stats.supplier.paid += suppVal;
                if(suppVal > 0) stats.supplier.listPaid.push({ club: club.name, batch: batch.id, amount: suppVal });
            } else {
                stats.supplier.pending += suppVal;
                if(suppVal > 0) stats.supplier.listPending.push({ club: club.name, batch: batch.id, amount: suppVal });
            }

            // Deudas solo si hay importes > 0
            if (commComm > 0) {
                const commVal = commComm + (log.commercialUnder || 0) - (log.commercialOver || 0);
                if (log.commercialPaid) {
                    stats.commercial.paid += commVal;
                    if(commVal > 0) stats.commercial.listPaid.push({ club: club.name, batch: batch.id, amount: commVal });
                } else {
                    stats.commercial.pending += commVal;
                    if(commVal > 0) stats.commercial.listPending.push({ club: club.name, batch: batch.id, amount: commVal });
                }
            }

            if (commClub > 0) {
                const clubVal = commClub + (log.clubUnder || 0) - (log.clubOver || 0);
                if (log.clubPaid) {
                    stats.club.paid += clubVal;
                    if(clubVal > 0) stats.club.listPaid.push({ club: club.name, batch: batch.id, amount: clubVal });
                } else {
                    stats.club.pending += clubVal;
                    if(clubVal > 0) stats.club.listPending.push({ club: club.name, batch: batch.id, amount: clubVal });
                }
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
        
        // Obtener el club actualizado para saber el ID de error actual
        const currentClub = clubs.find(c => c.id === order.clubId);
        
        // LÓGICA DE LOTE DE ERRORES
        let batchIdToSave = targetBatch;
        if (targetBatch === 'ERRORS') {
            const currentClub = clubs.find(c => c.id === order.clubId);
            const errorId = currentClub?.activeErrorBatchId || 1; 
            batchIdToSave = `ERR-${errorId}`; // <--- ESTO ES LA CLAVE
        } else if (targetBatch !== 'INDIVIDUAL') {
            batchIdToSave = parseInt(targetBatch);
        }

        const finalPrice = (responsibility === 'club' && recharge) ? item.price : 0;
        
        let finalCost = parseFloat(cost);
        if (responsibility === 'internal' && internalOrigin === 'supplier') {
            finalCost = 0;
        }

        const totalOrder = finalPrice * qty;

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
                    cost: finalCost,
                    name: `${item.name} [REP]`
                }],
                total: totalOrder,
                // Si es un lote de errores, lo ponemos en "recopilando" para que salga en el dashboard
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
                    internalOrigin: responsibility === 'internal' ? internalOrigin : null
                },
                incidents: []
            });

            // ... (resto del código igual: updateDoc incidents array, showNotification, etc.)
            const originalRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id);
            await updateDoc(originalRef, {
                incidents: arrayUnion({
                    id: Date.now(),
                    itemId: item.cartId,
                    itemName: item.name,
                    date: new Date().toISOString(),
                    resolved: true,
                    note: `Reposición generada (${String(batchIdToSave).startsWith('ERR') ? 'Lote Errores' : 'Lote ' + batchIdToSave})`
                })
            });

            showNotification('Pedido de reposición generado correctamente');
            setIncidentForm({ ...incidentForm, active: false });

        } catch (e) {
            console.error(e);
            showNotification('Error al generar la reposición', 'error');
        }
    };

// --- DENTRO DE AdminDashboard (Sustituir función existente) ---

    const submitManualOrder = async () => {
        // 1. Validaciones básicas
        if (!manualOrderForm.clubId || !manualOrderForm.customerName || manualOrderForm.items.length === 0) {
            showNotification('Faltan datos (Club, Cliente o Productos)', 'error');
            return;
        }

        const selectedClub = clubs.find(c => c.id === manualOrderForm.clubId);
        const totalOrder = manualOrderForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // --- 2. LÓGICA DE LOTE DESTINO (ROBUSTA) ---
        let rawBatch = manualOrderForm.targetBatch;
        
        // Si está vacío, usar el activo del club
        if (!rawBatch && selectedClub) rawBatch = selectedClub.activeGlobalOrderId;

        // Convertir a formato correcto (String o Número)
        let batchIdToSave = rawBatch;
        const batchStr = String(rawBatch);

        if (batchStr === 'INDIVIDUAL') {
            batchIdToSave = 'INDIVIDUAL';
        } else if (batchStr.startsWith('ERR-')) {
            // Es un lote de errores (ej: "ERR-1"), lo dejamos como texto
            batchIdToSave = batchStr;
        } else {
            // Es un número (ej: "15" o 15), lo convertimos a entero
            batchIdToSave = parseInt(rawBatch);
        }

        // --- 3. LÓGICA DE MÉTODO DE PAGO ---
        // Protegemos contra undefined usando || 'standard'
        const currentClass = manualOrderForm.classification || 'standard';
        
        let finalPaymentMethod = manualOrderForm.paymentMethod;
        if (currentClass === 'gift') finalPaymentMethod = 'gift';
        if (currentClass === 'incident') finalPaymentMethod = 'incident';

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
                    cartId: item.cartId || (Date.now() + Math.random()),
                    image: item.image || null
                })),
                total: totalOrder,
                
                // Estado: Si es Individual va 'en_produccion', si es Lote se agrupa ('recopilando')
                status: batchIdToSave === 'INDIVIDUAL' ? 'en_produccion' : 'recopilando', 
                
                visibleStatus: 'Pedido Manual (Admin)',
                type: 'manual', 
                paymentMethod: finalPaymentMethod, 
                globalBatch: batchIdToSave,
                
                // --- AQUÍ ESTABA EL ERROR: EVITAR UNDEFINED ---
                manualOrderDetails: {
                    classification: currentClass,
                    responsibility: currentClass === 'incident' ? (manualOrderForm.incidentResponsibility || 'internal') : null
                },
                incidents: []
            });

            showNotification('Pedido manual creado correctamente');
            
            // Limpiar formulario y cerrar modal
            setManualOrderModal(false);
            setManualOrderForm(INITIAL_MANUAL_FORM_STATE);

        } catch (error) {
            console.error("Error detallado creando pedido manual:", error);
            // Mostrar error más descriptivo
            if (error.message.includes("undefined")) {
                showNotification('Error interno: Datos indefinidos en el formulario', 'error');
            } else {
                showNotification('Error al crear el pedido en base de datos', 'error');
            }
        }
    };

// Función auxiliar para añadir producto a la lista temporal (ACTUALIZADA)
    const addManualItemToOrder = () => {
        const { productId, size, name, number, quantity, activeName, activeNumber, activeSize, activeShield } = manualOrderForm.tempItem;
        if (!productId) return;

        const productDef = products.find(p => p.id === productId);
        const selectedClub = clubs.find(c => c.id === manualOrderForm.clubId);
        const clubColor = selectedClub ? (selectedClub.color || 'white') : 'white';

        // Precios base
        const defaults = productDef.defaults || { name: false, number: false, size: false, shield: true };
        const modifiable = productDef.modifiable || { name: true, number: true, size: true, shield: true };
        const fee = financialConfig.modificationFee || 0;

        let unitPrice = productDef.price;

        // Suplementos
        if (modifiable.size && (activeSize !== defaults.size)) unitPrice += fee;
        if (modifiable.name && (activeName !== defaults.name)) unitPrice += fee;
        if (modifiable.number && (activeNumber !== defaults.number)) unitPrice += fee;
        if (modifiable.shield && (activeShield !== defaults.shield)) unitPrice += fee;

        // --- LÓGICA DE PRECIO FINAL ---
        let finalPrice = unitPrice;
        let finalCost = productDef.cost || 0;
        
        // Usamos || 'standard' por seguridad
        const currentClass = manualOrderForm.classification || 'standard';

        if (currentClass === 'gift') {
            finalPrice = 0; 
        } else if (currentClass === 'incident') {
            const resp = manualOrderForm.incidentResponsibility || 'internal';
            if (resp === 'club') {
                finalPrice = unitPrice; // Fallo club = Se cobra
            } else if (resp === 'supplier') {
                finalPrice = 0;
                finalCost = 0; // Garantía = Coste 0
            } else {
                finalPrice = 0; // Fallo interno = Gratis cliente, pagamos nosotros
            }
        }

        const newItem = {
            productId,
            name: productDef.name,
            size: activeSize ? (size || 'Única') : '',
            playerName: activeName ? (name || '') : '',
            playerNumber: activeNumber ? (number || '') : '',
            color: clubColor,
            includeName: activeName,
            includeNumber: activeNumber,
            includeShield: activeShield,
            price: finalPrice, 
            quantity: parseInt(quantity),
            cost: finalCost,   
            image: productDef.image,
            cartId: Date.now() + Math.random()
        };

        setManualOrderForm({
            ...manualOrderForm,
            items: [...manualOrderForm.items, newItem],
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
      if(item.size) details.push(`Talla: ${item.size}`); // Me he asegurado de añadir Talla también

      // LÓGICA DE DETALLES EXTRA (J2/J3)
      if (item.details) {
          if (item.details.player2) details.push(`(J2: ${item.details.player2.name} #${item.details.player2.number})`);
          if (item.details.player3) details.push(`(J3: ${item.details.player3.name} #${item.details.player3.number})`);
          if (item.details.variant) details.push(`[${item.details.variant}]`);
      }

      return details.join(', ');
  };

// --- FUNCIÓN MODIFICADA: Ahora guarda FECHA y maneja el estado ---
  const toggleBatchPaymentStatus = (club, batchId, field) => {
      const currentLog = club.accountingLog || {};
      const batchLog = currentLog[batchId] || { 
          supplierPaid: false, clubPaid: false, commercialPaid: false, cashCollected: false 
      };
      
      const currentValue = batchLog[field];
      const newValue = !currentValue;
      
      // Definimos el nombre del campo de fecha (ej: supplierPaid -> supplierPaidDate)
      const dateField = `${field}Date`;

      const newBatchLog = { 
          ...batchLog, 
          [field]: newValue,
          // Si se marca como pagado/cobrado, guardamos fecha ISO. Si se desmarca, null.
          [dateField]: newValue ? new Date().toISOString() : null 
      };

      updateClub({
          ...club,
          accountingLog: {
              ...currentLog,
              [batchId]: newBatchLog
          }
      });
  };

  // --- NUEVA FUNCIÓN: Pide confirmación antes de cambiar el estado ---
  const handlePaymentChange = (club, batchId, field, currentStatus) => {
      const fieldLabels = {
          'cashCollected': 'Recogida de Efectivo',
          'supplierPaid': 'Pago a Proveedor',
          'commercialPaid': 'Pago a Comercial',
          'clubPaid': 'Pago al Club'
      };

      const action = currentStatus ? 'marcar como PENDIENTE' : 'marcar como COMPLETADO';
      const label = fieldLabels[field] || field;

      setConfirmation({
          title: "Confirmar Movimiento Contable",
          msg: `Vas a ${action} el concepto:\n\n👉 ${label}\nClub: ${club.name}\nLote: #${batchId}\n\n¿Confirmar cambio?`,
          onConfirm: () => toggleBatchPaymentStatus(club, batchId, field)
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
            {id: 'suppliers', label: 'Proveedores', icon: Factory}, // <--- NUEVO
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
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Comisión Comercial Global</label>
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
                            <ProductEditorRow 
                                key={p.id} 
                                product={p} 
                                updateProduct={updateProduct} 
                                deleteProduct={deleteProduct} 
                                suppliers={suppliers} // <--- AÑADE ESTA LÍNEA
                            />
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

{tab === 'suppliers' && (
                <div className="animate-fade-in-up">
                    <SupplierManager 
                        suppliers={suppliers}
                        products={products}
                        createSupplier={createSupplier}
                        updateSupplier={updateSupplier}
                        deleteSupplier={deleteSupplier}
                        updateProductCostBatch={updateProductCostBatch}
                    />
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
                                            <span className="text-[12px] mt-0.5 opacity-80">Pagamos coste ({incidentForm.cost}€)</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setIncidentForm({...incidentForm, internalOrigin: 'supplier'})}
                                            className={`px-2 py-2 text-xs rounded border transition-colors flex flex-col items-center ${incidentForm.internalOrigin === 'supplier' ? 'bg-white border-red-300 text-red-700 shadow-sm font-bold' : 'bg-red-100/50 border-transparent text-red-400 hover:bg-red-100'}`}
                                        >
                                            <span>El Proveedor</span>
                                            <span className="text-[12px] mt-0.5 opacity-80">Garantía (Coste 0€)</span>
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

                                {/* OPCIÓN INTELIGENTE PARA PEDIDO ERRORES */}
                                <option value="ERRORS" className="font-bold text-red-600">
                                    {(() => {
                                        // 1. Obtener ID del lote activo
                                        const c = clubs.find(cl => cl.id === incidentForm.order.clubId);
                                        const errId = c ? (c.activeErrorBatchId || 1) : 1;
                                        
                                        // 2. Comprobar si ya existen pedidos en ese lote (ERR-X)
                                        const batchKey = `ERR-${errId}`;
                                        const hasOrders = orders.some(o => o.clubId === incidentForm.order.clubId && o.globalBatch === batchKey);
                                        
                                        // 3. Mostrar texto dinámico
                                        if (hasOrders) {
                                            return `🚨 Pedido Errores #${errId} (En Curso)`;
                                        } else {
                                            return `🚨 Pedido Errores #${errId} (Lote Futuro - Abrir Nuevo)`;
                                        }
                                    })()}
                                </option>
                              
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
                                      <div className="col-span-1">
                                            <label className="text-[10px] block font-bold text-gray-400">Cant.</label>
                                            <input 
                                                type="number" 
                                                min="1"
                                                className="w-full text-sm border rounded p-1 text-gray-900" 
                                                /* AQUÍ ESTÁ EL CAMBIO: Añadir "|| 1" para que nunca salga vacío */
                                                value={item.quantity || 1} 
                                                onChange={(e) => { 
                                                    const newItems = [...editOrderModal.modified.items]; 
                                                    newItems[idx].quantity = parseInt(e.target.value) || 1; 
                                                    setEditOrderModal({...editOrderModal, modified: {...editOrderModal.modified, items: newItems}}); 
                                                }} 
                                            />
                                        </div>
                                      
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


    {/* MODAL DE STOCK PROVEEDORES */}
    <SupplierStockModal 
        active={supplierStockModal.active}
        onClose={() => setSupplierStockModal({ ...supplierStockModal, active: false })}
        batchId={supplierStockModal.batchId}
        orders={supplierStockModal.orders}
        club={supplierStockModal.club}
        suppliers={suppliers}
        products={products}
        onSend={handleSendSupplierEmails}
    />

    {/* --- MODAL CONFIRMACIÓN CAMBIO DE ESTADO --- */}
    {statusChangeModal.active && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-indigo-100">
                <div className="flex items-center gap-3 mb-4 text-indigo-900 border-b pb-3">
                    <div className="bg-indigo-100 p-2 rounded-full"><Mail className="w-5 h-5 text-indigo-600"/></div>
                    <h3 className="font-bold text-lg">Control de Notificaciones</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                    Vas a cambiar el estado del Lote <strong>#{statusChangeModal.batchId}</strong> a:
                    <span className="block mt-2 font-bold text-lg text-center bg-gray-100 py-1 rounded text-gray-800 uppercase">
                        {statusChangeModal.newStatus.replace('_', ' ')}
                    </span>
                </p>
                
                <p className="text-sm text-gray-500 mb-6 bg-blue-50 p-3 rounded border border-blue-100">
                    ⚠️ <strong>Avisos por Email:</strong> Elige si deseas informar a los clientes del cambio de estado.
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={() => executeBatchStatusUpdate(true)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-all group"
                    >
                        <span className="flex items-center gap-2"><Check className="w-5 h-5"/> Guardar y NOTIFICAR</span>
                        <span className="text-xs bg-emerald-500 px-2 py-1 rounded text-white group-hover:bg-emerald-600">Recomendado</span>
                    </button>

                    <button 
                        onClick={() => executeBatchStatusUpdate(false)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 hover:border-gray-400 text-gray-600 rounded-lg font-bold transition-all"
                    >
                        <X className="w-4 h-4"/> Guardar SIN avisar
                    </button>
                    
                    <button 
                        onClick={() => setStatusChangeModal({ ...statusChangeModal, active: false })}
                        className="w-full text-center text-xs text-gray-400 hover:text-gray-600 underline mt-2"
                    >
                        Cancelar Operación
                    </button>
                </div>
            </div>
        </div>
    )}

    {batchHistoryModal.active && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[80vh]">
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800">Historial del Lote #{batchHistoryModal.batchId}</h3>
                        <p className="text-xs text-gray-500">{batchHistoryModal.clubName}</p>
                    </div>
                    <button onClick={() => setBatchHistoryModal({...batchHistoryModal, active: false})} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-0 overflow-y-auto flex-1">
                    {batchHistoryModal.history && batchHistoryModal.history.length > 0 ? (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Cambio de Estado</th>
                                    <th className="px-6 py-3 text-center">Avisos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {batchHistoryModal.history.map((log, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="font-medium text-gray-900">
                                                {new Date(log.date).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs">
                                                {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400">{formatStatus(log.statusFrom)}</span>
                                                <ArrowRight className="w-3 h-3 text-gray-300" />
                                                <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border">
                                                    {formatStatus(log.statusTo)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {log.notifiedCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                                    <Mail className="w-3 h-3" /> {log.notifiedCount}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-2">
                            <AlertCircle className="w-10 h-10 opacity-20" />
                            <p>No hay registros de cambios para este lote.</p>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t bg-gray-50 text-right">
                    <button 
                        onClick={() => setBatchHistoryModal({...batchHistoryModal, active: false})}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}

    {/* --- MODAL GESTOR DE LOTES (V2 - CON OPCIONES DE BORRADO) --- */}
        {manageBatchModal.active && (
            <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
                    {/* Cabecera */}
                    <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Settings className="w-5 h-5 text-emerald-400"/> 
                                Gestionar Lote #{manageBatchModal.batchId}
                            </h3>
                            <p className="text-xs text-gray-400">{manageBatchModal.club?.name}</p>
                        </div>
                        <button onClick={() => setManageBatchModal({...manageBatchModal, active: false})} className="text-gray-400 hover:text-white">
                            <X className="w-6 h-6"/>
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Info */}
                        <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="bg-white p-2 rounded shadow-sm border border-gray-100">
                                <Package className="w-6 h-6 text-blue-600"/>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Contenido: {manageBatchModal.orders.length} pedidos</p>
                                <p className="text-xs text-gray-500">Selecciona qué hacer con este bloque de pedidos.</p>
                            </div>
                        </div>

                        {/* OPCIÓN 1: MOVER */}
                        <label className={`block relative p-4 rounded-xl border-2 cursor-pointer transition-all ${manageBatchModal.action === 'move' ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 hover:border-emerald-200'}`}>
                            <div className="flex items-start gap-3">
                                <input 
                                    type="radio" 
                                    name="bAction" 
                                    checked={manageBatchModal.action === 'move'}
                                    onChange={() => setManageBatchModal({...manageBatchModal, action: 'move'})}
                                    disabled={manageBatchModal.orders.length === 0}
                                    className="mt-1 w-4 h-4 accent-emerald-600"
                                />
                                <div className="flex-1">
                                    <span className={`font-bold block ${manageBatchModal.orders.length === 0 ? 'text-gray-400' : 'text-gray-800'}`}>Traspasar Pedidos</span>
                                    <p className="text-xs text-gray-500 mt-1">Mueve los pedidos a otro lote (ej. siguiente o errores) sin borrarlos.</p>
                                    
                                    {manageBatchModal.action === 'move' && (
                                        <div className="mt-3 animate-fade-in">
                                            <select 
                                                className="w-full border border-gray-300 rounded p-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                                value={manageBatchModal.targetBatch}
                                                onChange={(e) => setManageBatchModal({...manageBatchModal, targetBatch: e.target.value})}
                                            >
                                                <option value="">-- Seleccionar Destino --</option>
                                                
                                                {/* Opciones Especiales */}
                                                <option value="INDIVIDUAL">👤 Individual (Sueltos)</option>
                                                <option value="ERR_ACTIVE">🚨 Lote de Errores (Activo)</option>

                                                {/* Opciones Numéricas: Pasado, Presente y Futuro */}
                                                <optgroup label="--- Historial de Lotes ---">
                                                    {(() => {
                                                        const c = manageBatchModal.club;
                                                        if (!c) return null;
                                                        
                                                        const active = c.activeGlobalOrderId || 1;
                                                        const options = [];

                                                        // Generamos opciones desde el Activo + 1 (Futuro) bajando hasta el 1 (Histórico)
                                                        // Así puedes seleccionar cualquier lote anterior.
                                                        for(let i = active + 1; i >= 1; i--) {
                                                            let label = `Lote Global #${i}`;
                                                            
                                                            if (i === active) label = `📦 Lote Global #${i} (ACTIVO ACTUAL)`;
                                                            else if (i === active + 1) label = `✨ Lote Global #${i} (FUTURO)`;
                                                            else label = `⏪ Lote Global #${i} (Anterior)`;

                                                            options.push(<option key={i} value={i}>{label}</option>);
                                                        }
                                                        return options;
                                                    })()}
                                                </optgroup>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </label>

                        {/* OPCIÓN 2: ELIMINAR */}
                        <label className={`block relative p-4 rounded-xl border-2 cursor-pointer transition-all ${manageBatchModal.action === 'delete' ? 'border-red-500 bg-red-50/20' : 'border-gray-200 hover:border-red-200'}`}>
                            <div className="flex items-start gap-3">
                                <input 
                                    type="radio" 
                                    name="bAction" 
                                    checked={manageBatchModal.action === 'delete'}
                                    onChange={() => setManageBatchModal({...manageBatchModal, action: 'delete'})}
                                    className="mt-1 w-4 h-4 accent-red-600"
                                />
                                <div className="flex-1">
                                    <span className="font-bold text-red-700 block">Eliminar / Vaciar</span>
                                    <p className="text-xs text-red-600/80 mt-1">Acciones destructivas sobre el lote.</p>

                                    {manageBatchModal.action === 'delete' && (
                                        <div className="mt-3 space-y-2 animate-fade-in pl-1">
                                            
                                         {/* Opción A: Borrar Lote Entero (LÓGICA MEJORADA) */}
                                            {(() => {
                                                const mBatch = manageBatchModal.batchId;
                                                const mClub = manageBatchModal.club;
                                                if(!mClub) return null;

                                                let showDeleteOption = false;

                                                // CASO 1: Lote Numérico (Estándar)
                                                // Debe ser igual al activo y mayor o igual a 1
                                                if (typeof mBatch === 'number') {
                                                    const activeStd = parseInt(mClub.activeGlobalOrderId || 1);
                                                    showDeleteOption = (mBatch === activeStd && activeStd >= 1);
                                                }

                                                // CASO 2: Lote de Errores (String tipo "ERR-2")
                                                // Extraemos el número "2" y comparamos con el activo de errores
                                                if (typeof mBatch === 'string' && mBatch.startsWith('ERR')) {
                                                    const parts = mBatch.split('-'); // ["ERR", "2"]
                                                    if (parts.length === 2) {
                                                        const batchNum = parseInt(parts[1]);
                                                        const activeErr = parseInt(mClub.activeErrorBatchId || 1);
                                                        // Mostramos si coincide con el activo (ej: 2 === 2)
                                                        showDeleteOption = (batchNum === activeErr && activeErr >= 1);
                                                    }
                                                }

                                                if (showDeleteOption) {
                                                    return (
                                                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-red-50 transition-colors animate-fade-in">
                                                            <input 
                                                                type="radio" 
                                                                name="delType"
                                                                checked={manageBatchModal.deleteType === 'full'}
                                                                onChange={() => setManageBatchModal({...manageBatchModal, deleteType: 'full'})}
                                                                className="w-4 h-4 accent-red-600"
                                                            />
                                                            <div>
                                                                <span className="text-xs font-bold text-gray-800 block">
                                                                    Eliminar Lote y Retroceder
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 block">
                                                                    Borra el lote actual y vuelve a activar el anterior.
                                                                </span>
                                                            </div>
                                                        </label>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {/* Opción B: Solo vaciar */}
                                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-red-50 transition-colors">
                                                <input 
                                                    type="radio" 
                                                    name="delType"
                                                    checked={manageBatchModal.deleteType === 'empty'}
                                                    onChange={() => setManageBatchModal({...manageBatchModal, deleteType: 'empty'})}
                                                    className="w-4 h-4 accent-red-600"
                                                />
                                                <div>
                                                    <span className="text-xs font-bold text-gray-800 block">Solo Vaciar Pedidos</span>
                                                    <span className="text-[10px] text-gray-500 block">Borra los pedidos pero mantiene el lote visible (vacío).</span>
                                                </div>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </label>
                    </div>

                    <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                        <Button variant="secondary" onClick={() => setManageBatchModal({...manageBatchModal, active: false})}>Cancelar</Button>
                        <Button 
                            onClick={executeBatchManagement}
                            className={`${manageBatchModal.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow-md`}
                        >
                            {manageBatchModal.action === 'delete' ? 'Confirmar Eliminación' : 'Confirmar Traspaso'}
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

            {/* Selector Central (MODIFICADO: Ahora usa filterClubId) */}
            <div className="flex items-center gap-6 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
                <div className="relative group flex items-center">
                    <select 
                        className="appearance-none bg-transparent text-base font-extrabold text-slate-700 pr-8 cursor-pointer outline-none hover:text-blue-600 transition-colors"
                        value={filterClubId} // Usamos el estado del filtro
                        onChange={(e) => setFilterClubId(e.target.value)} // Actualizamos el filtro directamente
                    >
                        <option value="all">Todos los Clubes</option> {/* Opción por defecto */}
                        {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronRight className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none rotate-90"/>
                </div>
                
                {/* Solo mostramos el Lote Activo si hay un club concreto seleccionado */}
                {filterClubId !== 'all' && (
                    <>
                        <div className="h-8 w-px bg-slate-100"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 font-bold uppercase">Lote Activo:</span>
                            <span className="text-base font-extrabold text-slate-800">
                                #{clubs.find(c => c.id === filterClubId)?.activeGlobalOrderId || '-'}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Acciones Globales */}
            <div className="flex items-center gap-2">
                {/* BOTÓN NUEVO: CREAR PEDIDO MANUAL (Actualizado para manejar 'all') */}
                <button 
                    onClick={() => {
                        // Si hay un club filtrado, lo pre-seleccionamos. Si es 'all', lo dejamos en blanco.
                        const preSelectedClub = filterClubId !== 'all' ? filterClubId : '';
                        const preSelectedBatch = preSelectedClub ? clubs.find(c => c.id === preSelectedClub)?.activeGlobalOrderId : '';

                        setManualOrderForm({
                            ...manualOrderForm, 
                            clubId: preSelectedClub, 
                            targetBatch: preSelectedBatch || ''
                        });
                        setManualOrderModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded shadow flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4"/> Nuevo Pedido Manual
                </button>
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
                            // 1. Identificar tipo de lote
                            const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                            const isStandard = typeof batch.id === 'number';

                            // 2. Identificar si está activo
                            const isActiveStandard = isStandard && batch.id === club.activeGlobalOrderId;
                            const isActiveError = isErrorBatch && batch.id === `ERR-${club.activeErrorBatchId || 1}`;

                            // Estado y totales
                            // Si es Error Batch, también puede tener estado 'recopilando', etc.
                            const status = (!isStandard && !isErrorBatch) ? 'special' : (batch.orders[0]?.status || 'recopilando');
                            const isProduction = ['en_produccion', 'entregado_club'].includes(status);
                            const batchTotal = batch.orders.reduce((sum, o) => sum + o.total, 0);

                            return (
                                <div key={batch.id} className={`p-4 transition-colors ${isActiveStandard ? 'bg-emerald-50/40' : isActiveError ? 'bg-red-50/40' : 'bg-white'}`}>
                                    
                                    {/* 1. CABECERA DEL LOTE */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            
                                            {/* --- BOTÓN COLAPSAR/EXPANDIR --- */}
                                            <button 
                                                onClick={() => toggleBatch(batch.id)}
                                                className="p-1 rounded-full hover:bg-black/10 transition-colors"
                                            >
                                                <ChevronRight 
                                                    className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${collapsedBatches.includes(batch.id) ? '' : 'rotate-90'}`}
                                                />
                                            </button>
                                            {/* ------------------------------- */}
                                            
                                            {/* TÍTULOS DINÁMICOS - ROJO SUAVIZADO (text-red-600 en vez de 700) */}
                                            {isErrorBatch ? (
                                                <span className="font-black text-lg text-red-600 flex items-center gap-2">
                                                    <AlertTriangle className="w-5 h-5"/>
                                                    PEDIDO ERRORES #{batch.id.split('-')[1]}
                                                </span>
                                            ) : isStandard ? (
                                                <span className="font-bold text-lg text-emerald-900">Pedido Global #{batch.id}</span>
                                            ) : (
                                                <span className="font-black text-lg text-gray-700 flex items-center gap-2">
                                                    {batch.id === 'SPECIAL' ? <Briefcase className="w-5 h-5 text-indigo-600"/> : <Package className="w-5 h-5 text-orange-600"/>}
                                                    {batch.id === 'SPECIAL' ? 'ESPECIALES' : 'INDIVIDUALES'}
                                                </span>
                                            )}

                                            {/* ETIQUETA ACTIVO - ROJO SUAVIZADO (bg-red-500 en vez de 600) */}
                                            {(isActiveStandard || isActiveError) && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isErrorBatch ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
                                                    Activo
                                                </span>
                                            )}

                                            {/* Badge de estado (Para Standard y Errores) */}
                                            {(isStandard || isErrorBatch) && <Badge status={status} />}
                                            
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 border">
                                                Total: {batchTotal.toFixed(2)}€
                                            </span>

                                            {/* GESTIÓN DE FECHA DE CIERRE (Solo para Lotes Estándar) */}
                                            {isStandard && isActiveStandard && (
                                                <div className="ml-2">
                                                    {editingDate.clubId === club.id ? (
                                                        // MODO EDICIÓN FECHA
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
                                                                >
                                                                    <Check className="w-3.5 h-3.5"/>
                                                                </button>
                                                                <button 
                                                                    onClick={() => setEditingDate({ clubId: null, date: '' })}
                                                                    className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5"/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // MODO VISUALIZACIÓN FECHA
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
                                            <Button 
                                                size="xs" 
                                                variant="outline" 
                                                disabled={batch.orders.length === 0} 
                                                onClick={() => printBatchAlbaran(batch.id, batch.orders, club.name, club.commission || 0.12)}
                                            >
                                                <Printer className="w-3 h-3 mr-1"/> Albarán
                                            </Button>

                                            {/* Stock y Cambio de Estado (Común para Standard y Errores) */}
                                            {(isStandard || isErrorBatch) && (
                                                <>
                                                    <Button 
                                                        size="xs" 
                                                        variant="outline"
                                                        className="ml-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                        disabled={batch.orders.length === 0}
                                                        onClick={() => setSupplierStockModal({ 
                                                            active: true, 
                                                            batchId: batch.id, 
                                                            orders: batch.orders, 
                                                            club: club 
                                                        })}
                                                    >
                                                        <Factory className="w-3 h-3 mr-1"/> Stock Prov.
                                                    </Button>

                                                    <div className="flex items-center gap-2 ml-2 border-l pl-2 border-gray-300">
                                                        <select 
                                                            value={status}
                                                            onChange={(e) => {
                                                                e.preventDefault();
                                                                initiateStatusChange(club.id, batch.id, e.target.value);
                                                            }}
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
                                                        <button 
                                                            onClick={() => {
                                                                const history = club.batchHistory?.filter(h => h.batchId === batch.id) || [];
                                                                setBatchHistoryModal({ 
                                                                    active: true, 
                                                                    history: history.sort((a,b) => new Date(b.date) - new Date(a.date)),
                                                                    batchId: batch.id, 
                                                                    clubName: club.name 
                                                                });
                                                            }}
                                                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200 transition-colors"
                                                        >
                                                            <NotebookText className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {/* --- PEGAR AQUÍ EL NUEVO BOTÓN (PASO 2) --- */}
                                            <button 
                                                onClick={() => openManageBatchModal(club, batch.id, batch.orders)}
                                                className="p-2 ml-2 rounded-lg bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm group"
                                                title="Gestionar o Eliminar Lote"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                        </div>
                                    </div>

                                    {/* 2. LISTA DE PEDIDOS (Con lógica de colapsado) */}
                                    {!collapsedBatches.includes(batch.id) ? (
                                        <>
                                            {batch.orders.length === 0 ? (
                                                <div className="pl-4 border-l-4 border-gray-200 py-4 text-gray-400 text-sm italic">
                                                    Aún no hay pedidos en este lote.
                                                </div>
                                            ) : (
                                                <div className={`pl-4 border-l-4 space-y-2 ${isErrorBatch ? 'border-red-200' : 'border-gray-200'}`}>
                                                    {batch.orders.map(order => (
                                                        <div key={order.id} className={`border rounded-lg bg-white shadow-sm overflow-hidden transition-all hover:border-emerald-300 group/order ${order.type === 'manual' ? 'border-l-4 border-l-orange-400' : order.type === 'replacement' ? 'border-l-4 border-l-red-500' : ''}`}>
                                                    
                                                            {/* CABECERA TARJETA */}
                                                            <div 
                                                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)} 
                                                                className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 select-none"
                                                            >
                                                                <div className="flex gap-4 items-center">
                                                                    {/* Etiquetas de Tipo (MANTENIDAS) */}
                                                                    {order.type === 'special' ? (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">ESP</span>
                                                                    ) : order.type === 'manual' ? (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                                                                            <Edit3 className="w-3 h-3"/> MANUAL
                                                                        </span>
                                                                    ) : order.type === 'replacement' ? (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                                                            <AlertTriangle className="w-3 h-3"/> ERROR
                                                                        </span>
                                                                    ) : order.globalBatch === 'INDIVIDUAL' ? (
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">IND</span>
                                                                    ) : (
                                                                        <span className="font-mono text-xs font-bold bg-gray-100 border px-1 rounded text-gray-600">#{order.id.slice(0,6)}</span>
                                                                    )}
                                                                    
                                                                    <span className="font-bold text-sm text-gray-800">{order.customer.name}</span>
                                                                    
                                                                    {/* --- AQUÍ ESTÁ EL CAMBIO: SELECTOR PARA INDIVIDUALES --- */}
                                                                    {batch.id === 'INDIVIDUAL' ? (
                                                                            <div onClick={(e) => e.stopPropagation()}> 
                                                                                <select
                                                                                    value={order.status}
                                                                                    onChange={(e) => {
                                                                                        const newSt = e.target.value;
                                                                                        // Definimos el texto visible según la opción elegida
                                                                                        let visibleSt = 'Actualizado';
                                                                                        if (newSt === 'pendiente_validacion') visibleSt = 'Pendiente';
                                                                                        if (newSt === 'en_produccion') visibleSt = 'En Producción';
                                                                                        if (newSt === 'entregado_club') visibleSt = 'Entregado';

                                                                                        updateOrderStatus(order.id, newSt, visibleSt);
                                                                                    }}
                                                                                    className={`text-[10px] font-bold uppercase py-1 px-2 rounded border cursor-pointer outline-none ${
                                                                                        order.status === 'en_produccion' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                                                                        order.status === 'entregado_club' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                                        'bg-yellow-100 text-yellow-800 border-yellow-200' // Para Pendiente
                                                                                    }`}
                                                                                >
                                                                                    <option value="pendiente_validacion">Pendiente</option>
                                                                                    <option value="en_produccion">En Producción</option>
                                                                                    <option value="entregado_club">Entregado</option>
                                                                                </select>
                                                                            </div>
                                                                        ) : (
                                                                            // Si no es individual, mantenemos el comportamiento normal (Badge estático)
                                                                            (!isStandard && !isErrorBatch) && <Badge status={order.status} />
                                                                        )}
                                                                </div>
                                                                <div className="flex gap-4 items-center text-sm">
                                                                    <span className="font-bold">{order.total.toFixed(2)}€</span>
                                                                    <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-90' : ''}`}/>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* DETALLE EXPANDIDO */}
                                                            {expandedOrderId === order.id && (
                                                                <div className="p-4 bg-gray-50 border-t border-gray-100 text-sm animate-fade-in-down">
                                                                    
                                                                    {/* Si es una reposición, mostramos el motivo */}
                                                                    {order.incidentDetails && (
                                                                        <div className="mb-4 bg-red-50 p-3 rounded border border-red-100 text-red-800 text-xs">
                                                                            <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Detalles del Fallo:</p>
                                                                            <p className="mt-1">"{order.incidentDetails.reason}"</p>
                                                                            <p className="mt-1 opacity-75">
                                                                                Responsable: {order.incidentDetails.responsibility === 'internal' ? 'Interno' : 'Club'}
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                    <h5 className="font-bold text-gray-500 mb-3 text-xs uppercase flex items-center gap-2"><Package className="w-3 h-3"/> Productos</h5>
                                                                    <div className="bg-white rounded border border-gray-200 divide-y divide-gray-100 mb-4">
                                                                        {order.items.map(item => {
                                                                            const isIncident = order.incidents?.some(inc => inc.itemId === item.cartId && !inc.resolved);
                                                                            return (
                                                                                <div key={item.cartId || Math.random()} className="flex justify-between items-center p-3 hover:bg-gray-50">
                                                                                    <div className="flex gap-3 items-center flex-1">
                                                                                        {item.image ? <img src={item.image} className="w-10 h-10 object-cover rounded bg-gray-200 border" /> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300"><Package className="w-5 h-5"/></div>}
                                                                                        <div>
                                                                                            <p className="font-bold text-gray-800 text-sm">{item.name}</p>
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

                                                                    {/* --- HISTORIAL DE NOTIFICACIONES --- */}
                                                                    <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                                        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                                                                            <h5 className="font-bold text-gray-600 text-xs uppercase flex items-center gap-2">
                                                                                <Mail className="w-3 h-3"/> Historial de Avisos
                                                                            </h5>
                                                                            <span className="text-[10px] text-gray-400">{order.notificationLog ? order.notificationLog.length : 0} registros</span>
                                                                        </div>
                                                                        
                                                                        <div className="max-h-32 overflow-y-auto">
                                                                            {order.notificationLog && order.notificationLog.length > 0 ? (
                                                                                <table className="w-full text-left text-[10px]">
                                                                                    <thead className="bg-gray-50 text-gray-400">
                                                                                        <tr>
                                                                                            <th className="px-3 py-1 font-medium">Fecha</th>
                                                                                            <th className="px-3 py-1 font-medium">Cambio</th>
                                                                                            <th className="px-3 py-1 font-medium">Canal</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-gray-50">
                                                                                        {order.notificationLog.map((log, i) => (
                                                                                            <tr key={i} className="hover:bg-gray-50">
                                                                                                <td className="px-3 py-1.5 text-gray-600">
                                                                                                    {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                                                </td>
                                                                                                <td className="px-3 py-1.5">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <span className="text-xs text-gray-400 font-medium">{formatStatus(log.statusFrom)}</span>
                                                                                                        <ArrowRight className="w-3 h-3 text-emerald-500" />
                                                                                                        <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{formatStatus(log.statusTo)}</span>
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td className="px-3 py-1.5">
                                                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${log.method === 'email' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                                                                                        {log.method.toUpperCase()}
                                                                                                    </span>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            ) : (
                                                                                <p className="p-3 text-xs text-gray-400 italic text-center">No se han enviado notificaciones.</p>
                                                                            )}
                                                                        </div>
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
                                                                            <Edit3 className="w-3 h-3"/> Modificar
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
                                        </>
                                    ) : (
                                        /* ESTADO COLAPSADO */
                                        <div className="pl-4 py-2 text-xs text-gray-400 italic bg-gray-50 border-t border-gray-100">
                                            <span className="font-bold">{batch.orders.length} pedidos ocultos.</span> Haz clic en la flecha de la cabecera para desplegar.
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

{/* --- MODAL DE CREACIÓN DE PEDIDO MANUAL (MEJORADO) --- */}
        {manualOrderModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Cabecera */}
                    <div className="bg-gray-800 p-5 flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <Plus className="w-6 h-6 text-emerald-400"/>
                            <div>
                                <h3 className="text-lg font-bold">Nuevo Pedido Manual</h3>
                                <p className="text-xs text-gray-400">Configura destino y tipo de cobro</p>
                            </div>
                        </div>
                        <button onClick={() => setManualOrderModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>

                    {/* Cuerpo Scrollable */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        
                        {/* 1. SELECCIÓN DE CLUB */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Club</label>
                            <select 
                                className="w-full border rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-700"
                                value={manualOrderForm.clubId}
                                onChange={(e) => {
                                    const c = clubs.find(cl => cl.id === e.target.value);
                                    setManualOrderForm({...manualOrderForm, clubId: e.target.value, targetBatch: c?.activeGlobalOrderId});
                                }}
                            >
                                <option value="">-- Seleccionar Club --</option>
                                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {manualOrderForm.clubId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                
                                {/* 2. DESTINO DEL PEDIDO (LOTE) - SIN DUPLICADOS */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">¿Dónde añadirlo?</label>
                                    <select 
                                        className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={manualOrderForm.targetBatch}
                                        onChange={e => setManualOrderForm({...manualOrderForm, targetBatch: e.target.value})}
                                    >
                                        <option value="INDIVIDUAL">📦 Individual / Suelto</option>
                                        
                                        {/* GRUPO: PEDIDOS GLOBALES */}
                                        <optgroup label="--- Lotes Globales ---">
                                            {(() => {
                                                const c = clubs.find(cl => cl.id === manualOrderForm.clubId);
                                                if (!c) return null;

                                                const activeBatchId = c.activeGlobalOrderId; // Ej: 15 (Number)
                                                const options = [];
                                                const seenValues = new Set(); // Para controlar duplicados

                                                // 1. Añadir SIEMPRE el Lote Activo primero
                                                if (activeBatchId) {
                                                    const val = activeBatchId.toString();
                                                    seenValues.add(val);
                                                    options.push(
                                                        <option key={`global-active-${val}`} value={activeBatchId}>
                                                            🔥 Global Activo #{activeBatchId}
                                                        </option>
                                                    );
                                                }

                                                // 2. Buscar otros lotes abiertos en la base de datos
                                                orders
                                                    .filter(o => 
                                                        o.clubId === manualOrderForm.clubId && 
                                                        !['SPECIAL', 'INDIVIDUAL'].includes(o.globalBatch) && 
                                                        !o.globalBatch.toString().startsWith('ERR-') && 
                                                        ['recopilando', 'en_produccion'].includes(o.status)
                                                    )
                                                    .forEach(o => {
                                                        const val = o.globalBatch.toString();
                                                        // Solo añadir si no lo hemos pintado ya (evita duplicar el activo)
                                                        if (!seenValues.has(val)) {
                                                            seenValues.add(val);
                                                            options.push(
                                                                <option key={o.id} value={o.globalBatch}>
                                                                    Global #{o.globalBatch} ({o.status === 'recopilando' ? 'Abierto' : 'Prod.'})
                                                                </option>
                                                            );
                                                        }
                                                    });

                                                return options;
                                            })()}
                                        </optgroup>

                                        {/* GRUPO: LOTES DE ERRORES */}
                                        <optgroup label="--- Lotes de Errores ---" className="text-red-600 font-bold">
                                            {(() => {
                                                const c = clubs.find(cl => cl.id === manualOrderForm.clubId);
                                                const activeErrId = c ? (c.activeErrorBatchId || 1) : 1;
                                                const activeErrBatch = `ERR-${activeErrId}`;
                                                
                                                const options = [];
                                                const seenValues = new Set(); // Resetear control de duplicados para este grupo

                                                // 1. Buscar lotes de errores existentes en BD
                                                const errorBatches = orders.filter(o => 
                                                    o.clubId === manualOrderForm.clubId && 
                                                    o.globalBatch && 
                                                    o.globalBatch.toString().startsWith('ERR-') && 
                                                    ['recopilando', 'en_produccion'].includes(o.status)
                                                );

                                                // 2. Procesar los existentes primero (para ordenarlos mejor)
                                                // Creamos una lista temporal combinada
                                                const allErrOptions = [];

                                                // A) Añadimos el "Teórico Activo" si no existe en la BD aún
                                                const existsActiveInDB = errorBatches.some(o => o.globalBatch === activeErrBatch);
                                                if (!existsActiveInDB) {
                                                    allErrOptions.push({
                                                        val: activeErrBatch,
                                                        label: `🚨 Errores Activo #${activeErrId} (Nuevo)`,
                                                        isNew: true
                                                    });
                                                }

                                                // B) Añadimos los que vienen de la BD
                                                errorBatches.forEach(o => {
                                                    const isRecopilando = o.status === 'recopilando';
                                                    allErrOptions.push({
                                                        val: o.globalBatch,
                                                        label: `${isRecopilando ? '🚨' : '⚠️'} ${o.visibleStatus || o.globalBatch} (${isRecopilando ? 'Abierto' : 'Prod.'})`,
                                                        isNew: false
                                                    });
                                                });

                                                // 3. Renderizar evitando duplicados reales y ordenando
                                                // Ordenar: Texto descendente (ERR-2 antes que ERR-1)
                                                allErrOptions.sort((a, b) => b.val.localeCompare(a.val, undefined, { numeric: true }));

                                                allErrOptions.forEach((opt, idx) => {
                                                    if (!seenValues.has(opt.val)) {
                                                        seenValues.add(opt.val);
                                                        options.push(
                                                            <option key={`${opt.val}-${idx}`} value={opt.val}>
                                                                {opt.label}
                                                            </option>
                                                        );
                                                    }
                                                });

                                                return options;
                                            })()}
                                        </optgroup>
                                    </select>
                                </div>

                                {/* 3. TIPO DE PEDIDO (VENTA / REGALO / FALLO) */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Clasificación</label>
                                    <select 
                                        className={`w-full border rounded-lg p-2.5 text-sm font-bold outline-none focus:ring-2 ${
                                            manualOrderForm.classification === 'standard' ? 'border-gray-300 text-gray-800 focus:ring-emerald-500' :
                                            manualOrderForm.classification === 'gift' ? 'border-blue-300 bg-blue-50 text-blue-700 focus:ring-blue-500' :
                                            'border-red-300 bg-red-50 text-red-700 focus:ring-red-500'
                                        }`}
                                        value={manualOrderForm.classification}
                                        onChange={e => setManualOrderForm({...manualOrderForm, classification: e.target.value})}
                                    >
                                        <option value="standard">💰 Venta Normal</option>
                                        <option value="gift">🎁 Regalo (Coste Interno)</option>
                                        <option value="incident">⚠️ Fallo / Reposición</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* SUB-OPCIONES PARA FALLO */}
                        {manualOrderForm.classification === 'incident' && (
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col gap-2 animate-fade-in">
                                <label className="text-xs font-bold text-red-700 uppercase">¿Quién asume el coste?</label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setManualOrderForm({...manualOrderForm, incidentResponsibility: 'internal'})}
                                        className={`flex-1 py-2 text-xs rounded border transition-colors ${manualOrderForm.incidentResponsibility === 'internal' ? 'bg-white border-red-400 text-red-700 font-bold shadow-sm' : 'border-transparent hover:bg-red-100 text-red-500'}`}
                                    >
                                        Fallo Nuestro (Coste Empresa)
                                    </button>
                                    <button 
                                        onClick={() => setManualOrderForm({...manualOrderForm, incidentResponsibility: 'supplier'})}
                                        className={`flex-1 py-2 text-xs rounded border transition-colors ${manualOrderForm.incidentResponsibility === 'supplier' ? 'bg-white border-red-400 text-red-700 font-bold shadow-sm' : 'border-transparent hover:bg-red-100 text-red-500'}`}
                                    >
                                        Garantía Proveedor (Coste 0)
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 4. DATOS CLIENTE */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b border-gray-200 pb-2">Datos Cliente</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input placeholder="Nombre Completo" className="border rounded p-2 text-sm" value={manualOrderForm.customerName} onChange={e => setManualOrderForm({...manualOrderForm, customerName: e.target.value})} />
                                <input placeholder="Email (Opcional)" className="border rounded p-2 text-sm" value={manualOrderForm.customerEmail} onChange={e => setManualOrderForm({...manualOrderForm, customerEmail: e.target.value})} />
                                <input placeholder="Teléfono" className="border rounded p-2 text-sm" value={manualOrderForm.customerPhone} onChange={e => setManualOrderForm({...manualOrderForm, customerPhone: e.target.value})} />
                                
                                {manualOrderForm.classification === 'standard' ? (
                                    <select 
                                        className="border rounded p-2 text-sm font-bold text-gray-700" 
                                        value={manualOrderForm.paymentMethod} 
                                        onChange={e => setManualOrderForm({...manualOrderForm, paymentMethod: e.target.value})}
                                    >
                                        <option value="transfer">Transferencia</option>
                                        <option value="bizum">Bizum</option>
                                        <option value="cash">Efectivo</option>
                                    </select>
                                ) : (
                                    <div className="border rounded p-2 text-sm bg-gray-200 text-gray-500 font-bold italic text-center">
                                        {manualOrderForm.classification === 'gift' ? 'Sin Cobro (Regalo)' : 'Sin Cobro (Incidencia)'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5. AÑADIR PRODUCTOS (CARRITO MANUAL) */}
                        <div className={`p-4 rounded-xl border ${manualOrderForm.classification === 'standard' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-200'}`}>
                            <h4 className="text-xs font-bold uppercase mb-3 flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4"/> Productos
                            </h4>
                            
                            <div className="flex flex-wrap items-end gap-2 mb-4 bg-white p-3 rounded-lg border shadow-sm">
                                
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
                                <div className="space-y-2 mt-4">
                                    {manualOrderForm.items.map((it, idx) => {
                                        // Buscamos la etiqueta del color para mostrarla bonita
                                        const colorLabel = AVAILABLE_COLORS.find(c => c.id === it.color)?.label || it.color;
                                        
                                        return (
                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 text-sm shadow-sm">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">{it.quantity}x</span>
                                                        <span className="font-bold text-gray-800">{it.name}</span>
                                                    </div>
                                                    
                                                    {/* DETALLES DE PERSONALIZACIÓN */}
                                                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 pl-8">
                                                        {/* Talla */}
                                                        {it.size && (
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">
                                                                T: <b>{it.size}</b>
                                                            </span>
                                                        )}
                                                        
                                                        {/* Color */}
                                                        {it.color && (
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 flex items-center gap-1">
                                                                <span className="w-2 h-2 rounded-full border border-gray-300" style={{background: AVAILABLE_COLORS.find(c=>c.id===it.color)?.hex || it.color}}></span>
                                                                {colorLabel}
                                                            </span>
                                                        )}

                                                        {/* Nombre */}
                                                        {it.playerName && (
                                                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                                                N: <b>{it.playerName}</b>
                                                            </span>
                                                        )}

                                                        {/* Dorsal */}
                                                        {it.playerNumber && (
                                                            <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">
                                                                #: <b>{it.playerNumber}</b>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-gray-900">{it.price.toFixed(2)}€</span>
                                                    <button onClick={() => {
                                                        const newItems = [...manualOrderForm.items];
                                                        newItems.splice(idx, 1);
                                                        setManualOrderForm({...manualOrderForm, items: newItems});
                                                    }} className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded">
                                                        <X className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Total Estimado</span>
                                        <span className="text-xl font-black text-emerald-700">
                                            {manualOrderForm.items.reduce((acc, i) => acc + (i.price*i.quantity), 0).toFixed(2)}€
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Botones */}
                    <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                        <button 
                            onClick={() => {
                                setManualOrderModal(false);
                                setManualOrderForm(INITIAL_MANUAL_FORM_STATE); // <--- Añadir esto para limpiar al cancelar
                            }} 
                            className="px-4 py-2 text-gray-500 hover:text-gray-800 font-bold text-sm"
                        >
                            Cancelar
                        </button>
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
                  
                  {/* ZONA DE FILTROS (Club y Temporada) */}
                  <div className="flex gap-3">
                      {/* Selector Club (NUEVO) */}
                      <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                          <Store className="w-4 h-4 text-gray-500"/>
                          <select 
                              className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" 
                              value={filterClubId} 
                              onChange={(e) => setFilterClubId(e.target.value)}
                          >
                              <option value="all">Todos los Clubes</option>
                              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>

                      {/* Selector Temporada (EXISTENTE) */}
                      <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                          <Calendar className="w-4 h-4 text-gray-500"/>
                          <select 
                              className="bg-transparent border-none font-medium focus:ring-0 cursor-pointer text-sm outline-none" 
                              value={financeSeasonId} 
                              onChange={(e) => setFinanceSeasonId(e.target.value)}
                          >
                              <option value="all">Todas las Temporadas</option>
                              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>
                  </div>
              </div>

              {/* --- TARJETAS DE RESUMEN (CON BENEFICIO NETO) --- */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
                  
                  {/* Tarjeta 1: BENEFICIO NETO (NUEVA) */}
                  <div className="md:col-span-1 bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><BarChart3 className="w-16 h-16"/></div>
                    <p className="text-xs font-bold text-emerald-700 uppercase z-10">Beneficio Neto Total</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1 z-10">{globalAccountingStats.totalNetProfit.toFixed(2)}€</p>
                    <p className="text-[9px] text-emerald-600/70 z-10 mt-1 leading-tight">Ganancia limpia tras gastos.</p>
                  </div>

                  {/* Tarjeta 2: Ingresos Banco/Tarjeta */}
                  <div className="md:col-span-1 bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase">Banco / Tarjeta</p>
                    <p className="text-xl font-bold text-blue-600 mt-1">{globalAccountingStats.cardTotal.toFixed(2)}€</p>
                    
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Pasarela:</span>
                            <span className="text-red-500 font-bold">-{globalAccountingStats.cardFees.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-blue-800">
                            <span>Neto Banco:</span>
                            <span>{(globalAccountingStats.cardTotal - globalAccountingStats.cardFees).toFixed(2)}€</span>
                        </div>
                    </div>
                  </div>

                  {/* Tarjeta 3: Efectivo */}
                  <div className="md:col-span-1 bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase">Caja Efectivo</p>
                      <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded" 
                               onClick={() => setAccDetailsModal({ active: true, title: 'Efectivo YA Recogido', items: globalAccountingStats.cash.listCollected, type: 'success' })}>
                              <span className="text-gray-600">Recogido:</span>
                              <span className="font-bold text-green-600">{globalAccountingStats.cash.collected.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center text-xs cursor-pointer bg-red-50 p-1 rounded hover:bg-red-100 transition-colors"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Efectivo PENDIENTE de Recoger', items: globalAccountingStats.cash.listPending, type: 'error' })}>
                              <span className="text-red-800 font-bold">Pendiente:</span>
                              <span className="font-black text-red-600">{globalAccountingStats.cash.pending.toFixed(2)}€</span>
                          </div>
                      </div>
                  </div>

                  {/* Tarjeta 4: Proveedor */}
                  <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase">Pagos Proveedor</p>
                      <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Proveedor PAGADO', items: globalAccountingStats.supplier.listPaid, type: 'success' })}>
                              <span className="text-gray-600">Pagado:</span>
                              <span className="font-bold text-green-600">{globalAccountingStats.supplier.paid.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center text-xs cursor-pointer bg-orange-50 p-1 rounded hover:bg-orange-100 transition-colors"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Proveedor PENDIENTE', items: globalAccountingStats.supplier.listPending, type: 'warning' })}>
                              <span className="text-orange-800 font-bold">Deuda:</span>
                              <span className="font-black text-orange-600">{globalAccountingStats.supplier.pending.toFixed(2)}€</span>
                          </div>
                      </div>
                  </div>

                  {/* Tarjeta 5: Comercial */}
                  <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase">Com. Comercial</p>
                      <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Comercial PAGADO', items: globalAccountingStats.commercial.listPaid, type: 'success' })}>
                              <span className="text-gray-600">Pagado:</span>
                              <span className="font-bold text-green-600">{globalAccountingStats.commercial.paid.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center text-xs cursor-pointer bg-blue-50 p-1 rounded hover:bg-blue-100 transition-colors"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Comercial PENDIENTE', items: globalAccountingStats.commercial.listPending, type: 'info' })}>
                              <span className="text-blue-800 font-bold">Deuda:</span>
                              <span className="font-black text-blue-600">{globalAccountingStats.commercial.pending.toFixed(2)}€</span>
                          </div>
                      </div>
                  </div>

                  {/* Tarjeta 6: Club */}
                  <div className="md:col-span-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase">Pagos a Clubes</p>
                      <div className="mt-2 space-y-1">
                          <div className="flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Club PAGADO', items: globalAccountingStats.club.listPaid, type: 'success' })}>
                              <span className="text-gray-600">Pagado:</span>
                              <span className="font-bold text-green-600">{globalAccountingStats.club.paid.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center text-xs cursor-pointer bg-purple-50 p-1 rounded hover:bg-purple-100 transition-colors"
                               onClick={() => setAccDetailsModal({ active: true, title: 'Club PENDIENTE', items: globalAccountingStats.club.listPending, type: 'purple' })}>
                              <span className="text-purple-800 font-bold">Deuda:</span>
                              <span className="font-black text-purple-600">{globalAccountingStats.club.pending.toFixed(2)}€</span>
                          </div>
                      </div>
                  </div>
              </div>

{accountingData.map(({ club, batches }) => {
                  // --- CÁLCULOS DE SALDOS DE CABECERA ---
                  let totalPendingCash = 0; 
                  let balanceProvider = 0; 
                  let balanceCommercial = 0; 
                  let balanceClub = 0;

                  batches.forEach(batch => {
                      const log = club.accountingLog?.[batch.id] || {};
                      
                      const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                      const isCommissionExempt = isErrorBatch;

                      // Totales Reales (Para Caja y Proveedor)
                      const cashRevenue = batch.orders.filter(o => o.paymentMethod === 'cash').reduce((s,o)=>s+o.total,0);
                      const totalCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                      
                      // Filtro Comisionable
                      const commissionableOrders = batch.orders.filter(o => o.paymentMethod !== 'incident' && o.paymentMethod !== 'gift' && o.type !== 'replacement');
                      
                      const commRevenue = commissionableOrders.reduce((sum, o) => sum + o.total, 0);
                      const commCost = commissionableOrders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                      const commFees = commissionableOrders.reduce((sum, o) => {
                          if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                          return sum;
                      }, 0);

                      // Cálculos Comisión
                      const clubRate = isCommissionExempt ? 0 : (club.commission || 0.12);
                      const commClub = commRevenue * clubRate;
                      
                      const commBase = commRevenue - commCost - commClub - commFees;
                      const commComm = isCommissionExempt ? 0 : (commBase * financialConfig.commercialCommissionPct);

                      totalPendingCash += (!log.cashCollected ? cashRevenue : 0) + (log.cashUnder||0) - (log.cashOver||0);
                      balanceProvider += (!log.supplierPaid ? totalCost : 0) + (log.supplierUnder||0) - (log.supplierOver||0);
                      balanceCommercial += (!log.commercialPaid ? commComm : 0) + (log.commercialUnder||0) - (log.commercialOver||0);
                      balanceClub += (!log.clubPaid ? commClub : 0) + (log.clubUnder||0) - (log.clubOver||0);
                  });

                  const renderBalance = (amount, labelPositive, labelNegative) => {
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
                                          <th className="px-4 py-3 min-w-[120px]">Lote</th>
                                          <th className="px-4 py-3 text-right bg-blue-50/30">Banco / Tarjeta (Neto)</th>
                                          <th className="px-4 py-3 text-right bg-orange-50/30">Efectivo</th>
                                          <th className="px-4 py-3 text-center bg-orange-50/30 min-w-[160px]">Control Caja</th>
                                          <th className="px-4 py-3 min-w-[160px]">Pago Proveedor</th>
                                          <th className="px-4 py-3 min-w-[160px]">Pago Comercial</th>
                                          <th className="px-4 py-3 min-w-[160px]">Pago Club</th>
                                          <th className="px-4 py-3 min-w-[120px] text-right bg-emerald-50 text-emerald-800">Beneficio Neto</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                      {batches.map(batch => {
                                          // --- LÓGICA DE FILA ---
                                          const isErrorBatch = typeof batch.id === 'string' && batch.id.startsWith('ERR');
                                          const isCommissionExempt = isErrorBatch; 

                                          // 1. Totales Reales (Incluyen todo para el neto de la empresa)
                                          const cashOrders = batch.orders.filter(o => o.paymentMethod === 'cash');
                                          const nonCashOrders = batch.orders.filter(o => o.paymentMethod !== 'cash');
                                          
                                          const revenueCash = cashOrders.reduce((sum, o) => sum + o.total, 0);
                                          const revenueNonCash = nonCashOrders.reduce((sum, o) => sum + o.total, 0); 
                                          const totalBatchRevenue = revenueCash + revenueNonCash;

                                          const totalCost = batch.orders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                                          
                                          const totalFees = batch.orders.reduce((sum, o) => {
                                              if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                                              return sum;
                                          }, 0);

                                          // 2. Filtro Comisionable (Para Comercial y Club)
                                          const commissionableOrders = batch.orders.filter(o => 
                                              o.paymentMethod !== 'incident' && 
                                              o.paymentMethod !== 'gift' && 
                                              o.type !== 'replacement'
                                          );

                                          const commRevenue = commissionableOrders.reduce((sum, o) => sum + o.total, 0);
                                          const commCost = commissionableOrders.reduce((sum, o) => sum + (o.items?.reduce((is, i) => is + ((i.cost || 0) * (i.quantity || 1)), 0) || 0), 0);
                                          const commFees = commissionableOrders.reduce((sum, o) => {
                                              if(o.paymentMethod === 'card') return sum + ((o.total * financialConfig.gatewayPercentFee) + financialConfig.gatewayFixedFee);
                                              return sum;
                                          }, 0);

                                          // 3. Cálculo de Comisiones (Usando datos filtrados)
                                          const clubRate = isCommissionExempt ? 0 : (club.commission || 0.12);
                                          const commClub = commRevenue * clubRate;

                                          const commBase = commRevenue - commCost - commClub - commFees;
                                          const commComm = isCommissionExempt ? 0 : (commBase * financialConfig.commercialCommissionPct);

                                          // 4. Beneficio Neto (Usa los Totales Reales - Costes Reales - Comisiones Pagadas)
                                          const netProfit = totalBatchRevenue - totalCost - commClub - commComm - totalFees;
                                          
                                          const status = club.accountingLog?.[batch.id] || {};
                                          const AdjustmentInputs = ({ fieldOver, fieldUnder }) => (
                                              <div className="flex gap-2 mt-2">
                                                  <div className="flex-1"><label className="text-[9px] text-gray-400 block mb-0.5">De más</label><input type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status[fieldOver] || ''} onChange={(e) => updateBatchValue(club, batch.id, fieldOver, e.target.value)}/></div>
                                                  <div className="flex-1"><label className="text-[9px] text-gray-400 block mb-0.5">De menos</label><input type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status[fieldUnder] || ''} onChange={(e) => updateBatchValue(club, batch.id, fieldUnder, e.target.value)}/></div>
                                              </div>
                                          );

                                            return (
                                                <tr key={batch.id} className={`align-top hover:bg-gray-50 transition-colors`}>
                                                    
                                                    {/* COLUMNA 0: INFO LOTE (Sin cambios) */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col">
                                                            <span className={`font-bold px-2 py-1 rounded w-fit ${isErrorBatch ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {isErrorBatch ? `Lote Errores #${batch.id.split('-')[1]}` : batch.id === 'INDIVIDUAL' ? 'Individual' : batch.id === 'SPECIAL' ? 'Especial' : `Lote #${batch.id}`}
                                                            </span>
                                                            {isCommissionExempt && <span className="text-[9px] font-bold text-orange-500 mt-1 uppercase">Sin Comisión</span>}
                                                            <span className="text-[10px] text-gray-400 mt-1">{batch.orders.length} pedidos</span>
                                                        </div>
                                                    </td>
                                                    
                                                    {/* BANCO Y EFECTIVO (Sin cambios) */}
                                                    <td className="px-4 py-4 text-right bg-blue-50/30">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-mono font-bold text-blue-700">{(revenueNonCash - totalFees).toFixed(2)}€</span>
                                                            <span className="text-[9px] text-gray-400">Bruto: {revenueNonCash.toFixed(2)}€</span>
                                                            {totalFees > 0 && <span className="text-[9px] text-red-400">(-{totalFees.toFixed(2)}€ fees)</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right bg-orange-50/30"><span className="font-mono font-bold text-orange-700">{revenueCash.toFixed(2)}€</span></td>
                                                    
                                                    {/* --- COLUMNA 1: CONTROL CAJA --- */}
                                                    <td className="px-4 py-4 bg-orange-50/30">
                                                        {revenueCash > 0 ? (
                                                            <div className="flex flex-col items-center">
                                                                <button 
                                                                    onClick={() => handlePaymentChange(club, batch.id, 'cashCollected', status.cashCollected)} 
                                                                    className={`w-full px-2 py-1.5 rounded text-[10px] font-bold border shadow-sm transition-all ${status.cashCollected ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200' : 'bg-white text-orange-600 border-orange-200 hover:border-orange-400 animate-pulse'}`}
                                                                >
                                                                    {status.cashCollected ? 'RECOGIDO' : 'PENDIENTE'}
                                                                </button>
                                                                {/* FECHA AUMENTADA */}
                                                                {status.cashCollected && status.cashCollectedDate && (
                                                                    <span className="text-[12px] text-emerald-600 mt-1 font-mono font-bold">
                                                                        {new Date(status.cashCollectedDate).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : <div className="text-center text-xs text-gray-300">-</div>}
                                                        
                                                        {/* INPUTS DE AJUSTE (USANDO DELAYED INPUT) */}
                                                        <div className="flex gap-2 mt-2">
                                                            <div className="flex-1">
                                                                <label className="text-[9px] text-gray-400 block mb-0.5">De más</label>
                                                                <DelayedInput 
                                                                    type="number" 
                                                                    placeholder="0" 
                                                                    className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" 
                                                                    value={status.cashOver} 
                                                                    onSave={(val) => updateBatchValue(club, batch.id, 'cashOver', val)}
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[9px] text-gray-400 block mb-0.5">De menos</label>
                                                                <DelayedInput 
                                                                    type="number" 
                                                                    placeholder="0" 
                                                                    className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" 
                                                                    value={status.cashUnder} 
                                                                    onSave={(val) => updateBatchValue(club, batch.id, 'cashUnder', val)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* --- COLUMNA 2: PAGO PROVEEDOR --- */}
                                                    <td className="px-4 py-4">
                                                        <div className="flex flex-col mb-1">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs text-red-500 font-bold">-{totalCost.toFixed(2)}€</span>
                                                                <button 
                                                                    onClick={() => handlePaymentChange(club, batch.id, 'supplierPaid', status.supplierPaid)} 
                                                                    className={`text-[10px] px-2 py-0.5 rounded border ${status.supplierPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                                >
                                                                    {status.supplierPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                </button>
                                                            </div>
                                                            {/* FECHA AUMENTADA */}
                                                            {status.supplierPaid && status.supplierPaidDate && (
                                                                <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                    {new Date(status.supplierPaidDate).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex gap-2 mt-2">
                                                            <div className="flex-1">
                                                                <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.supplierOver} onSave={(val) => updateBatchValue(club, batch.id, 'supplierOver', val)}/>
                                                            </div>
                                                            <div className="flex-1">
                                                                <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.supplierUnder} onSave={(val) => updateBatchValue(club, batch.id, 'supplierUnder', val)}/>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* --- COLUMNA 3: PAGO COMERCIAL --- */}
                                                    <td className="px-4 py-4">
                                                        {isCommissionExempt ? <div className="text-center text-gray-300 text-xs">-</div> : (
                                                            <>
                                                                <div className="flex flex-col mb-1">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-xs text-blue-500 font-bold">+{commComm.toFixed(2)}€</span>
                                                                        <button 
                                                                            onClick={() => handlePaymentChange(club, batch.id, 'commercialPaid', status.commercialPaid)} 
                                                                            className={`text-[10px] px-2 py-0.5 rounded border ${status.commercialPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                                        >
                                                                            {status.commercialPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                        </button>
                                                                    </div>
                                                                    {/* FECHA AUMENTADA */}
                                                                    {status.commercialPaid && status.commercialPaidDate && (
                                                                        <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                            {new Date(status.commercialPaidDate).toLocaleDateString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="flex gap-2 mt-2">
                                                                    <div className="flex-1">
                                                                        <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.commercialOver} onSave={(val) => updateBatchValue(club, batch.id, 'commercialOver', val)}/>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.commercialUnder} onSave={(val) => updateBatchValue(club, batch.id, 'commercialUnder', val)}/>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </td>

                                                    {/* --- COLUMNA 4: PAGO CLUB --- */}
                                                    <td className="px-4 py-4">
                                                        {isCommissionExempt ? <div className="text-center text-gray-300 text-xs">-</div> : (
                                                            <>
                                                                <div className="flex flex-col mb-1">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-xs text-purple-500 font-bold">-{commClub.toFixed(2)}€</span>
                                                                        <button 
                                                                            onClick={() => handlePaymentChange(club, batch.id, 'clubPaid', status.clubPaid)} 
                                                                            className={`text-[10px] px-2 py-0.5 rounded border ${status.clubPaid ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                                                        >
                                                                            {status.clubPaid ? 'PAGADO' : 'PENDIENTE'}
                                                                        </button>
                                                                    </div>
                                                                    {/* FECHA AUMENTADA */}
                                                                    {status.clubPaid && status.clubPaidDate && (
                                                                        <div className="text-right text-[12px] text-green-600 font-mono font-bold -mt-1 mb-1">
                                                                            {new Date(status.clubPaidDate).toLocaleDateString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="flex gap-2 mt-2">
                                                                    <div className="flex-1">
                                                                        <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-blue-50 border-blue-100 focus:border-blue-300" value={status.clubOver} onSave={(val) => updateBatchValue(club, batch.id, 'clubOver', val)}/>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <DelayedInput type="number" placeholder="0" className="w-full text-right text-xs border rounded px-1 py-0.5 bg-red-50 border-red-100 focus:border-red-300" value={status.clubUnder} onSave={(val) => updateBatchValue(club, batch.id, 'clubUnder', val)}/>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right font-black text-emerald-600 bg-emerald-50/30 border-l border-emerald-100">
                                                        {netProfit.toFixed(2)}€
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

  useEffect(() => { const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } }; initAuth(); const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u)); return () => unsubscribe(); }, []);
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
        {view === 'club-dashboard' && role === 'club' && <ClubDashboard club={currentClub} orders={orders} updateOrderStatus={updateOrderStatus} config={financialConfig} seasons={seasons.filter(s => !s.hiddenForClubs)} />}
        {view === 'admin-dashboard' && role === 'admin' && <AdminDashboard products={products} orders={orders} clubs={clubs} updateOrderStatus={updateOrderStatus} financialConfig={financialConfig} setFinancialConfig={setFinancialConfig} updateProduct={updateProduct} addProduct={addProduct} deleteProduct={deleteProduct} createClub={createClub} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} seasons={seasons} addSeason={addSeason} deleteSeason={deleteSeason} toggleSeasonVisibility={toggleSeasonVisibility} storeConfig={storeConfig} setStoreConfig={setStoreConfig} incrementClubGlobalOrder={incrementClubGlobalOrder} decrementClubGlobalOrder={decrementClubGlobalOrder} showNotification={showNotification} createSpecialOrder={createSpecialOrder} addIncident={addIncident} updateIncidentStatus={updateIncidentStatus} updateFinancialConfig={updateFinancialConfig} suppliers={suppliers} createSupplier={createSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} updateProductCostBatch={updateProductCostBatch} incrementClubErrorBatch={incrementClubErrorBatch} /> }
      </main>
      <footer className="bg-gray-900 text-white py-12 mt-12"><div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8"><div><div className="mb-4 text-white"><CompanyLogo className="h-40" /></div><p className="text-gray-400">Merchandising personalizado para clubes deportivos. Calidad profesional y gestión integral.</p></div><div><h3 className="text-lg font-semibold mb-4">Legal</h3><ul className="space-y-2 text-gray-400 cursor-pointer"><li>Política de Privacidad</li><li>Aviso Legal</li><li onClick={() => setView('right-to-forget')} className="hover:text-emerald-400 text-emerald-600 font-bold flex items-center gap-2"><UserX className="w-4 h-4"/> Derecho al Olvido (RGPD)</li></ul></div><div><h3 className="text-lg font-semibold mb-4">Contacto</h3><p className="text-gray-400">info@fotoesportmerch.es</p></div></div></footer>
    </div>
  );
}