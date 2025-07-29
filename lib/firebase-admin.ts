import admin from 'firebase-admin';

export function initAdminApp() {
    // Evita a reinicialização do app se já houver uma instância rodando (útil em ambientes de desenvolvimento com hot-reload)
    if (admin.apps.length > 0) {
        return;
    }
    
    // Inicializa o SDK com as credenciais do ambiente
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // O replace é necessário para formatar corretamente a chave privada vinda das variáveis de ambiente
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}