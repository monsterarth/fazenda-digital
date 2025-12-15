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
        
        // Conversão de datas e setup do objeto
        const stayData = { 
            id: stayDoc.id, 
            ...rawStayData,
            checkInDate: typeof rawStayData?.checkInDate === 'object' ? rawStayData.checkInDate.toDate().toISOString() : rawStayData?.checkInDate,
            checkOutDate: typeof rawStayData?.checkOutDate === 'object' ? rawStayData.checkOutDate.toDate().toISOString() : rawStayData?.checkOutDate,
            createdAt: typeof rawStayData?.createdAt === 'object' ? rawStayData.createdAt.toDate().toISOString() : rawStayData?.createdAt,
            updatedAt: typeof rawStayData?.updatedAt === 'object' ? rawStayData.updatedAt.toDate().toISOString() : rawStayData?.updatedAt,
        } as any;

        // Busca logs novos
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

        // --- CORREÇÃO AQUI ---
        // Verificamos tanto nos logs novos quanto no campo antigo communicationStatus
        const commStatus = stayData.communicationStatus || {};

        const flags = {
            preCheckInSent: !!stayData.preCheckInId, 
            
            // Verifica LOG OU Campo na Estadia
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