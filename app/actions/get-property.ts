// app/actions/get-property.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Property } from '@/types';

export async function getProperty(): Promise<Property | undefined> {
  try {
    const propertiesRef = adminDb.collection('properties');
    const snapshot = await propertiesRef.get();
    
    if (snapshot.empty) return undefined;

    const property = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };

    // ++ CORREÇÃO: Usando JSON stringify/parse para garantir a serialização completa ++
    return JSON.parse(JSON.stringify(property));
  } catch (error) {
    console.error("Erro ao buscar dados da propriedade:", error);
    return undefined;
  }
}