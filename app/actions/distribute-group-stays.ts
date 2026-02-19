// app/actions/distribute-group-stays.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { firestore } from 'firebase-admin'; // ++ IMPORTANTE: Importar o módulo firestore ++
import { CabinAssignment } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Função responsável por pegar as estadias secundárias de um grupo
 * e transferi-las para os nomes dos novos responsáveis indicados no Pré-Check-In.
 */
export async function distributeGroupStays(preCheckInId: string, assignments: CabinAssignment[]) {
    try {
        const batch = adminDb.batch();
        const preCheckInRef = adminDb.doc(`preCheckIns/${preCheckInId}`);
        const preCheckInSnap = await preCheckInRef.get();
        
        if (!preCheckInSnap.exists) throw new Error("Pré-check-in não encontrado.");
        
        const preCheckInData = preCheckInSnap.data();
        const relatedStayIds: string[] = preCheckInData?.relatedStayIds || [];

        // Atualizamos o PreCheckIn com o mapa definitivo
        batch.update(preCheckInRef, { cabinAssignments: assignments });

        // Otimização: Buscamos todas as estadias relacionadas de uma vez
        const staysRefs = relatedStayIds.map(id => adminDb.doc(`stays/${id}`));
        const staysSnaps = await adminDb.getAll(...staysRefs);

        // Iterar sobre as designações feitas pelo usuário
        for (const assignment of assignments) {
            // Encontrar a estadia correspondente à cabana designada
            const targetStaySnap = staysSnaps.find(s => s.data()?.cabinId === assignment.cabinId);

            if (targetStaySnap) {
                const stayData = targetStaySnap.data();
                
                // Se o nome do responsável mudou em relação ao titular original
                if (stayData?.guestName !== assignment.responsibleName) {
                    
                    // 1. Atualizar a Estadia com o novo "Dono"
                    batch.update(targetStaySnap.ref, {
                        guestName: assignment.responsibleName,
                        numberOfGuests: assignment.guestsCount,
                        // Nota: Futuramente podemos salvar o telefone diretamente na estadia se necessário
                    });

                    // 2. Criar/Atualizar o perfil deste Hóspede Secundário
                    // Usamos o telefone (apenas números) como ID se não tiver CPF
                    const guestId = assignment.responsiblePhone.replace(/\D/g, '');
                    
                    if (guestId.length > 8) { // Validação mínima de telefone
                        const newGuestRef = adminDb.collection('guests').doc(guestId);
                        
                        // Usamos set com merge para criar ou atualizar sem perder dados
                        batch.set(newGuestRef, {
                            name: assignment.responsibleName,
                            phone: assignment.responsiblePhone,
                            // ++ CORREÇÃO AQUI: Usando firestore.FieldValue ++
                            stayHistory: firestore.FieldValue.arrayUnion(targetStaySnap.id),
                            updatedAt: Timestamp.now(),
                            origin: 'group_distribution' 
                        }, { merge: true });
                    }

                    // 3. Logar a transferência
                    const logRef = adminDb.collection('activity_logs').doc();
                    batch.set(logRef, {
                        type: 'stay_updated_group_split',
                        actor: { type: 'system', identifier: 'pre-checkin' },
                        details: `Cabana ${stayData?.cabinName} transferida de ${preCheckInData?.leadGuestName} para ${assignment.responsibleName}.`,
                        stayId: targetStaySnap.id,
                        timestamp: Timestamp.now()
                    });
                }
            }
        }

        await batch.commit();
        
        revalidatePath('/admin/stays');
        revalidatePath('/admin/hospedes');
        
        return { success: true, message: "Estadias distribuídas com sucesso." };

    } catch (error: any) {
        console.error("Erro ao distribuir estadias:", error);
        return { success: false, message: "Erro ao processar distribuição de hóspedes." };
    }
}