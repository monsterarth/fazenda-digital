// app/actions/get-cabins.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Cabin } from "@/types";
// ## INÍCIO DA CORREÇÃO ##
// Importa o 'Timestamp' do SDK ADMIN
import { Timestamp as AdminTimestamp } from "firebase-admin/firestore"; 
// ## FIM DA CORREÇÃO ##

// Função auxiliar para converter Admin Timestamps
function convertAdminTimestamps(obj: any): any {
  // ## INÍCIO DA CORREÇÃO ##
  // A verificação é contra o 'AdminTimestamp' importado, 
  // não 'adminDb.Timestamp'
  if (obj instanceof AdminTimestamp) { 
  // ## FIM DA CORREÇÃO ##
    return obj.toDate().toISOString(); // Converte para string ISO
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

export async function getCabins(): Promise<Cabin[]> {
  try {
    const cabinsSnapshot = await adminDb.collection('cabins').orderBy('posicao', 'asc').get();
    
    const cabins = cabinsSnapshot.docs.map(doc => {
      const data = doc.data();
      // Converte quaisquer Timestamps de admin
      const plainData = convertAdminTimestamps(data);
      
      return { 
        id: doc.id, 
        ...plainData
      } as Cabin;
    });

    // A conversão de Timestamps para strings ISO já torna o objeto "plano".
    // O JSON.parse(JSON.stringify()) é uma garantia extra.
    return JSON.parse(JSON.stringify(cabins));

  } catch (error) {
    console.error("Erro ao buscar cabanas:", error);
    return [];
  }
}