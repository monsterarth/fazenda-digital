//lib/utils.ts

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parse } from 'date-fns';
import { Timestamp } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
 * Converte um objeto Timestamp (do Firestore, Date ou número) para milissegundos.
 * @param ts O Timestamp a ser convertido.
 * @returns O valor em milissegundos como um número, ou 0 se a entrada for inválida.
 */
export function getMillisFromTimestamp(ts: Timestamp | null | undefined): number {
    if (!ts) {
        return 0;
    }
    // Se já for um número (serializado de um Server Component).
    if (typeof ts === 'number') {
        return ts;
    }
    // CORREÇÃO: Se for um objeto Date nativo do JavaScript.
    if (ts instanceof Date) {
        return ts.getTime();
    }
    // Se for um objeto Timestamp do Firestore (que tem o método toMillis).
    if (typeof (ts as any).toMillis === 'function') {
        return (ts as any).toMillis();
    }
    return 0;
}

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
    if (typeof data === 'object' && data !== null && !(data instanceof Date)) {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            newObj[key] = serializeFirestoreTimestamps(data[key]);
        }
        return newObj;
    }

    // Retorna o valor primitivo (ou Date) como está
    return data;
}

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

/**
 * Extrai o primeiro nome de um nome completo e o formata com a primeira letra maiúscula.
 * Ex: "JOAO PAULO" -> "Joao"
 * @param fullName O nome completo a ser formatado.
 * @returns O primeiro nome formatado.
 */
export function getFirstName(fullName: string | undefined | null): string {
    if (!fullName) {
        return "";
    }
    const firstName = fullName.split(' ')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}