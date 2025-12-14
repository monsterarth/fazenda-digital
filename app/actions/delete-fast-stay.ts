'use server'

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

export async function deleteFastStayAction(stayId: string) {
    try {
        console.log(`[DeleteFastStay] Excluindo estadia ${stayId}...`);
        
        // Exclui o documento da coleção stays
        await adminDb.collection('stays').doc(stayId).delete();

        // (Opcional) Log de atividade
        // await adminDb.collection('activity_logs').add({ ... })

        revalidatePath('/admin/stays');
        return { success: true, message: "Estadia removida com sucesso." };

    } catch (error: any) {
        console.error("Erro ao excluir estadia:", error);
        return { success: false, message: "Erro ao excluir: " + error.message };
    }
}