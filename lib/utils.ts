import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse } from 'date-fns';
import { Timestamp } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NOVA FUNÇÃO
export const isOrderingWindowActive = (startTimeStr?: string, endTimeStr?: string): boolean => {
    if (!startTimeStr || !endTimeStr) return false;
    try {
        const now = new Date();
        const start = parse(startTimeStr, 'HH:mm', new Date());
        const end = parse(endTimeStr, 'HH:mm', new Date());
        return now >= start && now <= end;
    } catch (e) {
        console.error("Error parsing time strings:", e);
        return false;
    }
};

/**
 * Converte um objeto Timestamp (do Firestore ou serializado como número) para milissegundos.
 * @param ts O Timestamp a ser convertido.
 * @returns O valor em milissegundos como um número, ou 0 se a entrada for inválida.
 */
export function getMillisFromTimestamp(ts: Timestamp | null | undefined): number {
  if (!ts) {
    return 0;
  }
  // Se já for um número (serializado de um Server Component), retorne-o.
  if (typeof ts === 'number') {
    return ts;
  }
  // Se for um objeto Timestamp, use o método toMillis().
  if (typeof ts.toMillis === 'function') {
    return ts.toMillis();
  }
  return 0;
}

// ++ INÍCIO DA ADIÇÃO ++
/**
 * Percorre recursivamente um objeto ou array e converte todas as instâncias de 
 * Timestamp do Firestore (que são classes) em números (milissegundos).
 * @param data O objeto ou array a ser processado.
 * @returns Os dados com todos os Timestamps convertidos para números.
 */
export function serializeFirestoreTimestamps(data: any): any {
  if (!data) {
    return data;
  }

  // Se for um array, percorre cada item
  if (Array.isArray(data)) {
    return data.map(item => serializeFirestoreTimestamps(item));
  }

  // Se for um objeto Timestamp do Firestore (identificado pela função toMillis)
  if (data && typeof data.toMillis === 'function') {
    return data.toMillis();
  }

  // Se for um objeto genérico, percorre cada propriedade
  if (typeof data === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      newObj[key] = serializeFirestoreTimestamps(data[key]);
    }
    return newObj;
  }

  // Retorna o valor primitivo como está
  return data;
}
// ++ FIM DA ADIÇÃO ++

/**
 * Normaliza uma string para CAIXA ALTA, sem acentos ou caracteres especiais.
 * @param str A string a ser normalizada.
 * @returns A string normalizada.
 */
export function normalizeString(str: string) {
    if (!str) return "";
    return str
      .normalize("NFD") // Normaliza para decompor os caracteres acentuados
      .replace(/[\u0300-\u036f]/g, "") // Remove os diacríticos (acentos)
      .replace(/[^a-zA-Z0-9\s]/g, "") // Remove caracteres especiais, exceto espaços
      .toUpperCase(); // Converte para caixa alta
}