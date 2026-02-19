// app/actions/send-communication.ts
'use server'

import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { markCommunicationAsSent } from './mark-communication-as-sent';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface SendCommunicationParams {
    phone: string;
    message: string;
    guestName: string;
    stayId?: string;
    bookingId?: string;
    templateKey?: string; 
    adminEmail: string; 
}

export async function sendCommunicationAction(params: SendCommunicationParams) {
    try {
        const { phone, message, guestName, stayId, bookingId, templateKey, adminEmail } = params;

        // 1. Limpeza inteligente do telefone
        const rawPhone = phone.trim();
        const isInternational = rawPhone.startsWith('+');

        // Remove tudo que não for número
        let cleanPhone = rawPhone.replace(/\D/g, '');

        // Se o original tinha '+', recolocamos ele no início para indicar Internacional
        if (isInternational) {
            cleanPhone = '+' + cleanPhone;
        }

        // Validação básica (usamos o tamanho dos dígitos para garantir que não é vazio ou muito curto)
        const digitsOnly = cleanPhone.replace('+', '');
        if (digitsOnly.length < 8) {
            return { success: false, message: "Número de telefone inválido." };
        }

        // 2. Envio via API
        console.log(`[SendCommunication] Enviando para ${guestName} (${cleanPhone})...`);
        
        // Agora o cleanPhone vai com o '+' se for internacional, evitando erro de LID
        const result = await sendWhatsAppMessage(cleanPhone, message);

        if (!result.success) {
            return { success: false, message: `Erro na API: ${result.error}` };
        }

        // 3. Logar a mensagem
        const logRef = adminDb.collection('message_logs').doc();
        await logRef.set({
            type: templateKey || 'custom_message',
            content: message,
            guestName: guestName,
            stayId: stayId || null,
            actor: adminEmail,
            sentAt: Timestamp.now(),
            status: 'sent_via_api',
            phone: cleanPhone // Salva o telefone formatado corretamente
        });

        // 4. Marcar como enviada se for template
        if (templateKey) {
            let messageType: 'feedback' | 'welcome' | 'bookingConfirmation' | null = null;

            if (templateKey === 'whatsappFeedbackRequest') messageType = 'feedback';
            else if (templateKey === 'whatsappWelcome') messageType = 'welcome';
            else if (templateKey === 'whatsappBookingConfirmed') messageType = 'bookingConfirmation';

            if (messageType) {
                await markCommunicationAsSent({ 
                    messageType, 
                    stayId, 
                    bookingId 
                });
            }
        }

        return { success: true, message: "Mensagem enviada com sucesso!" };

    } catch (error: any) {
        console.error("[SendCommunication] Erro crítico:", error);
        return { success: false, message: "Erro interno ao processar envio." };
    }
}