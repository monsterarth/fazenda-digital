// app/actions/get-property.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Property } from "@/types";
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";

// Função auxiliar recursiva para converter Admin Timestamps
// (Mantemos esta função, pois JSON.stringify não lida bem com Timestamps)
function convertAdminTimestamps(obj: any): any {
  if (obj instanceof AdminTimestamp) {
    return obj.toDate().toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertAdminTimestamps);
  }
  
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      newObj[key] = convertAdminTimestamps(obj[key]);
    }
    return newObj;
  }
  
  return obj;
}

export async function getProperty(): Promise<Property | null> {
  try {
    const propRef = adminDb.collection('properties').doc('default');
    const propDoc = await propRef.get();
    
    if (!propDoc.exists) {
      return null;
    }
    
    const propertyData = propDoc.data();
    
    // 1. Converte todos os Admin Timestamps (como em 'policies')
    const plainPropertyData = convertAdminTimestamps(propertyData);

    // ## INÍCIO DA CORREÇÃO ##
    // 2. Garante 100% que o objeto é "plano" e serializável
    // Esta é a correção que faltava.
    const serializableData = JSON.parse(JSON.stringify(plainPropertyData));
    // ## FIM DA CORREÇÃO ##

    return serializableData as Property;

  } catch (error) {
    console.error("Erro ao buscar propriedade:", error);
    return null;
  }
}