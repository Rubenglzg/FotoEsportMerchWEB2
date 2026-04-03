// src/config/firebase.js

/* * ============================================================================
 * ⚙️ CONFIGURACIÓN DE FIREBASE (BASE DE DATOS Y ALMACENAMIENTO)
 * ============================================================================
 * NOTA PARA PRINCIPIANTES:
 * Firebase es la nube de Google que usamos para guardar cosas.
 * Este archivo actúa como la "Llave" que enciende la conexión entre nuestra
 * página web y la base de datos de Google. Solo necesitamos encenderla una vez aquí.
 */

import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// 1. LAS CLAVES SECRETAS: Aquí le decimos a la web a qué base de datos conectarse.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 2. CREAMOS LAS HERRAMIENTAS: Preparamos las variables vacías.
let app, auth, db, storage, functions;

try {
    // 3. ENCENDEMOS LOS MOTORES:
    app = initializeApp(firebaseConfig);     // Arranca la app principal de Firebase
    
    // 🛡️ ESCUDO DE SEGURIDAD APP CHECK (Solo se ejecuta en el navegador)
    if (typeof window !== "undefined") {
        initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider('6Ldtx6QsAAAAACvItrTjsVbG7GOQaUu6E1JDdh7t'),
            isTokenAutoRefreshEnabled: true
        });
    }

    auth = getAuth(app);                     // Arranca el sistema de Usuarios y Contraseñas
    db = getFirestore(app);                  // Arranca la Base de Datos (textos, pedidos, clubs)
    storage = getStorage(app);               // Arranca el Disco Duro (imágenes, escudos, excel)
    
    // Arranca el motor de Funciones. 
    // NOTA: Si tus funciones están en una región concreta, ponla aquí. Ejemplo: getFunctions(app, 'europe-west1')
    functions = getFunctions(app);           

} catch (error) {
    // Si algo falla al conectar (ej. sin internet), avisamos en la consola oculta del navegador.
    console.error("Error inicializando Firebase:", error);
}

// 4. EXPORTAMOS: Hacemos que estas herramientas estén disponibles para que 
// cualquier otro archivo de nuestra web pueda usarlas importándolas.
export { app, auth, db, storage, functions };