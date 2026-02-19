'use server'

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';

export async function rejectCheckinAction(preCheckInId: string, adminEmail: string) {
  try {
    const preCheckInRef = adminDb.collection('preCheckIns').doc(preCheckInId);
    const preCheckInSnap = await preCheckInRef.get();

    if (!preCheckInSnap.exists) {
      return { success: false, message: "Pré-check-in não encontrado." };
    }

    const preCheckInData = preCheckInSnap.data();
    const stayId = preCheckInData?.stayId;
    const batch = adminDb.batch();

    // 1. Arquivar o Pré-Check-in
    batch.update(preCheckInRef, {
      status: 'arquivado',
      rejectedAt: Timestamp.now(),
      rejectedBy: adminEmail
    });

    // 2. Se houver uma Estadia vinculada, podemos cancelá-la ou resetá-la
    // Neste caso, vamos cancelar para liberar o calendário
    if (stayId) {
        const stayRef = adminDb.collection('stays').doc(stayId);
        batch.update(stayRef, {
            status: 'canceled',
            updatedAt: Timestamp.now(),
            cancellationReason: 'Check-in recusado pelo admin'
        });
        
        // Se for grupo, cancela as outras também
        if (preCheckInData?.cabinAssignments?.length > 0) {
             const assignments = preCheckInData.cabinAssignments;
             for (const assignment of assignments) {
                 if (assignment.stayId && assignment.stayId !== stayId) {
                     const relatedStayRef = adminDb.collection('stays').doc(assignment.stayId);
                     batch.update(relatedStayRef, {
                        status: 'canceled',
                        updatedAt: Timestamp.now(),
                        cancellationReason: 'Check-in recusado pelo admin (Grupo)'
                    });
                 }
             }
        }
    }

    // 3. Log de Atividade
    const logRef = adminDb.collection('activity_logs').doc();
    batch.set(logRef, {
      type: 'checkin_rejected',
      actor: { type: 'admin', identifier: adminEmail },
      details: `Pré-check-in de ${preCheckInData?.leadGuestName} foi recusado.`,
      timestamp: Timestamp.now()
    });

    await batch.commit();

    revalidatePath('/admin/stays');
    revalidatePath('/admin/dashboard');

    return { success: true, message: "Check-in recusado e estadia cancelada." };

  } catch (error: any) {
    console.error("Erro ao recusar check-in:", error);
    return { success: false, message: "Erro ao processar recusa." };
  }
}