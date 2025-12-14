'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export async function completeFastStayAction(token: string, formData: any) {
    try {
        console.log("Completando Fast Stay (Enviando para Validação)...", token);

        // 1. Buscar a Estadia pelo Token
        const stayQuery = await adminDb.collection('stays')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (stayQuery.empty) {
            return { success: false, message: "Reserva não encontrada ou link expirado." };
        }

        const stayDoc = stayQuery.docs[0];
        const stayData = stayDoc.data();
        const stayId = stayDoc.id;

        // 2. Atualizar ou Criar Hóspede (Guest Profile)
        const guestId = formData.leadGuestDocument.replace(/\D/g, ''); // CPF limpo
        const guestPayload = {
            name: formData.leadGuestName,
            email: formData.leadGuestEmail,
            phone: formData.leadGuestPhone,
            document: formData.leadGuestDocument,
            isForeigner: formData.isForeigner,
            country: formData.country,
            address: formData.address,
            updatedAt: Timestamp.now(),
            lastStay: Timestamp.now()
        };
        await adminDb.collection('guests').doc(guestId).set(guestPayload, { merge: true });

        // 3. CRIAR O PRÉ-CHECK-IN (Para aparecer na aba "Validação Pendente")
        // Mapeamos os dados do formulário para o formato da coleção preCheckIns
        const preCheckInData = {
            ...formData, // Pega leadGuestName, address, pets, etc.
            
            // Campos de vínculo importantes
            stayId: stayId, // VINCULA à estadia existente
            cabinId: stayData.cabinId, // Auxilia na visualização
            
            status: 'pendente', // Isso faz aparecer na lista de validação
            createdAt: Timestamp.now(),
            source: 'fast_stay_completed'
        };

        await adminDb.collection('preCheckIns').add(preCheckInData);

        // 4. Atualizar a Estadia (SEM ATIVAR)
        // Mudamos o status para 'pending_validation'. 
        // Isso remove da aba "Aguardando Hóspede" e sinaliza que o processo avançou.
        
        await stayDoc.ref.update({
            guestId: guestId, 
            
            // Salvamos os dados na estadia também para garantir redundância
            guestName: formData.leadGuestName,
            guestPhone: formData.leadGuestPhone,
            email: formData.leadGuestEmail,
            address: formData.address,
            vehiclePlate: formData.vehiclePlate || null,
            companions: formData.companions || [],
            pets: formData.pets || [],
            
            status: 'pending_validation', // <--- MUDANÇA AQUI: Não é 'active' ainda!
            updatedAt: Timestamp.now()
        });

        // 5. Log
        await adminDb.collection('activity_logs').add({
            type: 'checkin_submitted',
            actor: { type: 'guest', identifier: formData.leadGuestName },
            details: `Hóspede completou o cadastro Fast Stay. Aguardando validação para Cabana ${stayData.cabinName}.`,
            timestamp: Timestamp.now()
        });

        revalidatePath('/admin/stays');

        return { success: true };

    } catch (error: any) {
        console.error("Erro ao completar Fast Stay:", error);
        return { success: false, message: error.message };
    }
}