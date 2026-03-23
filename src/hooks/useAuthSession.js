import { useState, useEffect } from 'react';
import { 
    signInAnonymously, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export function useAuthSession(clubs, showNotification, setView) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('public'); 
    const [currentClub, setCurrentClub] = useState(null); 
    const [authStep, setAuthStep] = useState('login'); 
    const [tempAdminData, setTempAdminData] = useState(null);
    const [hasCheckedSession, setHasCheckedSession] = useState(false);
    const [isPersistent, setIsPersistent] = useState(false);

    // Inicializar y escuchar cambios
    useEffect(() => { 
        // 1. Si existe un token inicial externo, lo usamos
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { 
            signInWithCustomToken(auth, __initial_auth_token).catch(()=>{});
        }

        // 2. onAuthStateChanged espera automáticamente a que Firebase revise la memoria
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                // Firebase encontró tu sesión (Admin, Club o Anónima) y te deja pasar
                setUser(u);
            } else {
                // SOLO si Firebase confirma al 100% que no hay NADA, creamos la anónima
                setUser(null);
                setRole(prev => prev === 'admin' ? 'public' : prev);
                
                try { 
                    await signInAnonymously(auth); 
                } catch(e) {
                    console.error("Error al iniciar sesión anónima", e);
                }
            }
        }); 
        
        return () => unsubscribe(); 
    }, []); // <--- ¡MUY IMPORTANTE! Los corchetes vacíos evitan que se reinicie en bucle

    useEffect(() => { 
        if (hasCheckedSession || !clubs || clubs.length === 0) return;

        const savedRole = localStorage.getItem('auth_role');
        const savedUserId = localStorage.getItem('auth_user_id');

        if (savedRole === 'admin') {
            setRole('admin');
            setIsPersistent(true);
        } else if (savedRole === 'club' && savedUserId) {
            const club = clubs.find(c => c.id === savedUserId);
            if (club) {
                setRole('club');
                setCurrentClub(club);
                setIsPersistent(true);
            }
        }
        setHasCheckedSession(true);
    }, [clubs, hasCheckedSession]);

    const handleLogin = async (rawUsername, password, rememberMe) => { 
        const username = rawUsername.trim().toLowerCase();
        setIsPersistent(rememberMe);

        // 1. Obtener los ajustes dinámicos del Administrador
        let adminAlias = 'admin';
        let adminEmail = 'fotoesportmerch@gmail.com';
        try {
            const adminAuthSnap = await getDoc(doc(db, 'settings', 'admin_auth'));
            if (adminAuthSnap.exists()) {
                adminAlias = adminAuthSnap.data().alias.toLowerCase();
                adminEmail = adminAuthSnap.data().email;
            }
        } catch (e) {
            console.error("Error cargando alias de admin", e);
        }

        // 2. Comprobar si intenta entrar como Admin
        if (username.includes('@') || username === adminAlias) { 
            const loginEmail = username === adminAlias ? adminEmail : username;
            try {
                await signInWithEmailAndPassword(auth, loginEmail, password);
                const adminRef = doc(db, 'config', 'admin_settings');
                const adminSnap = await getDoc(adminRef);
                
                if (!adminSnap.exists() || adminSnap.data().firstLogin2FA !== true) {
                    const code = Math.floor(100000 + Math.random() * 900000).toString();
                    await setDoc(doc(db, 'system', '2fa_temp'), { code, email: loginEmail, createdAt: new Date() });
                    await addDoc(collection(db, 'mail'), {
                        to: loginEmail,
                        message: {
                            subject: "Código de Seguridad - FotoEsport Merch",
                            html: `<div style="padding:20px;border:1px solid #eee;border-radius:10px;text-align:center;">
                                    <h2>Verificación de Acceso</h2>
                                    <div style="font-size:32px;font-weight:bold;color:#4F46E5;letter-spacing:5px;">${code}</div>
                                   </div>`
                        }
                    });
                    setTempAdminData({ rememberMe });
                    setAuthStep('2fa');
                } else {
                    completeAdminLogin(rememberMe);
                }
            } catch (error) {
                showNotification('Credenciales incorrectas', 'error');
            }
        } else { 
            // 3. Comprobar Clubes
            const club = clubs?.find(c => (c.username?.toLowerCase() === username || c.id === username) && c.pass === password); 
            if (club) { 
                setRole('club'); 
                setCurrentClub(club); 
                setView('club-dashboard'); 
                if (rememberMe) {
                    localStorage.setItem('auth_role', 'club');
                    localStorage.setItem('auth_user_id', club.id);
                }
                showNotification(`Bienvenido ${club.name}`); 
            } else { 
                showNotification('Credenciales incorrectas', 'error'); 
            } 
        } 
    };

    const verify2FA = async (code, rememberMe) => {
        try {
            const docRef = doc(db, 'system', '2fa_temp');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().code === code) {
                await setDoc(doc(db, 'config', 'admin_settings'), { firstLogin2FA: true }, { merge: true });
                completeAdminLogin(tempAdminData?.rememberMe || rememberMe);
                setAuthStep('login');
            } else {
                showNotification('Código incorrecto', 'error');
            }
        } catch (e) { showNotification('Error 2FA', 'error'); }
    };

    const completeAdminLogin = (rememberMe) => {
        setRole('admin'); 
        setView('admin-dashboard'); 
        if (rememberMe) {
            localStorage.setItem('auth_role', 'admin');
            localStorage.setItem('auth_user_id', 'admin');
        }
        showNotification('Acceso Administrador');
    };

    const logout = async () => {
        setView('home');
        setTimeout(async () => {
            localStorage.removeItem('auth_role');
            localStorage.removeItem('auth_user_id');
            setRole('public');
            setCurrentClub(null);
            setIsPersistent(false);
            try {
                await signOut(auth);
                await signInAnonymously(auth);
            } catch (e) {}
            showNotification('Sesión cerrada');
        }, 300);
    };

    return { 
        user, role, setRole, currentClub, setCurrentClub, 
        handleLogin, authStep, verify2FA, 
        handleResetPassword: (e) => sendPasswordResetEmail(auth, e), 
        logout, isPersistent 
    };
}