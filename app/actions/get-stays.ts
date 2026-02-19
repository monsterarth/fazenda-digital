// app/actions/get-stays.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Stay } from '@/types';
export async function getStays(): Promise<Stay[]> {
  try {
    const staysRef = adminDb.collection('stays');
    const snapshot = await staysRef
      .where('status', '==', 'active')
      .orderBy('checkInDate', 'asc')
      .get();

    if (snapshot.empty) return [];

    const stays = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // ++ CORREÇÃO: Usando JSON stringify/parse para garantir a serialização completa ++
    return JSON.parse(JSON.stringify(stays));
  } catch (error) {
    console.error("Erro ao buscar estadias ativas:", error);
    return [];
  }
}