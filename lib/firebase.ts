import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configurações do Firebase (sem a parte de Storage)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa o Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function getFirebaseDb() {
  return db;
}

// NOVA FUNÇÃO uploadFile PARA O VERCEL BLOB
async function uploadFile(file: File, pathname: string): Promise<string> {
    try {
        // 1. Envia o arquivo para a nossa rota de API interna.
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

        // 2. A API retorna os detalhes do blob, incluindo a URL final de acesso.
        const newBlob = await response.json();

        // 3. Retorna a URL pública do arquivo.
        return newBlob.url;

    } catch (error) {
        console.error("Erro no upload para o Vercel Blob:", error);
        throw error; // Propaga o erro para ser pego pela UI (ex: toast de erro)
    }
}

export { getFirebaseDb, uploadFile, db };