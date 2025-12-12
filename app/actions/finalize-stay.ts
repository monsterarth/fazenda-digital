'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Stay, Property, PreCheckIn } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';

export async function finalizeStayAction(stayId: string, adminEmail: string) {
    try {
        console.log(`[Finalize] Iniciando finalização da estadia: ${stayId}`);

        // 1. Buscar dados da Estadia
        const stayRef = adminDb.collection('stays').doc(stayId);
        const staySnap = await stayRef.get();

        if (!staySnap.exists) {
            throw new Error("Estadia não encontrada.");
        }

        const stayData = staySnap.data() as Stay;

        // CORREÇÃO 1: Usar o status correto 'checked_out' definido no seu tipo
        if (stayData.status === 'checked_out') {
            return { success: false, message: "Esta estadia já foi finalizada anteriormente." };
        }

        // 2. Recuperar o telefone via Pré-Check-in (Pois Stay não tem guestPhone)
        let guestPhone: string | undefined = undefined;

        if (stayData.preCheckInId) {
            console.log(`[Finalize] Buscando telefone no Pré-Check-in (${stayData.preCheckInId})...`);
            const preCheckInSnap = await adminDb.collection('preCheckIns').doc(stayData.preCheckInId).get();
            
            if (preCheckInSnap.exists) {
                const preCheckInData = preCheckInSnap.data() as PreCheckIn;
                // Verificação de segurança caso leadGuestPhone seja null/undefined
                if (preCheckInData.leadGuestPhone) {
                    guestPhone = preCheckInData.leadGuestPhone;
                    console.log(`[Finalize] Telefone recuperado: ${guestPhone}`);
                }
            }
        }

        // 3. Buscar Configurações da Propriedade
        const propertySnap = await adminDb.collection('properties').doc('default').get();
        const propertyData = propertySnap.exists ? (propertySnap.data() as Property) : null;

        // 4. Atualizar Status no Banco de Dados
        const batch = adminDb.batch();

        batch.update(stayRef, {
            status: 'checked_out', // Status corrigido
            // Adicionamos como 'any' caso o tipo Stay não tenha esse campo explicitamente, mas queremos salvar no banco
            actualCheckOutDate: Timestamp.now(), 
            updatedAt: Timestamp.now()
        });

        const logRef = adminDb.collection('activity_logs').doc();
        batch.set(logRef, {
            timestamp: Timestamp.now(),
            type: 'stay_completed',
            actor: { type: 'admin', identifier: adminEmail },
            details: `Estadia de ${stayData.guestName} finalizada.`,
            stayId: stayId,
            link: '/admin/stays'
        });

        await batch.commit();
        console.log(`[Finalize] Banco atualizado com sucesso.`);

        // 5. Envio do WhatsApp (Pesquisa de Satisfação)
        let whatsappResult = "não configurado";
        
        const hasPhone = !!guestPhone;
        const hasTemplate = !!propertyData?.messages?.whatsappFeedbackRequest;
        const hasSurveyId = !!propertyData?.defaultSurveyId;

        if (hasPhone && hasTemplate && hasSurveyId) {
            try {
                const feedbackLink = `https://portal.fazendadorosa.com.br/s/${propertyData!.defaultSurveyId}?token=${stayData.token}`;
                const firstName = stayData.guestName.split(' ')[0];
                
                const replacements: { [key: string]: string } = {
                    '{guestName}': firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase(),
                    '{propertyName}': propertyData!.name || 'Fazenda',
                    '{cabinName}': stayData.cabinName,
                    '{feedbackLink}': feedbackLink,
                    '{token}': stayData.token
                };

                let messageBody = propertyData!.messages.whatsappFeedbackRequest;

                Object.entries(replacements).forEach(([key, value]) => {
                    messageBody = messageBody.replace(new RegExp(key, 'g'), value);
                });

                console.log(`[Finalize] Enviando pesquisa para ${guestPhone}`);
                
                const result = await sendWhatsAppMessage(guestPhone!, messageBody);
                
                whatsappResult = result.success ? "enviado" : `falha (${result.error})`;

            } catch (error) {
                console.error("[Finalize] Erro ao preparar WhatsApp:", error);
                whatsappResult = "erro técnico";
            }
        } else {
            const missing = [];
            if (!hasPhone) missing.push("Telefone (não achou no PreCheckIn)");
            if (!hasTemplate) missing.push("Template (whatsappFeedbackRequest)");
            if (!hasSurveyId) missing.push("ID da Pesquisa (defaultSurveyId)");
            
            console.log(`[Finalize] WhatsApp ignorado. Faltando: ${missing.join(', ')}`);
        }

        revalidatePath('/admin/stays');
        revalidatePath('/admin/hospedes');

        return { 
            success: true, 
            message: `Estadia finalizada! Pesquisa: ${whatsappResult}.` 
        };

    } catch (error: any) {
        console.error("ERRO ao finalizar estadia:", error);
        return { success: false, message: error.message || "Erro desconhecido." };
    }
}