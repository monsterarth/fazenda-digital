// set-role.js

// Importe o SDK Admin do Firebase
const admin = require('firebase-admin');

// Importe sua chave de serviço
const serviceAccount = require('./serviceAccountKey.json'); 

// Inicialize o app Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --- Lógica de Argumentos ---
// process.argv[0] = node
// process.argv[1] = set-role.js
// process.argv[2] = email
// process.argv[3] = role
const [,, email, role] = process.argv;

// --- Nossas Roles Válidas ---
const validRoles = [
  "super_admin",
  "recepcao",
  "marketing",
  "cafe",
  "manutencao",
  "guarita"
];

// --- Validação ---
if (!email || !role) {
  console.error('\nErro: E-mail e função (role) são obrigatórios.');
  console.log('\nUso: node set-role.js <email_do_usuario> <funcao>\n');
  console.log('Funções válidas:', validRoles.join(', '));
  process.exit(1);
}

if (!validRoles.includes(role)) {
  console.error(`\nErro: Função "${role}" inválida.\n`);
  console.log('Funções válidas:', validRoles.join(', '));
  process.exit(1);
}

// --- Função Principal ---
async function setRoleClaim() {
  try {
    // Busca o usuário pelo e-mail
    const user = await admin.auth().getUserByEmail(email);
    
    // Define o custom claim (ATENÇÃO: isso apaga claims antigos, como "admin: true")
    await admin.auth().setCustomUserClaims(user.uid, { role: role });
    
    console.log(`\nSucesso! ${email} agora tem a função: ${role}.\n`);
    process.exit(0);

  } catch (error) {
    console.error('\nErro ao definir a função:', error.message);
    process.exit(1);
  }
}

setRoleClaim();