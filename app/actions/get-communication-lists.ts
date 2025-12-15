'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';
import { addDays, isAfter, isBefore, isSameDay, startOfDay, subDays } from 'date-fns';

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
    noStore();
    try {
        const snapshot = await adminDb.collection('stays')
            .where('status', 'in', ['active', 'pending_guest_data', 'pending_validation', 'checked_out'])
            .get();

        const now = new Date();
        const startOfToday = startOfDay(now);
        const limitDate = subDays(startOfToday, 3); // Limite de 3 dias atrás

        const lists: CommunicationLists = {
            future: [],
            current: [],
            ended: []
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Conversão segura de datas
            const checkInDate = typeof data.checkInDate === 'string' ? data.checkInDate : (data.checkInDate?.toDate?.()?.toISOString() || new Date().toISOString());
            const checkOutDate = typeof data.checkOutDate === 'string' ? data.checkOutDate : (data.checkOutDate?.toDate?.()?.toISOString() || new Date().toISOString());

            const checkIn = new Date(checkInDate);
            const checkOut = new Date(checkOutDate);
            
            const summary: CommunicationStaySummary = {
                id: doc.id,
                guestName: data.guestName || 'Hóspede',
                cabinName: data.cabinName || 'Cabana',
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                status: data.status,
                guestPhone: data.guestPhone || data.tempGuestPhone
            };

            // Lógica de Classificação
            if (data.status === 'checked_out') {
                // FILTRO: Apenas encerrados nos últimos 3 dias
                if (isAfter(checkOut, limitDate)) {
                    lists.ended.push(summary);
                }
            } else if (data.status === 'pending_guest_data' || data.status === 'pending_validation') {
                lists.future.push(summary);
            } else if (data.status === 'active') {
                if (isBefore(checkOut, startOfToday)) {
                    // Ativa mas expirada (tratar como encerrada recente se dentro do prazo)
                    if (isAfter(checkOut, limitDate)) {
                        lists.ended.push(summary);
                    }
                } else if (isAfter(checkIn, startOfToday) && !isSameDay(checkIn, startOfToday)) {
                    lists.future.push(summary);
                } else {
                    lists.current.push(summary);
                }
            }
        });

        // Ordenação
        lists.future.sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
        lists.current.sort((a, b) => new Date(a.checkOutDate).getTime() - new Date(b.checkOutDate).getTime());
        lists.ended.sort((a, b) => new Date(b.checkOutDate).getTime() - new Date(a.checkOutDate).getTime()); // Mais recentes primeiro

        return JSON.parse(JSON.stringify(lists));

    } catch (error) {
        console.error("Erro ao buscar listas de comunicação:", error);
        return { future: [], current: [], ended: [] };
    }
}