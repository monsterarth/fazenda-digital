'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';
import { subDays, startOfDay, format } from 'date-fns';

export interface CommunicationStaySummary {
    id: string;
    guestName: string;
    cabinName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    guestPhone?: string;
}

export interface CommunicationLists {
    future: CommunicationStaySummary[];
    current: CommunicationStaySummary[];
    ended: CommunicationStaySummary[];
}

export async function getCommunicationListsAction(): Promise<CommunicationLists> {
    noStore(); // Evita cache, mas agora gastando menos recursos
    try {
        const lists: CommunicationLists = {
            future: [],
            current: [],
            ended: []
        };

        // Data de corte para estadias encerradas (3 dias atrás)
        // Assumindo que suas datas no banco são strings ISO YYYY-MM-DD
        const limitDateObj = subDays(startOfDay(new Date()), 3);
        const limitDateStr = limitDateObj.toISOString(); 

        // 1. Buscar Pendentes (Futuros)
        const pendingSnapshot = await adminDb.collection('stays')
            .where('status', 'in', ['pending_guest_data', 'pending_validation'])
            .get();

        // 2. Buscar Ativos (Atuais e Futuros confirmados)
        const activeSnapshot = await adminDb.collection('stays')
            .where('status', '==', 'active')
            .get();

        // 3. Buscar Encerrados RECENTES (Apenas últimos 3 dias)
        // ISSO SALVA MUITA QUOTA: Usamos o índice do banco em vez de filtrar na memória
        const endedSnapshot = await adminDb.collection('stays')
            .where('status', '==', 'checked_out')
            .where('checkOutDate', '>=', limitDateStr.split('T')[0]) // Comparação de string ISO funciona se o formato for YYYY-MM-DD
            .orderBy('checkOutDate', 'desc')
            .get();

        // Função auxiliar para processar documentos
        const processDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
            const data = doc.data();
            const checkInDate = typeof data.checkInDate === 'string' ? data.checkInDate : (data.checkInDate?.toDate?.()?.toISOString() || new Date().toISOString());
            const checkOutDate = typeof data.checkOutDate === 'string' ? data.checkOutDate : (data.checkOutDate?.toDate?.()?.toISOString() || new Date().toISOString());

            return {
                id: doc.id,
                guestName: data.guestName || 'Hóspede',
                cabinName: data.cabinName || 'Cabana',
                checkInDate,
                checkOutDate,
                status: data.status,
                guestPhone: data.guestPhone || data.tempGuestPhone
            } as CommunicationStaySummary;
        };

        // Popular listas
        pendingSnapshot.forEach(doc => lists.future.push(processDoc(doc)));
        
        // Ativos precisam ser separados entre "Current" (na casa) e "Future" (chega amanhã)
        const now = new Date();
        const startOfToday = startOfDay(now);

        activeSnapshot.forEach(doc => {
            const summary = processDoc(doc);
            const checkIn = new Date(summary.checkInDate);
            const checkOut = new Date(summary.checkOutDate);

            if (checkOut < startOfToday) {
                 // Deveria ter saído, mas status ainda é active. Joga pra ended.
                 lists.ended.push(summary);
            } else if (checkIn > startOfToday) {
                // Chega no futuro
                lists.future.push(summary);
            } else {
                // Está na casa
                lists.current.push(summary);
            }
        });

        endedSnapshot.forEach(doc => lists.ended.push(processDoc(doc)));

        // Ordenação final em memória (já que são poucos itens agora)
        lists.future.sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
        lists.current.sort((a, b) => new Date(a.checkOutDate).getTime() - new Date(b.checkOutDate).getTime());
        lists.ended.sort((a, b) => new Date(b.checkOutDate).getTime() - new Date(a.checkOutDate).getTime());

        return JSON.parse(JSON.stringify(lists));

    } catch (error) {
        console.error("Erro crítico ao buscar listas (Quota ou Rede):", error);
        // Retorna vazio para não quebrar a página inteira
        return { future: [], current: [], ended: [] };
    }
}