import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../config/firebase';
import { appId } from '../config/constants';

export function useFirebaseData() {
    // 1. Estados
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [financialConfig, setFinancialConfig] = useState({ 
        clubCommissionPct: 0.12, commercialCommissionPct: 0.05,
        gatewayPercentFee: 0.015, gatewayFixedFee: 0.25, modificationFee: 1.00 
    });
    const [campaignConfig, setCampaignConfig] = useState({ 
        active: false, type: 'none', discount: 0, bannerMessage: '' 
    });

    // NUEVO: Estado interno para saber de forma segura si hay un usuario conectado
    const [authUser, setAuthUser] = useState(null);

    // 2. Efectos de escucha en tiempo real

    // Escuchador automático de sesión
    useEffect(() => {
        const auth = getAuth();
        const unsub = onAuthStateChanged(auth, (u) => {
            setAuthUser(u);
        });
        return () => unsub();
    }, []);

    // Configuración de campañas (Público)
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'campaigns'), (docSnap) => {
            if (docSnap.exists()) setCampaignConfig(docSnap.data());
        });
        return () => unsub();
    }, []);

    // PEDIDOS (Privado: requiere usuario verificado por Firebase)
    useEffect(() => { 
        if (!authUser) { 
            setOrders([]); 
            return; 
        } 
        
        const ordersQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); 
        const unsubOrders = onSnapshot(ordersQuery, (snapshot) => { 
            const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            
            // Ordenación segura a prueba de fallos de timestamp
            ordersData.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            
            setOrders(ordersData); 
        }, (error) => console.error("🔥 ERROR EN PEDIDOS:", error)); 

        return () => unsubOrders(); 
    }, [authUser]);

    // PROVEEDORES (Privado: Solo Admin)
    useEffect(() => {
        // Si no hay usuario, o si el usuario NO tiene email (es un Club/Anónimo), no intentes descargar
        if (!authUser || !authUser.email) { 
            setSuppliers([]); 
            return; 
        }
        
        const unsub = onSnapshot(query(collection(db, 'suppliers')), (snapshot) => {
            setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("🔥 ERROR EN PROVEEDORES:", error));
        
        return () => unsub();
    }, [authUser]);

    // Configuración Financiera (Privado: requiere usuario)
    useEffect(() => {
        if (!authUser) return;
        
        const unsub = onSnapshot(doc(db, 'settings', 'financial'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setFinancialConfig({
                    ...data,
                    gatewayPercentFee: data.gatewayPercentFee !== undefined ? data.gatewayPercentFee : 0.015,
                    gatewayFixedFee: data.gatewayFixedFee !== undefined ? data.gatewayFixedFee : 0.25,
                    modificationFee: data.modificationFee !== undefined ? data.modificationFee : 1.00
                });
            }
        });
        return () => unsub();
    }, [authUser]);

    // PRODUCTOS (Público)
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'products')), (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    // CLUBES (Público)
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'clubs')), (snapshot) => {
            setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    // TEMPORADAS (Público)
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'seasons')), (snapshot) => {
            const seasonsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (seasonsData.length > 0) {
                seasonsData.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                setSeasons(seasonsData);
            }
        });
        return () => unsub();
    }, []);

    // 3. Devolvemos los datos para que App.jsx los pueda usar
    return {
        orders, products, clubs, seasons, suppliers, financialConfig, campaignConfig,
        setCampaignConfig, setFinancialConfig 
    };
}