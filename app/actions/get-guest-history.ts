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
        
        // Setup do objeto Stay
        const stayData = { 
            id: stayDoc.id, 
            ...rawStayData,
            checkInDate: typeof rawStayData?.checkInDate === 'object' ? rawStayData.checkInDate.toDate().toISOString() : rawStayData?.checkInDate,
            checkOutDate: typeof rawStayData?.checkOutDate === 'object' ? rawStayData.checkOutDate.toDate().toISOString() : rawStayData?.checkOutDate,
            createdAt: typeof rawStayData?.createdAt === 'object' ? rawStayData.createdAt.toDate().toISOString() : rawStayData?.createdAt,
            updatedAt: typeof rawStayData?.updatedAt === 'object' ? rawStayData.updatedAt.toDate().toISOString() : rawStayData?.updatedAt,
        } as any;

        // Busca logs
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

        // --- CORREÇÃO DE STATUS ---
        // Garante que communicationStatus seja um objeto, mesmo que venha null
        const commStatus = stayData.communicationStatus || {};

        const flags = {
            // CORRIGIDO: Agora verifica se existe o LOG OU se existe a data de envio no banco
            preCheckInSent: logs.some(l => l.type === 'whatsappPreCheckIn') || !!commStatus.preCheckInSentAt,
            
            welcomeSent: logs.some(l => l.type === 'whatsappWelcome') || !!commStatus.welcomeMessageSentAt,
            
            feedbackSent: logs.some(l => l.type === 'whatsappFeedbackRequest') || !!commStatus.feedbackSentAt,
            
            checkoutInfoSent: logs.some(l => l.type === 'whatsappCheckoutInfo') || !!commStatus.checkoutInfoSentAt,
        };

        return JSON.parse(JSON.stringify({ stay: stayData, logs, flags }));

    } catch (error) {
        console.error("Erro ao buscar histórico do hóspede:", error);
        return null;
    }
}