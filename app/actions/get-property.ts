// app/actions/get-property.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Property } from '@/types';
import { serializeFirestoreTimestamps } from '@/lib/utils'; // ++ ADICIONADO ++

export async function getProperty(): Promise<Property | undefined> {
  try {
    const snapshot = await adminDb.collection('properties').get();
    
    if (snapshot.empty) return undefined;

    const property = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

    // ++ CORREÇÃO: Usando a nova função de serialização ++
    return serializeFirestoreTimestamps(property);
  } catch (error) {
    console.error("Erro ao buscar dados da propriedade:", error);
    return undefined;
  }
}