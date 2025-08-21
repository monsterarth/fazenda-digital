// app/actions/get-pending-checkins.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { PreCheckIn } from '@/types';

export async function getPendingCheckIns(): Promise<PreCheckIn[]> {
  try {
    const snapshot = await adminDb
      .collection('preCheckIns')
      .where('status', '==', 'pendente')
      .get();

    if (snapshot.empty) return [];

    const checkins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // ++ CORREÇÃO: Usando JSON stringify/parse para garantir a serialização completa ++
    return JSON.parse(JSON.stringify(checkins));
  } catch (error) {
    console.error("Erro ao buscar pré-check-ins pendentes:", error);
    return [];
  }
}