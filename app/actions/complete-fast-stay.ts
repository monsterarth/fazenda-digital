// app/actions/complete-fast-stay.ts

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

        // 3. LÓGICA DE DISTRIBUIÇÃO E CRIAÇÃO DE CHECK-INS
        const isGroup = formData.cabinAssignments && formData.cabinAssignments.length > 0;

        if (isGroup) {
            console.log(`Processando check-in de GRUPO (${formData.cabinAssignments.length} cabanas)...`);
            
            // Itera sobre as configurações de cada cabana vindas do frontend
            for (const assignment of formData.cabinAssignments) {
                const targetStayId = assignment.stayId;
                if (!targetStayId) continue;

                const targetStayRef = adminDb.collection('stays').doc(targetStayId);
                
                // --- A: Atualiza a Estadia (Stay) ---
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

                // --- B: Cria um Pré-Check-in INDIVIDUAL para esta Cabana ---
                // CORREÇÃO: Em vez de criar um grande array sujo, geramos um documento limpo por cabana
                const preCheckInRef = adminDb.collection('preCheckIns').doc();
                const individualPreCheckIn = {
                    stayId: targetStayId,
                    cabinId: assignment.cabinId,
                    
                    // Dados do Responsável por esta cabana
                    leadGuestName: assignment.responsibleName || formData.leadGuestName,
                    leadGuestPhone: assignment.responsiblePhone || formData.leadGuestPhone,
                    
                    // O documento e e-mail geralmente ficam com o titular financeiro (cabana principal)
                    leadGuestDocument: (assignment.isMain || targetStayId === mainStayId) ? formData.leadGuestDocument : "",
                    leadGuestEmail: (assignment.isMain || targetStayId === mainStayId) ? formData.leadGuestEmail : "",
                    
                    // Acompanhantes específicos desta cabana
                    companions: assignment.guests || [],
                    
                    // Dados Comuns preenchidos no form
                    address: formData.address || {},
                    estimatedArrivalTime: formData.estimatedArrivalTime || "",
                    isForeigner: !!formData.isForeigner,
                    country: formData.country || 'Brasil',
                    knowsVehiclePlate: !!formData.knowsVehiclePlate,
                    vehiclePlate: formData.vehiclePlate || "",
                    policiesAccepted: formData.policiesAccepted || {},
                    pets: (assignment.isMain || targetStayId === mainStayId) ? (formData.pets || []) : [],
                    
                    // Metadados
                    source: 'fast_stay_completed',
                    status: 'pendente', // Status que o admin vai ler
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                };
                
                batch.set(preCheckInRef, individualPreCheckIn);
            }

            // Log de Atividade para o Grupo Inteiro
            const logRef = adminDb.collection('activity_logs').doc();
            batch.set(logRef, {
                type: 'checkin_submitted',
                actor: { type: 'guest', identifier: formData.leadGuestName },
                details: `Pré-check-in de GRUPO enviado para ${formData.cabinAssignments.length} cabanas.`,
                timestamp: Timestamp.now()
            });

        } else {
            // LÓGICA INDIVIDUAL (Padrão)
            
            // --- A: Atualiza a Estadia (Stay) ---
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

            // --- B: Cria o Pré-Check-in ---
            const preCheckInRef = adminDb.collection('preCheckIns').doc();
            const preCheckInData = {
                stayId: mainStayId, 
                cabinId: mainStayData.cabinId,
                leadGuestName: formData.leadGuestName,
                leadGuestDocument: formData.leadGuestDocument,
                leadGuestPhone: formData.leadGuestPhone,
                leadGuestEmail: formData.leadGuestEmail,
                isForeigner: !!formData.isForeigner,
                country: formData.country || 'Brasil',
                address: formData.address || {},
                estimatedArrivalTime: formData.estimatedArrivalTime || "",
                knowsVehiclePlate: !!formData.knowsVehiclePlate,
                vehiclePlate: formData.vehiclePlate || "",
                companions: formData.companions || [],
                pets: formData.pets || [],
                policiesAccepted: formData.policiesAccepted || {},
                status: 'pendente',
                source: 'fast_stay_completed',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            batch.set(preCheckInRef, preCheckInData);

            // Log de Atividade
            const logRef = adminDb.collection('activity_logs').doc();
            batch.set(logRef, {
                type: 'checkin_submitted',
                actor: { type: 'guest', identifier: formData.leadGuestName },
                details: `Pré-check-in enviado para Cabana ${mainStayData.cabinName || mainStayData.cabinId}.`,
                timestamp: Timestamp.now()
            });
        }

        await batch.commit();
        revalidatePath('/admin/stays');

        return { success: true };

    } catch (error: any) {
        console.error("Erro ao completar Fast Stay:", error);
        return { success: false, message: error.message };
    }
}