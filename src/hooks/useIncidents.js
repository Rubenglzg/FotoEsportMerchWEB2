import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useIncidents(tab) {
    const [incidents, setIncidents] = useState([]);

    useEffect(() => {
        if (tab === 'incidents') {
            const q = query(collection(db, 'incidents'), orderBy('createdAt', 'desc'));
            const unsub = onSnapshot(q, (snapshot) => {
                setIncidents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }
    }, [tab]);

    const pendingCount = incidents.filter(i => i.status === 'open').length;

    return { incidents, pendingCount };
}