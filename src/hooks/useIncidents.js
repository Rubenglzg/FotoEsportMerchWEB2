import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useIncidents(tab) {
    const [incidents, setIncidents] = useState([]);

    useEffect(() => {
        if (tab === 'incidents') {
            // --- NUEVO: Limitamos la consulta a las 100 incidencias más recientes ---
            const q = query(
                collection(db, 'incidents'), 
                orderBy('createdAt', 'desc'),
                limit(100) // Evita descargar el historial completo de golpe
            );
            // ------------------------------------------------------------------------
            
            const unsub = onSnapshot(q, (snapshot) => {
                setIncidents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }
    }, [tab]);

    const pendingCount = incidents.filter(i => i.status === 'open').length;

    return { incidents, pendingCount };
}