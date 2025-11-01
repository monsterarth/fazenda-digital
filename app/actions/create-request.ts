"use server";

import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// Schema para validar os dados da solicitação
const requestSchema = z.object({
  stayId: z.string().min(1),
  guestName: z.string().min(1),
  cabinName: z.string().min(1),
  type: z.enum(['item', 'cleaning', 'maintenance']),
  details: z.object({
  	// Detalhes do item
    itemName: z.string().optional(),
    quantity: z.number().optional(),
    itemPrice: z.number().optional(), 
    itemType: z.enum(['loan', 'consumable']).optional(),
	// Detalhes da manutenção
	description: z.string().optional(),
  }),
});

export type CreateRequestData = z.infer<typeof requestSchema>;

export async function createRequest(data: CreateRequestData) {
  try {
	// 1. Validar os dados de entrada
    const validatedData = requestSchema.parse(data);

	// 2. Preparar dados do log
	const guestActor = { type: 'guest' as const, identifier: validatedData.guestName };
	let details = '';

	if (validatedData.type === 'item') {
		details = `Hóspede ${validatedData.guestName} (${validatedData.cabinName}) solicitou ${validatedData.details.quantity || 1}x ${validatedData.details.itemName}`;
	} else if (validatedData.type === 'cleaning') {
		details = `Hóspede ${validatedData.guestName} (${validatedData.cabinName}) solicitou Limpeza de Quarto`;
	} else if (validatedData.type === 'maintenance') {
		details = `Hóspede ${validatedData.guestName} (${validatedData.cabinName}) relatou: ${validatedData.details.description}`;
	}

	// 3. Executar Transação Atômica (para criar a solicitação E o log)
	await adminDb.runTransaction(async (transaction) => {
		// 3a. Criar a nova solicitação
		const newRequest = {
	      ...validatedData,
	      status: 'pending',
	      createdAt: FieldValue.serverTimestamp(),
	      updatedAt: FieldValue.serverTimestamp(),
	    };
		const requestRef = adminDb.collection('requests').doc();
		transaction.set(requestRef, newRequest);

		// 3b. Criar o log de atividade
		const logRef = adminDb.collection('activity_logs').doc();
		transaction.set(logRef, {
			actor: guestActor,
			type: 'request_created', // O tipo que seu dashboard agora reconhece
			details: details,
			link: '/admin/solicitacoes', // O link correto
			timestamp: FieldValue.serverTimestamp()
		});
	});

    // 4. Revalidar o cache do admin
    revalidatePath('/admin/solicitacoes');
    
    return { success: true, message: "Sua solicitação foi enviada com sucesso!" };

  } catch (error) { // 'error' é 'unknown' por padrão
    console.error("Erro ao criar solicitação (Server Action):", error);
    
    if (error instanceof z.ZodError) {
      return { success: false, message: "Dados inválidos." };
    }

    // ++ INÍCIO DA CORREÇÃO (TS Error 18046) ++
    // Verificamos se 'error' é uma instância de 'Error' antes de acessar 'error.message'
    let errorMessage = "Ocorreu um erro ao enviar sua solicitação. Tente novamente.";
    if (error instanceof Error) {
        errorMessage = `Ocorreu um erro: ${error.message}`;
    }
    return { success: false, message: errorMessage };
    // ++ FIM DA CORREÇÃO ++
  }
}