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
    itemName: z.string().optional(),
    quantity: z.number().optional(),
    description: z.string().optional(),
    itemPrice: z.number().optional(), // Incluindo o preço no momento da solicitação
    itemType: z.enum(['loan', 'consumable']).optional(),
  }),
});

export type CreateRequestData = z.infer<typeof requestSchema>;

export async function createRequest(data: CreateRequestData) {
  try {
    const validatedData = requestSchema.parse(data);

    const newRequest = {
      ...validatedData,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('requests').add(newRequest);

    // Revalida o cache da página de solicitações do admin para que a nova solicitação apareça em tempo real
    revalidatePath('/admin/solicitacoes');
    
    return { success: true, message: "Sua solicitação foi enviada com sucesso!" };

  } catch (error) {
    console.error("Erro ao criar solicitação:", error);
    // Em caso de erro de validação ou outro, retorna uma mensagem genérica
    if (error instanceof z.ZodError) {
      return { success: false, message: "Dados inválidos." };
    }
    return { success: false, message: "Ocorreu um erro ao enviar sua solicitação. Tente novamente." };
  }
}