// scripts/migrate-guests.js

// IMPORTANTE: Para executar este script:
// 1. Verifique se as credenciais do Firebase Admin (`serviceAccountKey.json`) estão corretas.
// 2. No terminal, na raiz do projeto, execute: node scripts/migrate-guests.js
// 3. Execute apenas UMA VEZ.

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateStaysToGuests() {
  console.log('Iniciando migração (Versão Final, baseada em types/index.ts)...');

  const staysRef = db.collection('stays');
  const preCheckInsRef = db.collection('preCheckIns');
  const guestsRef = db.collection('guests');

  // 1. Carregar pré-check-ins para um mapa.
  console.log('Carregando dados de pré check-in...');
  const preCheckInsSnapshot = await preCheckInsRef.get();
  const preCheckInsMap = new Map();
  preCheckInsSnapshot.forEach(doc => {
    preCheckInsMap.set(doc.id, doc.data());
  });
  console.log(`${preCheckInsMap.size} registros de pré check-in carregados.`);

  // 2. Ler estadias.
  console.log('Lendo todas as estadias...');
  const staysSnapshot = await staysRef.get();
  if (staysSnapshot.empty) {
    console.log('Nenhuma estadia encontrada.');
    return;
  }
  console.log(`${staysSnapshot.size} estadias encontradas.`);

  const guestsDataMap = new Map();

  // 3. Cruzar dados de 'stays' e 'preCheckIns'.
  for (const stayDoc of staysSnapshot.docs) {
    const stay = stayDoc.data();
    const stayId = stayDoc.id;

    // ++ INÍCIO DA CORREÇÃO: Lendo 'checkInDate' como string, conforme types/index.ts ++
    if (!stay.checkInDate || typeof stay.checkInDate !== 'string') {
      console.warn(`- AVISO: Estadia ${stayId} não possui 'checkInDate' (string) válida. Será ignorada.`);
      continue;
    }
    const checkInDate = new Date(stay.checkInDate);
    if (isNaN(checkInDate.getTime())) {
        console.warn(`- AVISO: A data de check-in '${stay.checkInDate}' da estadia ${stayId} é inválida. Será ignorada.`);
        continue;
    }
    // ++ FIM DA CORREÇÃO ++

    const preCheckInId = stay.preCheckInId;
    if (!preCheckInId) {
      console.warn(`- AVISO: Estadia ${stayId} não possui preCheckInId. Será ignorada.`);
      continue;
    }

    const preCheckInData = preCheckInsMap.get(preCheckInId);
    if (!preCheckInData) {
      console.error(`- ERRO: Pré check-in ${preCheckInId} (da estadia ${stayId}) não encontrado. Será ignorado.`);
      continue;
    }
    
    if (!preCheckInData.leadGuestDocument || !preCheckInData.leadGuestName) {
        console.warn(`- AVISO: Pré check-in ${preCheckInId} não contém dados essenciais. Será ignorado.`);
        continue;
    }

    const cpf = preCheckInData.leadGuestDocument.replace(/\D/g, '');
    if (!cpf || (preCheckInData.isForeigner === false && cpf.length !== 11)) {
      console.log(`- Ignorando estadia ${stayId} (CPF '${cpf || 'N/A'}') por ser inválido.`);
      continue;
    }
    
    if (!guestsDataMap.has(cpf)) {
      guestsDataMap.set(cpf, []);
    }
    
    guestsDataMap.get(cpf).push({
        stayId: stayId,
        checkInDate: checkInDate, // Agora é um objeto Date
        guestInfo: preCheckInData
    });
  }

  console.log(`\nEncontrados ${guestsDataMap.size} hóspedes únicos para processar.`);
  if (guestsDataMap.size === 0) {
    console.log('Nenhum hóspede válido para migrar. Encerrando.');
    return;
  }

  // 4. Criar os documentos na coleção 'guests'.
  const batch = db.batch();
  let operations = 0;

  for (const [cpf, records] of guestsDataMap.entries()) {
    records.sort((a, b) => b.checkInDate.getTime() - a.checkInDate.getTime());
    
    const latestRecord = records[0];
    const firstRecord = records[records.length - 1];

    const guestProfile = {
      name: latestRecord.guestInfo.leadGuestName,
      cpf: cpf,
      email: latestRecord.guestInfo.leadGuestEmail,
      phone: (latestRecord.guestInfo.leadGuestPhone || '').replace(/\D/g, ''),
      address: latestRecord.guestInfo.address || {},
      isForeigner: latestRecord.guestInfo.isForeigner || false,
      country: latestRecord.guestInfo.country || '',
      createdAt: firstRecord.checkInDate.getTime(),
      updatedAt: latestRecord.checkInDate.getTime(),
      stayHistory: records.map(r => r.stayId)
    };

    const guestDocRef = guestsRef.doc(cpf); 
    batch.set(guestDocRef, guestProfile, { merge: true });
    operations++;
    
    if (operations >= 499) {
      await batch.commit();
      batch = db.batch();
      operations = 0;
      console.log('Commit de batch parcial realizado...');
    }
  }

  if (operations > 0) {
    await batch.commit();
    console.log('Commit do batch final realizado.');
  }

  console.log(`\nMigração concluída com sucesso! ${guestsDataMap.size} hóspedes foram processados.`);
}

migrateStaysToGuests().catch(error => {
    console.error("\nOcorreu um erro fatal durante a migração:", error);
});