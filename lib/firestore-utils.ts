// lib/firestore-utils.ts

// ++ CORREÇÃO: Removido o "use server"; daqui ++
// "use server"; // <-- ESTA LINHA CAUSOU O ERRO

import { Timestamp as AdminTimestamp } from "firebase-admin/firestore";

/**
 * Converte recursivamente AdminTimestamps para strings ISO.
 * Isso é necessário para passar dados de Server Actions para Componentes Client.
 */
export function convertAdminTimestamps(obj: any): any {
  if (obj instanceof AdminTimestamp) {
    return obj.toDate().toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertAdminTimestamps);
  }
  // Verifica se é um objeto simples (e não uma classe ou array)
  if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      newObj[key] = convertAdminTimestamps(obj[key]);
    }
    return newObj;
  }
  // Retorna qualquer outro tipo de dado (string, number, boolean)
  return obj;
}