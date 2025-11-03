"use server";

import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// Tipos de status que o admin pode definir
type RequestStatus = 'in_progress' | 'completed';

// Schema para validar os dados que o admin envia
const manageRequestSchema = z.object({
  requestId: z.string().min(1),
  adminEmail: z.string().min(1, "O e-mail do admin é obrigatório."),
  action: z.enum(['update_status', 'delete']),
  newStatus: z.enum(['in_progress', 'completed']).optional(),
});

export type ManageRequestData = z.infer<typeof manageRequestSchema>;

// Função auxiliar para traduzir o status para o log
const translateStatus = (status: RequestStatus) => {
    if (status === 'in_progress') return 'Em Andamento';
    if (status === 'completed') return 'Concluída';
    return status;
}

export async function manageRequest(data: ManageRequestData) {
  try {
    // 1. Validar os dados de entrada
    const validatedData = manageRequestSchema.parse(data);

    const { requestId, adminEmail, action, newStatus } = validatedData;
    const requestRef = adminDb.collection('requests').doc(requestId);
    const adminActor = { type: 'admin' as const, identifier: adminEmail };

    // 2. Executar Transação Atômica
    await adminDb.runTransaction(async (transaction) => {
      // 2a. Obter o documento da solicitação
      const requestDoc = await transaction.get(requestRef);
      if (!requestDoc.exists) {
        throw new Error("Solicitação não encontrada.");
      }
      const requestData = requestDoc.data();

      // ++ INÍCIO DA CORREÇÃO (TS Error 18048) ++
      // Adicionamos esta verificação para garantir ao TypeScript que 'requestData' não é undefined.
      if (!requestData) {
        throw new Error("Não foi possível ler os dados da solicitação.");
      }
      // ++ FIM DA CORREÇÃO ++
      
      // 2b. Preparar os detalhes do log (Agora 'requestData' é seguro para usar)
      const itemDescription = requestData.details?.itemName 
        ? `${requestData.details.quantity || 1}x ${requestData.details.itemName}` 
        : (requestData.type === 'cleaning' ? 'Limpeza' : 'Manutenção');

      const logRef = adminDb.collection('activity_logs').doc();
      let logType = 'request_updated'; // Padrão
      let logDetails = '';

      // 3. Executar a Ação do Admin
      
      // Ação: ATUALIZAR STATUS
      if (action === 'update_status') {
        if (!newStatus) {
            throw new Error("O 'newStatus' é obrigatório para a ação 'update_status'.");
        }

        // 3a. Atualiza a solicitação
        transaction.update(requestRef, {
          status: newStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 3b. Cria o log correspondente
        const translated = translateStatus(newStatus);
        logType = newStatus === 'in_progress' ? 'request_in_progress' : 'request_completed';
        logDetails = `Admin (${adminEmail}) moveu a solicitação (${itemDescription}) de ${requestData.guestName} para "${translated}"`;
        
        transaction.set(logRef, {
            actor: adminActor,
            type: logType,
            details: logDetails,
            link: '/admin/solicitacoes',
            timestamp: FieldValue.serverTimestamp()
        });
      } 
      
      // Ação: EXCLUIR
      else if (action === 'delete') {
        // 3a. Exclui a solicitação
        transaction.delete(requestRef);

        // 3b. Cria o log de exclusão
        logType = 'request_deleted';
        logDetails = `Admin (${adminEmail}) excluiu a solicitação (${itemDescription}) de ${requestData.guestName}.`;
        
        transaction.set(logRef, {
            actor: adminActor,
            type: logType,
            details: logDetails,
            link: '/admin/solicitVmações',
            timestamp: FieldValue.serverTimestamp()
        });
      }
    });

    // 4. Revalidar o cache para o admin ver a mudança
    revalidatePath('/admin/solicitacoes');
    revalidatePath('/admin/dashboard'); // Revalida o dashboard para o log aparecer
    
    return { success: true, message: "Ação executada com sucesso!" };

  } catch (error) {
    console.error("Erro ao gerenciar solicitação (Server Action):", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Dados inválidos." };
    }

    let errorMessage = "Ocorreu um erro ao processar sua ação.";
    if (error instanceof Error) {
        errorMessage = `Ocorreu um erro: ${error.message}`;
    }
  	 return { success: false, message: errorMessage };
  }
}