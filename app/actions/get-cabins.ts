// app/actions/get-cabins.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Cabin } from '@/types';

export async function getCabins(): Promise<Cabin[]> {
  try {
    const cabinsRef = adminDb.collection('cabins');
    const snapshot = await cabinsRef.orderBy('posicao', 'asc').get();

    if (snapshot.empty) {
      return [];
    }

    const cabins = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cabin));

    // ++ CORREÇÃO: Usando JSON stringify/parse para garantir a serialização completa ++
    return JSON.parse(JSON.stringify(cabins));
  } catch (error) {
    console.error("Erro ao buscar cabanas:", error);
    return [];
  }
}