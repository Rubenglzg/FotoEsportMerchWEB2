import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { auth } from '../config/firebase';

export function useAuth(clubs, showNotification, setView) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('public'); 
    const [currentClub, setCurrentClub] = useState(null); 

    // Inicializar sesión
    useEffect(() => { 
        const initAuth = async () => { 
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
                await signInWithCustomToken(auth, __initial_auth_token); 
            } else { 
                await signInAnonymously(auth); 
            } 
        }; 
        initAuth(); 
        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u)); 
        return () => unsubscribe(); 
    }, []);

    // Función de Login
    const handleLogin = (username, password) => { 
        if (username === 'admin' && password === 'admin123') { 
            setRole('admin'); 
            setView('admin-dashboard'); 
            showNotification('Bienvenido Administrador'); 
        } else { 
            // Busca en el array de clubes que le pasamos desde App.jsx
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

    return { user, role, setRole, currentClub, setCurrentClub, handleLogin };
}