// app/actions/populate-breakfast-checkins.ts
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { firestore } from 'firebase-admin';
// ++ CORREÇÃO: Importa PreCheckIn para ler os nomes dos acompanhantes
import { Stay, Property, PreCheckIn } from '@/types/index'; 
import { BreakfastAttendee } from '@/types/cafe';

const TARGET_COLLECTION = 'breakfastAttendees';

/**
 * Server Action (v3): Popula 'breakfastAttendees' (1/pessoa)
 * AGORA COM OS NOMES REAIS DOS ACOMPANHANTES.
 *
 * O que ela faz:
 * 1. Verifica se o café é 'on-site'.
 * 2. Busca estadias 'active'.
 * 3. Para cada estadia:
 * a. Busca o documento 'preCheckIns' associado.
 * b. Se os participantes do dia ainda não existem:
 * c. Cria (N) documentos 'breakfastAttendees', usando os nomes
 * do 'preCheckIn' e 'stay'.
 */
export async function populateBreakfastCheckins() {
  console.log('Running populateBreakfastCheckins (v3 - Nomes Reais)...');

  // 1. Verificar se o café é 'on-site'
  const propertyRef = adminDb.collection('properties').doc('default');
  const propertyDoc = await propertyRef.get();
  if (!propertyDoc.exists) {
    throw new Error('Configurações da propriedade não encontradas.');
  }
  const property = propertyDoc.data() as Property;

  if (property.breakfast?.type !== 'on-site') {
    return {
      success: true,
      message: 'Café da manhã não é "on-site".',
      skipped: true,
      totalGuestsAdded: 0,
    };
  }

  // 2. Obter a data de "hoje"
  const todayStr = new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  // 3. Buscar todas as estadias ativas
  const staysRef = adminDb.collection('stays');
  const activeStaysSnapshot = await staysRef.where('status', '==', 'active').get();

  if (activeStaysSnapshot.empty) {
    return { success: true, message: 'Nenhuma estadia ativa.', created: 0, totalGuestsAdded: 0 };
  }

  const activeStays = activeStaysSnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Stay
  );

  const attendeesRef = adminDb.collection(TARGET_COLLECTION);
  let totalGuestsAdded = 0;
  let staysProcessed = 0;

  // 4. Processar cada estadia ativa
  await Promise.all(
    activeStays.map(async (stay) => {
      // 5. Verificar se já existem participantes para esta estadia HOJE
      const existingQuery = await attendeesRef
        .where('stayId', '==', stay.id)
        .where('date', '==', todayStr)
        .limit(1)
        .get();

      // 6. Se NÃO existir, cria os N registros (1 por hóspede)
      if (existingQuery.empty) {
        
        // ++ LÓGICA ADICIONADA: BUSCAR NOMES DOS ACOMPANHANTES ++
        let companionNames: string[] = [];
        //
        if (stay.preCheckInId) { 
          try {
            const preCheckInRef = adminDb.collection('preCheckIns').doc(stay.preCheckInId);
            const preCheckInDoc = await preCheckInRef.get();
            if (preCheckInDoc.exists) {
              const preCheckInData = preCheckInDoc.data() as PreCheckIn;
              //
              companionNames = preCheckInData.companions.map(c => c.fullName); 
            }
          } catch (e) {
            console.warn(`Falha ao buscar preCheckIn ${stay.preCheckInId} para a estadia ${stay.id}`, e);
          }
        }
        // ++ FIM DA LÓGICA ADICIONADA ++

        const batch = adminDb.batch();
        const numGuests = stay.numberOfGuests || 1;

        for (let i = 0; i < numGuests; i++) {
          const isPrimary = i === 0;
          
          // ++ LÓGICA DE NOME MELHORADA ++
          let guestName = '';
          if (isPrimary) {
            guestName = stay.guestName; // Hóspede principal
          } else {
            // Tenta pegar o nome real do acompanhante (índice i-1)
            guestName = companionNames[i - 1] || `Acompanhante ${i} (${stay.cabinName})`;
          }
          // ++ FIM DA LÓGICA DE NOME ++

          const newAttendeeRef = attendeesRef.doc();
          const newAttendeeData: Omit<BreakfastAttendee, 'id'> = {
            stayId: stay.id,
            cabinName: stay.cabinName,
            guestName: guestName,
            isPrimary: isPrimary,
            date: todayStr,
            status: 'pending',
            table: null,
            checkInAt: null,
            createdAt: firestore.FieldValue.serverTimestamp() as firestore.Timestamp,
          };
          
          batch.set(newAttendeeRef, newAttendeeData);
        }
        
        await batch.commit();
        totalGuestsAdded += numGuests;
        staysProcessed++;
      }
    })
  );

  return {
    success: true,
    message: `Populado com sucesso. ${totalGuestsAdded} participantes criados para ${staysProcessed} estadias.`,
    created: staysProcessed,
    totalGuestsAdded: totalGuestsAdded,
  };
}