'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { FullStayFormValues } from '@/lib/schemas/stay-schema'; // Reaproveitando tipos

export async function advanceCounterCheckinAction(stayId: string, data: any, adminEmail: string) {
    try {
        console.log(`[Admin] Avançando Check-in de Balcão para Estadia: ${stayId}`);

        const stayRef = adminDb.collection('stays').doc(stayId);
        const staySnap = await stayRef.get();

        if (!staySnap.exists) throw new Error("Estadia não encontrada.");
        
        const currentStayData = staySnap.data();
        const batch = adminDb.batch();

        // 1. Criar/Atualizar Hóspede (Guest Profile)
        // Se o admin preencheu o CPF no modal, usamos ele.
        const cleanDoc = data.leadGuestDocument?.replace(/\D/g, '') || '';
        
        if (cleanDoc.length >= 11) {
            const guestRef = adminDb.collection('guests').doc(cleanDoc);
            batch.set(guestRef, {
                name: data.leadGuestName,
                document: data.leadGuestDocument,
                email: data.leadGuestEmail,
                phone: data.leadGuestPhone,
                address: data.address,
                isForeigner: data.isForeigner || false,
                country: data.country || 'Brasil',
                vehiclePlate: data.vehiclePlate,
                updatedAt: Timestamp.now(),
                lastStay: Timestamp.now()
            }, { merge: true });
        }

        // 2. Criar o Documento de Pré-Check-in (Dossiê)
        // Isso é necessário para que a estadia apareça na aba "Validação"
        const preCheckInRef = adminDb.collection('preCheckIns').doc();
        const preCheckInData = {
            leadGuestName: data.leadGuestName,
            leadGuestDocument: data.leadGuestDocument,
            leadGuestEmail: data.leadGuestEmail,
            leadGuestPhone: data.leadGuestPhone,
            address: data.address,
            vehiclePlate: data.vehiclePlate,
            estimatedArrivalTime: 'Balcão', // Indica que foi presencial
            isForeigner: data.isForeigner || false,
            country: data.country,
            
            companions: data.companions || [],
            pets: data.pets || [],
            
            stayId: stayId,
            cabinId: currentStayData?.cabinId,
            status: 'pendente', // Vai para a lista de "Validação Pendente"
            source: 'counter_checkin', // Identificador de origem
            createdAt: Timestamp.now(),
            
            // Se for grupo, mantém a consistência (opcional se for edição única)
            cabinAssignments: currentStayData?.isMainBooker ? currentStayData?.guestCount : null
        };
        
        batch.set(preCheckInRef, preCheckInData);

        // 3. Atualizar a Estadia
        // Mudamos o status para permitir a validação final (impressão de ficha, etc)
        // Ou poderíamos ir direto para 'active', mas o fluxo pede validação.
        batch.update(stayRef, {
            status: 'pending_validation', // Avança o status
            
            guestName: data.leadGuestName,
            guestPhone: data.leadGuestPhone,
            guestId: cleanDoc || currentStayData?.guestId,
            email: data.leadGuestEmail,
            address: data.address,
            vehiclePlate: data.vehiclePlate,
            
            companions: data.companions || [],
            pets: data.pets || [],
            
            preCheckInId: preCheckInRef.id,
            updatedAt: Timestamp.now()
        });

        // 4. Log
        const logRef = adminDb.collection('activity_logs').doc();
        batch.set(logRef, {
            type: 'checkin_submitted',
            actor: { type: 'admin', identifier: adminEmail },
            details: `Check-in de Balcão realizado para ${data.leadGuestName} (Enviado para Validação).`,
            stayId: stayId,
            timestamp: Timestamp.now()
        });

        await batch.commit();
        revalidatePath('/admin/stays');

        return { success: true, message: "Dados salvos. Estadia enviada para validação." };

    } catch (error: any) {
        console.error("Erro no Check-in de Balcão:", error);
        return { success: false, message: error.message };
    }
}