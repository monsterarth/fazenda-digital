'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';
import { subDays, startOfDay } from 'date-fns';

export interface CommunicationStaySummary {
    id: string;
    guestName: string;
    cabinName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    guestPhone?: string;
    cabinPosicao?: number;
}

export interface CommunicationLists {
    future: CommunicationStaySummary[];
    current: CommunicationStaySummary[];
    ended: CommunicationStaySummary[];
}

export async function getCommunicationListsAction(): Promise<CommunicationLists> {
    noStore(); 
    try {
        const lists: CommunicationLists = {
            future: [],
            current: [],
            ended: []
        };

        const limitDateObj = subDays(startOfDay(new Date()), 7);
        const limitDateStr = limitDateObj.toISOString().split('T')[0];

        // 1. Buscas paralelas
        const [cabinsSnapshot, futureSnapshot, activeSnapshot, endedSnapshot] = await Promise.all([
            adminDb.collection('cabins').get(),
            adminDb.collection('stays')
                .where('status', 'in', ['pending_guest_data', 'pending_validation'])
                .get(),
            adminDb.collection('stays')
                .where('status', '==', 'active')
                .get(),
            adminDb.collection('stays')
                .where('status', '==', 'checked_out')
                .where('checkOutDate', '>=', limitDateStr)
                .orderBy('checkOutDate', 'desc')
                .get()
        ]);

        // 2. Mapear Posições
        const cabinPositionMap = new Map<string, number>();
        cabinsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.posicao !== undefined && data.posicao !== null) {
                cabinPositionMap.set(doc.id, Number(data.posicao));
            }
        });

        // 3. Processar Documentos
        const processDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            const data = doc.data();
            
            const checkInDate = typeof data.checkInDate === 'string' 
                ? data.checkInDate 
                : (data.checkInDate?.toDate?.()?.toISOString() || new Date().toISOString());
            
            const checkOutDate = typeof data.checkOutDate === 'string' 
                ? data.checkOutDate 
                : (data.checkOutDate?.toDate?.()?.toISOString() || new Date().toISOString());

            const cabinId = data.cabinId;
            const posicao = cabinId ? cabinPositionMap.get(cabinId) : undefined;

            return {
                id: doc.id,
                guestName: data.guestName || 'Hóspede',
                cabinName: data.cabinName || 'Cabana',
                checkInDate,
                checkOutDate,
                status: data.status,
                guestPhone: data.guestPhone || data.tempGuestPhone,
                cabinPosicao: posicao
            } as CommunicationStaySummary;
        };

        futureSnapshot.forEach(doc => lists.future.push(processDoc(doc)));
        activeSnapshot.forEach(doc => lists.current.push(processDoc(doc)));
        endedSnapshot.forEach(doc => lists.ended.push(processDoc(doc)));

        // 4. ORDENAÇÃO (Alterada para Ordem Crescente de Cabana)
        
        const sortByCabin = (a: CommunicationStaySummary, b: CommunicationStaySummary) => {
            // Se não tiver posição, joga para o final (9999)
            const posA = a.cabinPosicao ?? 9999;
            const posB = b.cabinPosicao ?? 9999;
            
            if (posA !== posB) {
                return posA - posB; // Ordem crescente (1, 2, 3...)
            }
            
            // Critério de desempate: Data de Check-in
            return new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime();
        };

        // Aplica ordenação por cabana em Futuros e Atuais
        lists.future.sort(sortByCabin);
        lists.current.sort(sortByCabin);
        
        // Fim (Encerrados) mantém ordem cronológica (quem saiu por último aparece primeiro)
        lists.ended.sort((a, b) => new Date(b.checkOutDate).getTime() - new Date(a.checkOutDate).getTime());

        return JSON.parse(JSON.stringify(lists));

    } catch (error) {
        console.error("Erro crítico ao buscar listas de comunicação:", error);
        return { future: [], current: [], ended: [] };
    }
}