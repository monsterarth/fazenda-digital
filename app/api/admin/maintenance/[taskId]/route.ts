// app/api/admin/maintenance/[taskId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

// Schema para validação da atualização
const updateTaskSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  location: z.string().min(3, "A localização é obrigatória."),
  priority: z.enum(['low', 'medium', 'high']),
  weight: z.number().min(1, "Os pontos devem ser ao menos 1."),
});

/**
 * PUT: Atualizar uma tarefa de manutenção
 */
export async function PUT(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = params;
    if (!taskId) {
      return NextResponse.json({ message: "ID da tarefa é obrigatório." }, { status: 400 });
    }

    // TODO: Adicionar verificação de role (ex: 'super_admin' ou 'recepcao')
    
    const body = await req.json();
    const validation = updateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 });
    }

    const taskRef = adminDb.collection('maintenance_tasks').doc(taskId);
    await taskRef.update(validation.data);

    return NextResponse.json({ message: "Tarefa atualizada com sucesso!" });

  } catch (error: any) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json({ message: `Erro ao atualizar tarefa: ${error.message}` }, { status: 500 });
  }
}

/**
 * DELETE: Excluir uma tarefa de manutenção
 */
export async function DELETE(req: NextRequest, { params }: { params: { taskId: string } }) {
  try {
    const { taskId } = params;
    if (!taskId) {
      return NextResponse.json({ message: "ID da tarefa é obrigatório." }, { status: 400 });
    }
    
    // TODO: Adicionar verificação de role (ex: 'super_admin' ou 'recepcao')

    const taskRef = adminDb.collection('maintenance_tasks').doc(taskId);
    await taskRef.delete();

    return NextResponse.json({ message: "Tarefa excluída com sucesso!" });

  } catch (error: any) {
    console.error("Erro ao excluir tarefa:", error);
    return NextResponse.json({ message: `Erro ao excluir tarefa: ${error.message}` }, { status: 500 });
  }
}