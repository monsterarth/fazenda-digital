// lib/firebase.ts

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
// ## INÍCIO DA CORREÇÃO ##
// Adicionada a importação do getAuth
import { getAuth, Auth } from "firebase/auth";
// ## FIM DA CORREÇÃO ##

// Suas configurações do Firebase
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ## INÍCIO DA CORREÇÃO ##
// Variáveis para garantir que estamos usando a mesma instância (padrão singleton)
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
// ## FIM DA CORREÇÃO ##

// Inicializa o Firebase de forma segura para o ambiente Next.js
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

// Inicializa os serviços
db = getFirestore(app);
auth = getAuth(app);


// Função para obter o Firestore
async function getFirebaseDb(): Promise<Firestore> {
    return db;
}

// ## INÍCIO DA CORREÇÃO ##
// Nova função para obter o Auth, que estava faltando
async function getFirebaseAuth(): Promise<Auth> {
    return auth;
}
// ## FIM DA CORREÇÃO ##


// Sua função original para upload com Vercel Blob - sem alterações
async function uploadFile(file: File, pathname: string): Promise<string> {
    try {
        const response = await fetch(
            `/api/upload?filename=${pathname}`,
            {
                method: 'POST',
                body: file,
            },
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Falha no upload do arquivo: ${errorText}`);
        }

        const newBlob = await response.json();
        return newBlob.url;

    } catch (error) {
        console.error("Erro no upload para o Vercel Blob:", error);
        throw error;
    }
}

// ## INÍCIO DA CORREÇÃO ##
// Exportando a nova função getFirebaseAuth junto com as existentes
export { getFirebaseDb, getFirebaseAuth, uploadFile, db, auth };
// ## FIM DA CORREÇÃO ##