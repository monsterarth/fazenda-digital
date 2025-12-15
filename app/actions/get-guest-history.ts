'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';

export interface MessageLog {
    id: string;
    type: string;
    content: string;
    sentAt: string; 
    actor: string;
    status: string;
}

export interface GuestHistoryData {
    stay: any; 
    logs: MessageLog[];
    flags: {
        preCheckInSent: boolean;
        welcomeSent: boolean;
        feedbackSent: boolean;
        checkoutInfoSent: boolean;
    };
}

export async function getGuestHistoryAction(stayId: string): Promise<GuestHistoryData | null> {
    noStore();
    try {
        const stayDoc = await adminDb.collection('stays').doc(stayId).get();
        if (!stayDoc.exists) return null;
        
        const rawStayData = stayDoc.data();
        
        // CORREÇÃO: Adicionado 'as any' ao final para corrigir o erro de tipo do preCheckInId
        // mantendo a conversão de datas para evitar erro de serialização do Next.js
        const stayData = { 
            id: stayDoc.id, 
            ...rawStayData,
            checkInDate: typeof rawStayData?.checkInDate === 'object' ? rawStayData.checkInDate.toDate().toISOString() : rawStayData?.checkInDate,
            checkOutDate: typeof rawStayData?.checkOutDate === 'object' ? rawStayData.checkOutDate.toDate().toISOString() : rawStayData?.checkOutDate,
            createdAt: typeof rawStayData?.createdAt === 'object' ? rawStayData.createdAt.toDate().toISOString() : rawStayData?.createdAt,
            updatedAt: typeof rawStayData?.updatedAt === 'object' ? rawStayData.updatedAt.toDate().toISOString() : rawStayData?.updatedAt,
        } as any;

        const logsSnap = await adminDb.collection('message_logs')
            .where('stayId', '==', stayId)
            .orderBy('sentAt', 'desc')
            .get();

        const logs: MessageLog[] = logsSnap.docs.map(doc => {
            const data = doc.data();
            const sentAt = data.sentAt && typeof data.sentAt.toDate === 'function' 
                ? data.sentAt.toDate().toISOString() 
                : new Date().toISOString();

            return {
                id: doc.id,
                type: data.type,
                content: data.content,
                sentAt: sentAt,
                actor: data.actor,
                status: data.status
            };
        });

        const flags = {
            preCheckInSent: !!stayData.preCheckInId, 
            welcomeSent: logs.some(l => l.type === 'whatsappWelcome'),
            feedbackSent: logs.some(l => l.type === 'whatsappFeedbackRequest'),
            checkoutInfoSent: logs.some(l => l.type === 'whatsappCheckoutInfo'),
        };

        return JSON.parse(JSON.stringify({ stay: stayData, logs, flags }));

    } catch (error) {
        console.error("Erro ao buscar histórico do hóspede:", error);
        return null;
    }
}