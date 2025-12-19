'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export async function completeFastStayAction(token: string, formData: any) {
    try {
        console.log("Completando Fast Stay...", token);

        // 1. Buscar a Estadia Principal pelo Token
        const stayQuery = await adminDb.collection('stays')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (stayQuery.empty) {
            return { success: false, message: "Reserva não encontrada ou link expirado." };
        }

        const mainStayDoc = stayQuery.docs[0];
        const mainStayData = mainStayDoc.data();
        const mainStayId = mainStayDoc.id;
        const batch = adminDb.batch();

        // 2. Atualizar ou Criar Hóspede Principal (Titular Financeiro)
        const guestId = formData.leadGuestDocument.replace(/\D/g, ''); 
        if (guestId.length >= 11) {
            const guestRef = adminDb.collection('guests').doc(guestId);
            const guestPayload = {
                name: formData.leadGuestName,
                email: formData.leadGuestEmail,
                phone: formData.leadGuestPhone,
                document: formData.leadGuestDocument, // Garante que o documento está salvo
                isForeigner: formData.isForeigner,
                country: formData.country,
                address: formData.address, // Salva endereço para a próxima
                vehiclePlate: formData.vehiclePlate,
                updatedAt: Timestamp.now(),
                lastStay: Timestamp.now()
            };
            batch.set(guestRef, guestPayload, { merge: true });
        }

        // 3. LÓGICA DE DISTRIBUIÇÃO (Grupo vs Individual)
        const isGroup = formData.cabinAssignments && formData.cabinAssignments.length > 0;

        if (isGroup) {
            console.log(`Processando check-in de GRUPO (${formData.cabinAssignments.length} cabanas)...`);
            
            // Itera sobre as configurações de cada cabana vindas do frontend
            for (const assignment of formData.cabinAssignments) {
                const targetStayId = assignment.stayId;
                if (!targetStayId) continue;

                const targetStayRef = adminDb.collection('stays').doc(targetStayId);
                
                // Dados específicos desta unidade
                const updateData: any = {
                    status: 'pending_validation',
                    updatedAt: Timestamp.now(),
                    // O responsável desta cabana (pode ser diferente do titular)
                    guestName: assignment.responsibleName,
                    guestPhone: assignment.responsiblePhone,
                    // Lista de hóspedes desta cabana
                    companions: assignment.guests || [],
                };

                // Se for a cabana principal, vinculamos os dados financeiros/titular também
                if (assignment.isMain || targetStayId === mainStayId) {
                    updateData.guestId = guestId; // Vincula ao perfil mestre
                    updateData.email = formData.leadGuestEmail;
                    updateData.address = formData.address;
                    updateData.vehiclePlate = formData.vehiclePlate;
                    updateData.pets = formData.pets || []; 
                }

                batch.update(targetStayRef, updateData);
            }

        } else {
            // LÓGICA INDIVIDUAL (Padrão)
            batch.update(mainStayDoc.ref, {
                guestId: guestId,
                guestName: formData.leadGuestName,
                guestPhone: formData.leadGuestPhone,
                email: formData.leadGuestEmail,
                address: formData.address,
                vehiclePlate: formData.vehiclePlate || null,
                companions: formData.companions || [],
                pets: formData.pets || [],
                status: 'pending_validation',
                updatedAt: Timestamp.now()
            });
        }

        // 4. Criar o Pré-Check-in (Registro/Dossiê Unificado)
        const preCheckInRef = adminDb.collection('preCheckIns').doc();
        const preCheckInData = {
            ...formData, 
            stayId: mainStayId, 
            cabinId: mainStayData.cabinId,
            status: 'pendente', // Aparece na aba de validação do Admin
            createdAt: Timestamp.now(),
            source: 'fast_stay_completed',
            cabinAssignments: isGroup ? formData.cabinAssignments : null 
        };
        batch.set(preCheckInRef, preCheckInData);

        // 5. Log de Atividade
        const logRef = adminDb.collection('activity_logs').doc();
        batch.set(logRef, {
            type: 'checkin_submitted',
            actor: { type: 'guest', identifier: formData.leadGuestName },
            details: isGroup 
                ? `Pré-check-in de GRUPO enviado para ${formData.cabinAssignments.length} cabanas.`
                : `Pré-check-in enviado para Cabana ${mainStayData.cabinName}.`,
            timestamp: Timestamp.now()
        });

        await batch.commit();
        revalidatePath('/admin/stays');

        return { success: true };

    } catch (error: any) {
        console.error("Erro ao completar Fast Stay:", error);
        return { success: false, message: error.message };
    }
}