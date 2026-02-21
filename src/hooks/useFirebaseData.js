import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { appId } from '../config/constants';

export function useFirebaseData(user) {
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

    // 2. Efectos de escucha en tiempo real
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'campaigns'), (docSnap) => {
            if (docSnap.exists()) setCampaignConfig(docSnap.data());
        });
        return () => unsub();
    }, []);

    useEffect(() => { 
        if (!user) return; 
        const ordersQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); 
        const unsubOrders = onSnapshot(ordersQuery, (snapshot) => { 
            const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
            ordersData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds); 
            setOrders(ordersData); 
        }); 
        return () => unsubOrders(); 
    }, [user]);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'suppliers')), (snapshot) => {
            setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'products')), (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'clubs')), (snapshot) => {
            setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

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
        setCampaignConfig, setFinancialConfig // Exportamos estos dos porque los modificas desde el Admin
    };
}