'use server'

import { adminDb } from '@/lib/firebase-admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { revalidatePath } from 'next/cache';

export async function resendFastStayWhatsapp(stayId: string, phoneNumber: string) {
    try {
        // 1. Buscar a Estadia E a Configuração da Propriedade (para pegar o template)
        const [staySnap, propertySnap] = await Promise.all([
            adminDb.collection('stays').doc(stayId).get(),
            adminDb.collection('properties').doc('default').get()
        ]);

        if (!staySnap.exists) return { success: false, message: "Estadia não encontrada." };

        const data = staySnap.data();
        const propertyData = propertySnap.data();
        
        // Se o número foi corrigido na tela, atualizamos no banco
        if (phoneNumber !== data?.guestPhone) {
            await adminDb.collection('stays').doc(stayId).update({ 
                guestPhone: phoneNumber,
                tempGuestPhone: phoneNumber 
            });
        }

        // 2. Dados Base
        const token = data?.token;
        const guestName = data?.guestName || 'Hóspede';
        // Se não tiver cabana definida ou for "A Definir", tratamos como null para limpar da mensagem
        let cabinName = data?.cabinName;
        if (!cabinName || cabinName === "A Definir") {
            cabinName = null;
        }
        
        if (!token) return { success: false, message: "Esta estadia não tem um token de acesso." };

        // 3. Reconstrução da Mensagem (Lógica idêntica ao Create Fast Stay)
        const dynamicLink = `https://portal.fazendadorosa.com.br/?token=${token}`;
        let whatsappTemplate = propertyData?.messages?.whatsappPreCheckIn || propertyData?.whatsappPreCheckIn;

        // Mensagem padrão caso não tenha template
        let message = `Olá *${guestName.split(' ')[0]}*! Sua reserva foi iniciada. Código de acesso: *${token}*. Confirme seus dados aqui: ${dynamicLink}`;

        if (whatsappTemplate) {
            message = whatsappTemplate;
            
            // Substituições de Link
            message = message.replace(/{preCheckInLink}/gi, dynamicLink);
            message = message.replace(/{portalLink}/gi, dynamicLink);
            message = message.replace('https://portal.fazendadorosa.com.br/pre-check-in', dynamicLink); 

            // Variáveis básicas
            message = message.replace(/{guestName}/gi, guestName.split(' ')[0]);
            message = message.replace(/{token}/gi, token);
            
            // Tratamento inteligente da Cabana (Remove "na {cabinName}" se não houver cabana)
            if (!cabinName) {
                 message = message.replace(/na *{cabinName}/gi, ""); 
                 message = message.replace(/{cabinName}/gi, "");
            } else {
                 message = message.replace(/{cabinName}/gi, cabinName);
            }
            
            // Garante que o link esteja presente
            if (!message.includes(dynamicLink) && !message.includes(token)) {
                message += `\n\nLink: ${dynamicLink}`;
            }
        }

        // 4. Envia
        console.log(`[Resend] Reenviando mensagem original para ${phoneNumber}`);
        const result = await sendWhatsAppMessage(phoneNumber, message);

        if (result.success) {
            revalidatePath('/admin/stays');
            return { success: true, message: "Mensagem original reenviada com sucesso!" };
        } else {
            return { success: false, message: `Erro no WhatsApp: ${result.error}` };
        }

    } catch (error: any) {
        console.error("Erro ao reenviar:", error);
        return { success: false, message: error.message };
    }
}