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

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cabin));
  } catch (error) {
    console.error("Erro ao buscar cabanas:", error);
    return [];
  }
}