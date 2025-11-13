// ARQUIVO: app/actions/manage-weddings.ts
// (Note: Corrigido para remover o Clerk e usar o padrão de argumento 'adminEmail')

'use server';

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
// --- 1. REMOVIDO ---
// import { auth } from '@clerk/nextjs/server'; // (Ou sua solução de autenticação admin)
// --- FIM DA REMOÇÃO ---

type ActionResponse = {
  success: true;
  message: string;
} | {
  success: false;
  message: string;
};

// Ação para atualizar a foto do casal no Firestore
export async function updateWeddingPhoto(
  weddingId: string,
  photoUrl: string,
  // --- 2. ADICIONADO ---
  adminEmail: string, // <-- Recebemos o email do cliente
): Promise<ActionResponse> {
  // 1. Autenticação (Verifica se o email foi passado)
  // --- 3. MODIFICADO ---
  if (!adminEmail) {
    return { success: false, message: 'Não autorizado.' };
  }
  // --- FIM DA MODIFICAÇÃO ---

  // 2. Validação
  if (!weddingId || !photoUrl) {
    return {
      success: false,
      message: 'ID do casamento ou URL da foto estão faltando.',
    };
  }

  try {
    // 3. Atualizar o Documento
    const weddingRef = adminDb.collection('weddings').doc(weddingId);
    await weddingRef.update({
      couplePhotoUrl: photoUrl,
      updatedAt: AdminTimestamp.now(),
    });

    // 4. Revalidar o Path
    revalidatePath(`/admin/weddings/${weddingId}`);

    // (Opcional: Adicionar log de atividade, se houver um helper global)
    // await addAdminActivityLog({ ... });

    return { success: true, message: 'Foto atualizada.' };
  } catch (error: any) {
    console.error('Erro ao atualizar foto do casamento:', error);
    return {
      success: false,
      message: 'Erro do servidor ao salvar a foto.',
    };
  }
}