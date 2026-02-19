// app/actions/mark-communication-as-sent.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

interface MarkAsSentPayload {
    stayId?: string; // Opcional para o novo tipo
    bookingId?: string; // Opcional para o novo tipo
    messageType: 'feedback' | 'welcome' | 'bookingConfirmation'; // Novo tipo adicionado
}

export async function markCommunicationAsSent(payload: MarkAsSentPayload): Promise<{ success: boolean; error?: string }> {
    const { stayId, bookingId, messageType } = payload;

    if ((messageType === 'feedback' || messageType === 'welcome') && !stayId) {
        return { success: false, error: "ID da estadia é obrigatório para este tipo de mensagem." };
    }

    if (messageType === 'bookingConfirmation' && !bookingId) {
        return { success: false, error: "ID da reserva é obrigatório para este tipo de mensagem." };
    }

    try {
        let docRef;
        let fieldToUpdate;

        switch (messageType) {
            case 'feedback':
                docRef = adminDb.collection('stays').doc(stayId!);
                fieldToUpdate = 'communicationStatus.feedbackMessageSentAt';
                break;
            case 'welcome':
                docRef = adminDb.collection('stays').doc(stayId!);
                fieldToUpdate = 'communicationStatus.welcomeMessageSentAt';
                break;
            case 'bookingConfirmation':
                docRef = adminDb.collection('bookings').doc(bookingId!);
                fieldToUpdate = 'confirmationSentAt'; // O novo campo na reserva
                break;
            default:
                return { success: false, error: "Tipo de mensagem inválido." };
        }

        await docRef.update({
            [fieldToUpdate]: Timestamp.now()
        });
        
        // Revalida o cache da página para refletir a mudança
        revalidatePath('/admin/comunicacao');

        return { success: true };

    } catch (error) {
        console.error("Erro ao marcar comunicação como enviada:", error);
        return { success: false, error: (error as Error).message };
    }
}