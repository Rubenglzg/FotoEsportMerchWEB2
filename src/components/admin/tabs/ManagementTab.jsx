import React, { useState, useEffect } from 'react';
import { Award, Store, Ban, Banknote, Package, Plus, Users, Upload, EyeOff, Eye, Gift, Trash2, Copy, Tag, Mail, Download, Shield, Lock, Unlock, Info, TrendingUp, CreditCard, Wand2 } from 'lucide-react';

// Firebase Firestore
import { doc, setDoc, getDoc, getDocs, query, collection, addDoc, deleteDoc } from 'firebase/firestore';
// Firebase Auth
import { updateEmail, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../../config/firebase'; 

import { Button } from '../../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
import { ClubEditorRow } from '../ClubEditorRow';

export const ManagementTab = ({
    campaignConfig, setCampaignConfig,
    storeConfig, setStoreConfig,
    financialConfig, setFinancialConfig, updateFinancialConfig,
    products, addProduct, updateProduct, deleteProduct, suppliers,
    clubs, createClub, updateClub, deleteClub, toggleClubBlock,
    showNotification,
}) => {
    const [showNewClubPass, setShowNewClubPass] = useState(false);
    const [newClubColor, setNewClubColor] = useState('white');

    // Estados para Códigos de Regalo
    const [giftCodes, setGiftCodes] = useState([]);
    const [filterStatus, setFilterStatus] = useState('pending');
    const [newManualProduct, setNewManualProduct] = useState('');
    const [newManualEmail, setNewManualEmail] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [codeType, setCodeType] = useState('product');
    const [applyTo, setApplyTo] = useState('specific');
    const [discountValue, setDiscountValue] = useState('');
    const [productQuantity, setProductQuantity] = useState(1);
    const [allowedClub, setAllowedClub] = useState('all');

    // --- NUEVOS ESTADOS PARA CADUCIDAD ---
    const [expirationType, setExpirationType] = useState('none'); // 'none', 'hours', 'days', 'months', 'date_range'
    const [expirationValue, setExpirationValue] = useState(1);
    const [expirationDateStart, setExpirationDateStart] = useState('');
    const [expirationDateEnd, setExpirationDateEnd] = useState('');

    // Estados para Seguridad y Acceso Admin
    const [adminAlias, setAdminAlias] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [secModal, setSecModal] = useState({ show: false, code: '', pending: null, input: '' });
    
    // Estado de bloqueo de seguridad
    const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false);

    // 1. Carga inicial de datos
    useEffect(() => {
        fetchGiftCodes();
        fetchAdminAuth();
    }, []);

    const fetchGiftCodes = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'giftCodes')));
            const codes = snap.docs.map(d => ({id: d.id, ...d.data()}));
            codes.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            setGiftCodes(codes);
        } catch (err) {
            showNotification("Error al cargar códigos de regalo", "error");
        }
    };

    const fetchAdminAuth = async () => {
        try {
            const snap = await getDoc(doc(db, 'settings', 'admin_auth'));
            if (snap.exists()) {
                setAdminAlias(snap.data().alias);
                setAdminEmail(snap.data().email);
            } else {
                setAdminAlias('admin');
                setAdminEmail(auth.currentUser?.email || 'fotoesportmerch@gmail.com');
            }
        } catch (e) {
            console.error("Error cargando configuración admin", e);
        }
    };

    // 2. Funciones de Seguridad (Administrador)
    const handleSaveSecurity = async () => {
        if (!adminAlias.trim() || !adminEmail.trim()) {
            return showNotification("El usuario y el email no pueden estar vacíos", "error");
        }
        
        const currentMail = auth.currentUser?.email || 'fotoesportmerch@gmail.com';
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        try {
            await addDoc(collection(db, 'mail'), {
                to: currentMail,
                message: {
                    subject: "Autorización de Cambios - FotoEsport Merch",
                    html: `<div style="font-family:sans-serif; border:1px solid #eee; padding:20px; border-radius:10px;">
                            <h2 style="color:#333;">Modificación de Seguridad</h2>
                            <p>Se ha solicitado cambiar las credenciales de acceso. Introduce este código para confirmar:</p>
                            <div style="font-size:32px; font-weight:bold; color:#4F46E5; letter-spacing:5px;">${code}</div>
                           </div>`
                }
            });
            setSecModal({ show: true, code, pending: { alias: adminAlias, email: adminEmail, pass: adminPass }, input: '' });
            showNotification("Revisa tu correo actual. Te hemos enviado un código.", "info");
        } catch (e) {
            showNotification("Error al enviar el código de seguridad", "error");
        }
    };

    const confirmSecurityChanges = async () => {
        if (secModal.input !== secModal.code) {
            return showNotification("Código incorrecto", "error");
        }

        try {
            const p = secModal.pending;
            
            if (p.email !== auth.currentUser?.email) {
                await updateEmail(auth.currentUser, p.email);
            }
            if (p.pass) {
                await updatePassword(auth.currentUser, p.pass);
            }
            
            await setDoc(doc(db, 'settings', 'admin_auth'), {
                alias: p.alias,
                email: p.email
            });

            showNotification("Credenciales de seguridad actualizadas con éxito");
            setSecModal({ show: false, code: '', pending: null, input: '' });
            setAdminPass(''); 
            
            setIsSecurityUnlocked(false);
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                showNotification("Por seguridad, debes cerrar sesión y volver a entrar para cambiar tu contraseña/email.", "error");
            } else {
                showNotification("Error: " + error.message, "error");
            }
        }
    };

    const handleResetPassword = async () => {
        try {
            const emailToReset = auth.currentUser?.email || 'fotoesportmerch@gmail.com';
            await sendPasswordResetEmail(auth, emailToReset);
            showNotification(`Se ha enviado un correo oficial de recuperación a ${emailToReset}`, "success");
        } catch (error) {
            showNotification("Error enviando el correo de recuperación", "error");
        }
    };

    // 3. Funciones de Códigos de Regalo
    const handleGenerateManualCode = async () => {
        if ((codeType === 'product' || applyTo === 'specific') && !newManualProduct) {
            return showNotification("Debes seleccionar un producto del catálogo", "error");
        }
        if (codeType !== 'product' && (!discountValue || parseFloat(discountValue) <= 0)) {
            return showNotification("Debes introducir un valor de descuento válido", "error");
        }

        setIsGenerating(true);
        const prod = (codeType === 'product' || applyTo === 'specific') ? products.find(p => p.id === newManualProduct) : null;
        const prefix = codeType === 'percent' ? 'PCT' : (codeType === 'fixed' ? 'FIX' : 'REG');
        const codeStr = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // --- NUEVO CÁLCULO DE FECHA DE CADUCIDAD ---
        let expiresAt = null;
        let validFrom = null;

        if (expirationType === 'date_range') {
            if (!expirationDateStart || !expirationDateEnd) {
                return showNotification("Debes seleccionar una fecha de inicio y una de fin", "error");
            }
            if (new Date(expirationDateStart) >= new Date(expirationDateEnd)) {
                return showNotification("La fecha de fin debe ser posterior a la de inicio", "error");
            }
            validFrom = new Date(expirationDateStart).toISOString();
            expiresAt = new Date(expirationDateEnd).toISOString();
        } else if (expirationType !== 'none' && expirationValue > 0) {
            const date = new Date();
            validFrom = date.toISOString(); // Empieza a ser válido ahora mismo
            if (expirationType === 'hours') date.setHours(date.getHours() + parseInt(expirationValue));
            if (expirationType === 'days') date.setDate(date.getDate() + parseInt(expirationValue));
            if (expirationType === 'months') date.setMonth(date.getMonth() + parseInt(expirationValue));
            expiresAt = date.toISOString();
        }

        try {
            await addDoc(collection(db, 'giftCodes'), {
                // ... (el resto de campos se queda igual)
                code: codeStr,
                type: 'manual',
                codeType: codeType,
                applyTo: codeType === 'product' ? 'specific' : applyTo,
                productId: prod ? prod.id : null,
                productName: prod ? prod.name : 'Toda la cesta',
                discountValue: codeType !== 'product' ? parseFloat(discountValue) : null,
                maxUnits: (codeType === 'product' || applyTo === 'specific') ? parseInt(productQuantity) : 0,
                userEmail: newManualEmail || 'Generado Manualmente',
                allowedClub: allowedClub,
                status: 'pending',
                createdAt: new Date().toISOString(),
                
                // --- AÑADIMOS LOS CAMPOS DE TIEMPO ACTUALIZADOS ---
                validFrom: validFrom,
                expiresAt: expiresAt,
                isTimeLimited: expirationType !== 'none'
            });
            
            showNotification("Código promocional generado con éxito");
            // ... reseteo de estados previos
            
            // --- LIMPIAMOS LOS NUEVOS ESTADOS ---
            setExpirationType('none'); 
            setExpirationValue(1);
            setExpirationDateStart('');
            setExpirationDateEnd('');

            fetchGiftCodes();
        } catch (e) {
            showNotification("Hubo un error al generar el código", "error");
        }
        setIsGenerating(false);
    };

    const handleDeleteCode = async (id) => {
        if (!window.confirm("¿Seguro que quieres eliminar este código?")) return;
        try {
            await deleteDoc(doc(db, 'giftCodes', id));
            showNotification("Código eliminado correctamente");
            fetchGiftCodes();
        } catch (e) { showNotification("Error al eliminar", "error"); }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            
            {/* BLOQUES GLOBALES: ESTADO Y FINANZAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
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
                                    className="mt-2 text-xs border border-red-200 p-1.5 rounded w-full bg-white text-red-800 outline-none" 
                                    value={storeConfig.closedMessage} 
                                    onChange={e => setStoreConfig({...storeConfig, closedMessage: e.target.value})} 
                                />
                            )}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setStoreConfig({...storeConfig, isOpen: !storeConfig.isOpen})}
                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 shadow-inner ${storeConfig.isOpen ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow transition-transform duration-300 ${storeConfig.isOpen ? 'translate-x-6' : 'translate-x-0'}`}/>
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                        <Banknote className="w-5 h-5 text-blue-600"/>
                        <h4 className="font-bold text-gray-800 text-sm uppercase">Configuración Financiera</h4>
                    </div>
                    
                    {/* PANEL DE CONFIGURACIÓN FINANCIERA (CORREGIDO: SIN CORTES DE TEXTO) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                        
                        {/* TARJETA 1: COMERCIAL */}
                        <div className="bg-white border border-orange-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center gap-3">
                                <div className="bg-orange-100 p-2 rounded-lg text-orange-600 shrink-0">
                                    <TrendingUp className="w-5 h-5"/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm">Comercial</h4>
                                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-tight">Tramos Dinámicos</p>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-center gap-2">
                                <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                    <span className="text-[11px] font-medium text-gray-500">Hasta 5.000€</span>
                                    <span className="text-xs font-black text-orange-600">20%</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                    <span className="text-[11px] font-medium text-gray-500">5k a 10.000€</span>
                                    <span className="text-xs font-black text-orange-600">30%</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                    <span className="text-[11px] font-medium text-gray-500">Más de 10.000€</span>
                                    <span className="text-xs font-black text-orange-600">40%</span>
                                </div>
                            </div>
                        </div>

                        {/* TARJETA 2: EXTRA PERSONALIZACIÓN */}
                        <div className="bg-white border border-emerald-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center gap-3">
                                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 shrink-0">
                                    <Wand2 className="w-5 h-5"/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm">Personalización</h4>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Ajustes manuales</p>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-center gap-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block text-center">
                                    Coste por Alteración
                                </label>
                                <div className="relative mx-auto w-full max-w-[140px]">
                                    <input 
                                        type="number" step="0.10"
                                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full bg-gray-50 border-2 border-emerald-100 rounded-xl py-2 px-8 text-center font-black text-emerald-700 text-xl outline-none focus:border-emerald-400 transition-colors"
                                        value={financialConfig.modificationFee}
                                        onChange={(e) => setFinancialConfig(prev => ({...prev, modificationFee: parseFloat(e.target.value)}))}
                                        onBlur={() => updateFinancialConfig(financialConfig)}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg pointer-events-none">€</span>
                                </div>
                            </div>
                        </div>

                        {/* TARJETA 3: PASARELA DE PAGO */}
                        <div className="bg-white border border-blue-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:col-span-2 lg:col-span-1">
                            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                                    <CreditCard className="w-5 h-5"/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm">Pasarela Stripe</h4>
                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Comisiones TPV</p>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Variable (%)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" step="0.1"
                                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full bg-gray-50 border border-blue-100 rounded-lg py-1.5 pl-2 pr-6 text-sm font-bold text-blue-800 outline-none focus:border-blue-400"
                                                value={(financialConfig.gatewayPercentFee * 100).toFixed(1)}
                                                onChange={(e) => setFinancialConfig(prev => ({...prev, gatewayPercentFee: parseFloat(e.target.value)/100}))}
                                                onBlur={() => updateFinancialConfig(financialConfig)}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300 font-bold text-xs pointer-events-none">%</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Fijo (€)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" step="0.01"
                                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full bg-gray-50 border border-blue-100 rounded-lg py-1.5 pl-2 pr-6 text-sm font-bold text-blue-800 outline-none focus:border-blue-400"
                                                value={financialConfig.gatewayFixedFee}
                                                onChange={(e) => setFinancialConfig(prev => ({...prev, gatewayFixedFee: parseFloat(e.target.value)}))}
                                                onBlur={() => updateFinancialConfig(financialConfig)}
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300 font-bold text-xs pointer-events-none">€</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* SEGURIDAD Y ACCESO ADMINISTRADOR (CON SAFE-LOCK) */}
            <div className={`rounded-xl shadow-sm border p-6 transition-all duration-300 ${isSecurityUnlocked ? 'bg-white border-indigo-200 ring-2 ring-indigo-50' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Shield className={`w-6 h-6 ${isSecurityUnlocked ? 'text-indigo-600' : 'text-gray-400'}`}/>
                        <div>
                            <h4 className="font-extrabold text-gray-800 text-sm uppercase tracking-wide">Seguridad y Acceso Administrador</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {isSecurityUnlocked ? 'Modo de edición activo. Recuerda guardar los cambios.' : 'Los campos están bloqueados por seguridad para evitar cambios accidentales.'}
                            </p>
                        </div>
                    </div>
                    
                    {!isSecurityUnlocked && (
                        <button
                            onClick={() => setIsSecurityUnlocked(true)}
                            className="px-4 py-2 bg-white border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-gray-600 font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-sm"
                        >
                            <Lock className="w-4 h-4"/> Editar Accesos
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Palabra de Acceso (Usuario)</label>
                        <input
                            type="text"
                            disabled={!isSecurityUnlocked}
                            className={`w-full border-2 rounded-lg p-2.5 font-bold outline-none transition-colors ${!isSecurityUnlocked ? 'bg-gray-100 border-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-800 focus:border-indigo-500'}`}
                            value={adminAlias}
                            onChange={(e) => setAdminAlias(e.target.value)}
                            placeholder="Ej: admin"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Email Principal</label>
                        <input
                            type="email"
                            disabled={!isSecurityUnlocked}
                            className={`w-full border-2 rounded-lg p-2.5 font-bold outline-none transition-colors ${!isSecurityUnlocked ? 'bg-gray-100 border-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-800 focus:border-indigo-500'}`}
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nueva Contraseña (Opcional)</label>
                        <input
                            type="password"
                            disabled={!isSecurityUnlocked}
                            className={`w-full border-2 rounded-lg p-2.5 font-bold outline-none transition-colors placeholder-gray-300 ${!isSecurityUnlocked ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-800 focus:border-indigo-500'}`}
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            placeholder={!isSecurityUnlocked ? "Bloqueado" : "Dejar vacío para mantener"}
                        />
                    </div>
                </div>

                {isSecurityUnlocked && (
                    <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-indigo-50 animate-fade-in items-center">
                        <button
                            onClick={() => {
                                setIsSecurityUnlocked(false);
                                fetchAdminAuth(); 
                                setAdminPass('');
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg text-xs transition-colors"
                        >
                            Cancelar
                        </button>
                        
                        {/* Botón de Restablecer con la "i" de información y Tooltip */}
                        <div className="relative group flex items-center">
                            <button
                                onClick={handleResetPassword}
                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
                            >
                                Restablecer con Enlace Oficial
                                <Info className="w-4 h-4 text-indigo-400" />
                            </button>
                            
                            {/* Burbuja de información flotante */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800 text-white text-[12px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none text-center">
                                Úsalo si Firebase bloquea tu cambio de contraseña por llevar mucho tiempo conectado. Te enviará un enlace (¡revisa la carpeta de SPAM!).
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSecurity}
                            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-2 shadow-md"
                        >
                            <Unlock className="w-4 h-4"/> Guardar Cambios
                        </button>
                    </div>
                )}

                {/* MODAL DE 2FA DE SEGURIDAD */}
                {secModal.show && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-indigo-100 animate-fade-in">
                            <h3 className="text-xl font-extrabold text-gray-800 text-center mb-2">Autorización</h3>
                            <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
                                Hemos enviado un código a tu correo actual por seguridad.
                            </p>
                            <input
                                type="text"
                                maxLength={6}
                                className="w-full text-center text-4xl font-mono tracking-[0.4em] py-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-600 outline-none bg-indigo-50/50 text-indigo-900 mb-6"
                                placeholder="000000"
                                value={secModal.input}
                                autoFocus
                                onChange={(e) => setSecModal({...secModal, input: e.target.value.replace(/[^0-9]/g, '')})}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSecModal({ show: false, code: '', pending: null, input: '' })}
                                    className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmSecurityChanges}
                                    className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECCIÓN PRINCIPAL: CÓDIGOS Y CLUBES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 max-w-7xl mx-auto gap-8 items-start">
                
                {/* COLUMNA IZQUIERDA: CÓDIGOS DE REGALO */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-2xl shadow-sm border border-pink-100 p-6 relative overflow-hidden">
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                        <div className="flex items-center gap-4 mb-6 relative z-10">
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-pink-50 text-pink-500">
                                <Gift className="w-6 h-6"/>
                            </div>
                            <div>
                                <h3 className="text-lg font-extrabold text-pink-900 leading-tight">Generar Código Regalo</h3>
                                <p className="text-xs text-pink-500 font-medium">Crea un código promocional de un solo uso</p>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-white shadow-sm relative z-10 space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">1. Tipo de Promoción</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setCodeType('product')} className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${codeType === 'product' ? 'bg-pink-100 border-pink-300 text-pink-700' : 'bg-white text-gray-500'}`}>Regalo</button>
                                    <button onClick={() => setCodeType('percent')} className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${codeType === 'percent' ? 'bg-pink-100 border-pink-300 text-pink-700' : 'bg-white text-gray-500'}`}>Descuento (%)</button>
                                    <button onClick={() => setCodeType('fixed')} className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${codeType === 'fixed' ? 'bg-pink-100 border-pink-300 text-pink-700' : 'bg-white text-gray-500'}`}>Descuento (€)</button>
                                </div>
                            </div>

                            {codeType !== 'product' && (
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                                        2. Valor y Alcance
                                    </label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" min="0.1" step={codeType === 'fixed' ? "0.5" : "1"}
                                            className="w-1/3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none"
                                            value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                                        />
                                        <select 
                                            className="w-2/3 bg-gray-50 border border-gray-200 rounded-lg px-2 text-xs font-bold outline-none"
                                            value={applyTo} onChange={(e) => setApplyTo(e.target.value)}
                                        >
                                            <option value="specific">A un producto</option>
                                            <option value="all">A toda la cesta</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {(codeType === 'product' || applyTo === 'specific') && (
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-8">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Producto</label>
                                        <select 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none"
                                            value={newManualProduct} onChange={(e) => setNewManualProduct(e.target.value)}
                                        >
                                            <option value="">-- Selecciona --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-4">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Unidades</label>
                                        <input 
                                            type="number" min="0"
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none"
                                            value={productQuantity} onChange={(e) => setProductQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Email / Ref</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none"
                                    value={newManualEmail} onChange={(e) => setNewManualEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Restricción de Club</label>
                                <select 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 outline-none"
                                    value={allowedClub} onChange={(e) => setAllowedClub(e.target.value)}
                                >
                                    <option value="all">✅ Válido para todos</option>
                                    {clubs.map(c => <option key={c.id} value={c.id}>Solo: {c.name}</option>)}
                                </select>
                            </div>

                            {/* NUEVO BLOQUE DE VALIDEZ TEMPORAL (CON RANGO DE FECHAS) */}
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Duración del Cupón</label>
                                <div className="flex flex-col gap-2">
                                    <select 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 outline-none"
                                        value={expirationType} onChange={(e) => setExpirationType(e.target.value)}
                                    >
                                        <option value="none">Un solo uso (Clásico)</option>
                                        <option value="hours">Por Horas (Multiuso)</option>
                                        <option value="days">Por Días (Multiuso)</option>
                                        <option value="months">Por Meses (Multiuso)</option>
                                        <option value="date_range">Rango de Fechas Exacto (Multiuso)</option>
                                    </select>

                                    {/* Muestra input de cantidad si es horas/días/meses */}
                                    {(expirationType === 'hours' || expirationType === 'days' || expirationType === 'months') && (
                                        <input 
                                            type="number" min="1"
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none"
                                            value={expirationValue} onChange={(e) => setExpirationValue(e.target.value)}
                                            placeholder={`¿Cuántos ${expirationType === 'hours' ? 'horas' : expirationType === 'days' ? 'días' : 'meses'}?`}
                                        />
                                    )}

                                    {/* Muestra inputs de calendario si es Rango de Fechas */}
                                    {expirationType === 'date_range' && (
                                        <div className="flex gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100">
                                            <div className="w-1/2">
                                                <label className="text-[9px] font-bold text-purple-700 uppercase block mb-0.5">Válido Desde:</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="w-full bg-white border border-purple-200 rounded px-2 py-1.5 text-xs text-gray-800 outline-none"
                                                    value={expirationDateStart} onChange={(e) => setExpirationDateStart(e.target.value)}
                                                />
                                            </div>
                                            <div className="w-1/2">
                                                <label className="text-[9px] font-bold text-purple-700 uppercase block mb-0.5">Válido Hasta:</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="w-full bg-white border border-purple-200 rounded px-2 py-1.5 text-xs text-gray-800 outline-none"
                                                    value={expirationDateEnd} onChange={(e) => setExpirationDateEnd(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerateManualCode} disabled={isGenerating}
                                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md flex justify-center gap-2 mt-2"
                            >
                                <Plus className="w-4 h-4"/> Crear Código
                            </button>
                        </div>
                    </div>

                    {/* Historial de Códigos */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <Tag className="w-5 h-5 text-pink-600"/> Historial de Códigos
                            </h4>
                            <div className="flex gap-1 bg-white border rounded-lg p-1">
                                <button onClick={() => setFilterStatus('pending')} className={`px-3 py-1 text-xs font-bold rounded-md ${filterStatus === 'pending' ? 'bg-pink-100 text-pink-700' : 'text-gray-500'}`}>Pendientes</button>
                                <button onClick={() => setFilterStatus('redeemed')} className={`px-3 py-1 text-xs font-bold rounded-md ${filterStatus === 'redeemed' ? 'bg-gray-200 text-gray-700' : 'text-gray-500'}`}>Canjeados</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {giftCodes.filter(c => c.status === filterStatus).map(code => (
                                <div key={code.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-lg font-bold text-pink-700 bg-pink-50 px-2 rounded border border-pink-100">{code.code}</span>
                                                {filterStatus === 'pending' && (
                                                    <button onClick={() => { navigator.clipboard.writeText(code.code); showNotification("Copiado"); }} className="text-gray-400 hover:text-pink-600"><Copy className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                            <p className="text-sm font-extrabold text-gray-800">
                                                {code.codeType === 'percent' ? `Descuento ${code.discountValue}%` : code.codeType === 'fixed' ? `Descuento ${code.discountValue}€` : 'Regalo Directo'}
                                            </p>
                                        </div>
                                        {filterStatus === 'pending' && (
                                            <button onClick={() => handleDeleteCode(code.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-2">Ref: {code.userEmail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: GESTIÓN DE CLUBES */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-2xl shadow-sm border border-indigo-100 p-6 relative overflow-hidden">
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
                                <div className="md:col-span-3">
                                    <label className="w-full aspect-square rounded-xl bg-indigo-50/50 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden">
                                        <Upload className="w-6 h-6 text-indigo-300 mb-1"/>
                                        <span className="text-[9px] text-indigo-400 font-bold uppercase text-center">Subir<br/>Escudo</span>
                                        <input type="file" id="newClubLogo" className="hidden" accept="image/*" />
                                    </label>
                                </div>
                                <div className="md:col-span-9 space-y-3">
                                    <input id="newClubName" placeholder="Nombre Oficial" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input id="newClubUser" placeholder="Usuario" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" />
                                        <div className="relative">
                                            <input id="newClubPass" type={showNewClubPass ? "text" : "password"} placeholder="Contraseña" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm pr-8 outline-none" />
                                            <button type="button" onClick={() => setShowNewClubPass(!showNewClubPass)} className="absolute right-2 top-2 text-gray-400"><Eye className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button 
                                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md flex justify-center gap-2"
                                onClick={() => { 
                                    const n = document.getElementById('newClubName').value;
                                    const u = document.getElementById('newClubUser').value;
                                    const p = document.getElementById('newClubPass').value;
                                    const f = document.getElementById('newClubLogo').files[0];
                                    if(n && u && p) createClub({ name: n, code: n.slice(0,3).toUpperCase(), username: u, pass: p, color: newClubColor }, f);
                                }} 
                            >
                                <Plus className="w-4 h-4"/> Registrar Club
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600"/> Clubes Activos
                            </h4>
                            <span className="text-xs bg-white border px-2 py-1 rounded-full text-gray-500 font-medium">{clubs.length} clubes</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {clubs.map(c => <ClubEditorRow key={c.id} club={c} updateClub={updateClub} deleteClub={deleteClub} toggleClubBlock={toggleClubBlock} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};