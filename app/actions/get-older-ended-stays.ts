'use server'

import { adminDb } from '@/lib/firebase-admin';
import { CommunicationStaySummary } from './get-communication-lists';
import { unstable_noStore as noStore } from 'next/cache';

export async function getOlderEndedStaysAction(lastCheckOutDate: string): Promise<CommunicationStaySummary[]> {
    noStore();
    try {
        // Busca estadias encerradas cuja data de checkout seja ANTERIOR à última carregada
        // Ordenadas da mais recente para a mais antiga
        const snapshot = await adminDb.collection('stays')
            .where('status', '==', 'checked_out')
            .orderBy('checkOutDate', 'desc')
            .startAfter(lastCheckOutDate)
            .limit(10) // Carrega de 10 em 10
            .get();

        const stays: CommunicationStaySummary[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            
            const checkInDate = typeof data.checkInDate === 'string' ? data.checkInDate : (data.checkInDate?.toDate?.()?.toISOString() || new Date().toISOString());
            const checkOutDate = typeof data.checkOutDate === 'string' ? data.checkOutDate : (data.checkOutDate?.toDate?.()?.toISOString() || new Date().toISOString());

            stays.push({
                id: doc.id,
                guestName: data.guestName || 'Hóspede',
                cabinName: data.cabinName || 'Cabana',
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                status: data.status,
                guestPhone: data.guestPhone || data.tempGuestPhone
            });
        });

        return JSON.parse(JSON.stringify(stays));

    } catch (error) {
        console.error("Erro ao buscar estadias antigas:", error);
        return [];
    }
}