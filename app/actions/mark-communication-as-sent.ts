// app/actions/mark-communication-as-sent.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

interface MarkAsSentPayload {
    stayId: string;
    messageType: 'feedback' | 'welcome'; // 'welcome' foi adicionado
}

export async function markCommunicationAsSent(payload: MarkAsSentPayload): Promise<{ success: boolean; error?: string }> {
    const { stayId, messageType } = payload;

    if (!stayId || !messageType) {
        return { success: false, error: "ID da estadia e tipo de mensagem são obrigatórios." };
    }

    try {
        const stayRef = adminDb.collection('stays').doc(stayId);

        // Mapeia o tipo de mensagem para o campo correto no Firestore
        const fieldToUpdateMap = {
            'feedback': 'communicationStatus.feedbackMessageSentAt',
            'welcome': 'communicationStatus.welcomeMessageSentAt' // CAMPO ADICIONADO
        };

        const fieldToUpdate = fieldToUpdateMap[messageType];

        if (!fieldToUpdate) {
            return { success: false, error: "Tipo de mensagem inválido." };
        }

        await stayRef.update({
            [fieldToUpdate]: Timestamp.now()
        });
        
        revalidatePath('/admin/comunicacao');

        return { success: true };

    } catch (error) {
        console.error("Erro ao marcar comunicação como enviada:", error);
        return { success: false, error: (error as Error).message };
    }
}