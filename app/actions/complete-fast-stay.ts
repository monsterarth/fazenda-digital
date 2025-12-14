'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export async function completeFastStayAction(token: string, formData: any) {
    try {
        console.log("Completando Fast Stay para token:", token);

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

        // 2. Preparar dados do Hóspede (Guest)
        const guestId = formData.leadGuestDocument.replace(/\D/g, ''); // CPF limpo
        
        const guestPayload = {
            name: formData.leadGuestName,
            email: formData.leadGuestEmail,
            phone: formData.leadGuestPhone,
            document: formData.leadGuestDocument, // CPF formatado ou passaporte
            isForeigner: formData.isForeigner,
            country: formData.country,
            address: formData.address, // Objeto completo de endereço
            updatedAt: Timestamp.now(),
            lastStay: Timestamp.now()
        };

        // Salvar/Atualizar Hóspede na coleção 'guests'
        await adminDb.collection('guests').doc(guestId).set(guestPayload, { merge: true });

        // 3. Atualizar a Estadia (Stay)
        // Mudamos o status para 'active' se for hoje, ou mantemos 'confirmed' se for futuro.
        // Assumindo que o pré-check-in confirma os dados:
        
        await stayDoc.ref.update({
            guestId: guestId, // Vincula o CPF oficial
            guestName: formData.leadGuestName,
            guestPhone: formData.leadGuestPhone,
            
            // Dados extras do formulário
            email: formData.leadGuestEmail,
            address: formData.address,
            estimatedArrivalTime: formData.estimatedArrivalTime,
            vehiclePlate: formData.vehiclePlate || null,
            
            companions: formData.companions || [],
            pets: formData.pets || [],
            
            // Atualiza status e limpa flag de pendência
            status: 'active', // Ou 'confirmed' dependendo da sua lógica de negócio
            preCheckInCompletedAt: Timestamp.now(),
            
            updatedAt: Timestamp.now()
        });

        // 4. Log de Atividade
        await adminDb.collection('activity_logs').add({
            type: 'checkin_completed',
            actor: { type: 'guest', identifier: formData.leadGuestName },
            details: `Pré-check-in completado via Fast Link para Cabana ${stayData.cabinName}.`,
            timestamp: Timestamp.now()
        });

        revalidatePath('/admin/stays');

        return { success: true };

    } catch (error: any) {
        console.error("Erro ao completar Fast Stay:", error);
        return { success: false, message: error.message };
    }
}