// Importe o SDK Admin do Firebase
const admin = require('firebase-admin');

// Importe sua chave de serviço
const serviceAccount = require('./serviceAccountKey.json'); 

// Inicialize o app Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// O e-mail do usuário que você quer tornar administrador
const email = 'comercial@fazendadorosa.com.br';

async function setAdminClaim() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Sucesso! ${email} agora é um administrador.`);
    process.exit(0);
  } catch (error) {
    console.error('Erro ao definir a permissão de admin:', error);
    process.exit(1);
  }
}

setAdminClaim();