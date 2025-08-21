// app/actions/get-pending-checkins.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { PreCheckIn } from '@/types';
import { serializeFirestoreTimestamps } from '@/lib/utils'; // ++ ADICIONADO ++

export async function getPendingCheckIns(): Promise<PreCheckIn[]> {
  try {
    const preCheckInsRef = adminDb.collection('preCheckIns');
    const snapshot = await preCheckInsRef.where('status', '==', 'pendente').get();

    if (snapshot.empty) return [];

    const checkins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // ++ CORREÇÃO: Usando a nova função de serialização ++
    return serializeFirestoreTimestamps(checkins);
  } catch (error) {
    console.error("Erro ao buscar pré-check-ins pendentes:", error);
    return [];
  }
}