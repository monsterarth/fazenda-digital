'use server'

import { adminDb } from '@/lib/firebase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { revalidatePath } from 'next/cache';

export async function resendFastStayWhatsapp(stayId: string, phoneNumber: string) {
    try {
        // 1. Buscar a estadia
        const stayRef = adminDb.collection('stays').doc(stayId);
        const staySnap = await stayRef.get();

        if (!staySnap.exists) return { success: false, message: "Estadia não encontrada." };

        const data = staySnap.data();
        
        // Se o número foi corrigido, atualizamos no banco
        if (phoneNumber !== data?.guestPhone) {
            await stayRef.update({ 
                guestPhone: phoneNumber,
                tempGuestPhone: phoneNumber 
            });
        }

        // 2. Reconstrói a mensagem
        const token = data?.token;
        const guestName = data?.guestName || 'Hóspede';
        const cabinName = data?.cabinName || 'sua cabana';
        
        if (!token) return { success: false, message: "Esta estadia não tem um token de acesso." };

        const dynamicLink = `https://portal.fazendadorosa.com.br/pre-check-in?token=${token}`;
        const firstName = guestName.split(' ')[0];

        const message = 
            `Olá *${firstName}*! (Reenvio) 🌿\n\n` +
            `Sua reserva na *${cabinName}* está confirmada.\n` +
            `Código de acesso: *${token}*\n\n` +
            `Acesse este link para liberar sua entrada na portaria:\n` +
            `${dynamicLink}`;

        // 3. Envia
        console.log(`[Resend] Reenviando para ${phoneNumber}`);
        const result = await sendWhatsAppMessage(phoneNumber, message);

        if (result.success) {
            revalidatePath('/admin/stays');
            return { success: true, message: "Mensagem reenviada com sucesso!" };
        } else {
            return { success: false, message: `Erro no WhatsApp: ${result.error}` };
        }

    } catch (error: any) {
        console.error("Erro ao reenviar:", error);
        return { success: false, message: error.message };
    }
}