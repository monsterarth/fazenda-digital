// app/actions/manage-maintenance-task.ts

"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp as AdminTimestamp, FieldPath, FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { MaintenanceTask, RecurrenceRule, TaskStatus } from "@/types/maintenance";
import { ActivityLog } from '@/types'; 
import { add, set } from "date-fns";
import { convertAdminTimestamps } from "@/lib/firestore-utils";

const TASKS_COLLECTION = "maintenance_tasks";

// Helper de Log no Servidor
async function addAdminActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
  try {
    await adminDb.collection("activity_logs").add({
      ...log,
      timestamp: AdminTimestamp.now(), 
    });
  } catch (error) {
    console.error("Falha ao registrar log de atividade:", error);
  }
}

// Esquema Zod
const taskSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  priority: z.enum(["low", "medium", "high"]),
  location: z.string().min(1, "A localização é obrigatória."),
  description: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
      interval: z.coerce.number().min(1),
      endDate: z.string(), 
    })
    .optional(), 
});

type ActionResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  message: string;
};

// --- AÇÃO: CRIAR TAREFA ---
export async function createMaintenanceTask(
  formData: z.infer<typeof taskSchema>,
  adminEmail: string
): Promise<ActionResponse<MaintenanceTask>> {
  
  const validation = taskSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, message: validation.error.errors[0].message };
  }

  try {
    const { title, recurrence, ...rest } = validation.data;
    const newTaskRef = adminDb.collection(TASKS_COLLECTION).doc();
    
    const newTaskData: any = {
      title,
      ...rest,
      status: "pending",
      createdAt: AdminTimestamp.now(), 
      createdBy: adminEmail,
      assignedTo: [],
      dependsOn: rest.dependsOn || [], 
    };

    if (recurrence) {
      newTaskData.recurrence = {
          ...recurrence,
          endDate: AdminTimestamp.fromDate(new Date(recurrence.endDate))
      };
    }

    await newTaskRef.set(newTaskData);
    const taskWithId = { ...newTaskData, id: newTaskRef.id };

    await addAdminActivityLog({
      type: "maintenance_task_created",
      actor: { type: "admin", identifier: adminEmail },
      details: `Tarefa de manutenção criada: ${title}`,
      link: "/admin/manutencao",
    });

    revalidatePath("/admin/manutencao");
    const plainTaskData = convertAdminTimestamps(taskWithId);
    return { success: true, data: plainTaskData as MaintenanceTask };

  } catch (error: any) {
    return { success: false, message: `Falha ao criar tarefa: ${error.message}` };
  }
}

// --- AÇÃO: ATUALIZAR TAREFA ---
export async function updateMaintenanceTask(
  taskId: string,
  formData: z.infer<typeof taskSchema>,
  adminEmail: string
): Promise<ActionResponse<string>> {
  
  const validation = taskSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, message: validation.error.errors[0].message };
  }

  try {
    const { title, recurrence, ...rest } = validation.data;
    const taskRef = adminDb.collection(TASKS_COLLECTION).doc(taskId);

    const dataToUpdate: any = {
      title,
      ...rest,
      dependsOn: rest.dependsOn || [],
    };

    if (recurrence) {
      dataToUpdate.recurrence = {
        ...recurrence,
        endDate: AdminTimestamp.fromDate(new Date(recurrence.endDate))
      };
    } else {
      dataToUpdate.recurrence = FieldValue.delete();
    }

    await taskRef.update(dataToUpdate);

    await addAdminActivityLog({
      type: "maintenance_task_status_changed", 
      actor: { type: "admin", identifier: adminEmail },
      details: `Tarefa '${title}' foi atualizada.`,
      link: "/admin/manutencao",
    });

    revalidatePath("/admin/manutencao");
    return { success: true, data: taskId };

  } catch (error: any) {
    return { success: false, message: `Falha ao atualizar tarefa: ${error.message}` };
  }
}

// --- AÇÃO: EXCLUIR TAREFA ---
export async function deleteMaintenanceTask(
  taskId: string,
  taskTitle: string,
  adminEmail: string
): Promise<ActionResponse<string>> {
  
  try {
    const taskRef = adminDb.collection(TASKS_COLLECTION).doc(taskId);
    await taskRef.delete();

    await addAdminActivityLog({
      type: 'maintenance_task_deleted',
      actor: { type: 'admin', identifier: adminEmail },
      details: `Tarefa '${taskTitle}' foi excluída.`,
      link: '/admin/manutencao'
    });

    revalidatePath("/admin/manutencao");
    return { success: true, data: taskId };

  } catch (error: any) {
    return { success: false, message: `Falha ao excluir tarefa: ${error.message}` };
  }
}


// --- AÇÃO: ATUALIZAR STATUS (DRAG-AND-DROP) ---
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  adminEmail: string
): Promise<ActionResponse<string>> {

  const taskRef = adminDb.collection(TASKS_COLLECTION).doc(taskId);
  const taskDoc = await taskRef.get();
  if (!taskDoc.exists) {
    return { success: false, message: "Tarefa não encontrada." };
  }
  const taskData = taskDoc.data() as MaintenanceTask; 

  // 1. VALIDAÇÃO DE DEPENDÊNCIA
  if (newStatus === "in_progress" && (taskData.dependsOn || []).length > 0) {
    const dependencies = await adminDb.collection(TASKS_COLLECTION)
      .where(FieldPath.documentId(), 'in', taskData.dependsOn)
      .get();
    const incompleteDeps = dependencies.docs.filter(doc => doc.data().status !== 'completed');
    if (incompleteDeps.length > 0) {
      return { 
        success: false, 
        message: `Esta tarefa depende de: ${incompleteDeps.map(d => d.data().title).join(', ')}` 
      };
    }
  }

  try {
    // 2. VALIDAÇÃO DE RECORRÊNCIA
    if (newStatus === "completed" && taskData.recurrence) {
      const taskDataWithAdminTimestamp = taskDoc.data() as MaintenanceTask & { createdAt: AdminTimestamp };
      
      const nextTask = await createNextRecurrentTask(
        taskDataWithAdminTimestamp, 
        adminEmail, 
        taskId 
      );
      
      await taskRef.update({
        status: "completed",
        nextTaskId: nextTask?.id || null, 
      });
    } else {
      await taskRef.update({ status: newStatus });
    }

    await addAdminActivityLog({
      type: "maintenance_task_status_changed",
      actor: { type: "admin", identifier: adminEmail },
      details: `Tarefa '${taskData.title}' movida para ${newStatus}`,
      link: "/admin/manutencao",
    });

    revalidatePath("/admin/manutencao");
    return { success: true, data: taskId };

  } catch (error: any) {
    return { success: false, message: `Falha ao mover tarefa: ${error.message}` };
  }
}

// --- AÇÃO: DELEGAR TAREFA ---
export async function delegateMaintenanceTask(
  taskId: string,
  assignedEmails: string[],
  adminEmail: string
): Promise<ActionResponse<string[]>> {
  
  const taskRef = adminDb.collection(TASKS_COLLECTION).doc(taskId);

  try {
    await taskRef.update({
      assignedTo: assignedEmails,
    });

    const taskDoc = await taskRef.get();
    const taskData = taskDoc.data();

    await addAdminActivityLog({
      type: "maintenance_task_assigned", 
      actor: { type: "admin", identifier: adminEmail },
      details: `Tarefa '${taskData?.title}' delegada para: ${assignedEmails.join(', ')}`,
      link: "/admin/manutencao",
    });
    
    revalidatePath("/admin/manutencao");
    return { success: true, data: assignedEmails };

  } catch (error: any) {
    return { success: false, message: `Falha ao delegar tarefa: ${error.message}` };
  }
}


// --- LÓGICA AUXILIAR: GERAR PRÓXIMA TAREFA ---
async function createNextRecurrentTask(
    parentTask: MaintenanceTask & { recurrence?: RecurrenceRule & { endDate?: AdminTimestamp } },
    adminEmail: string,
    parentTaskId: string 
): Promise<{ id: string } | null> {
    
    if (!parentTask.recurrence) return null;
    
    const { frequency, interval, endDate } = parentTask.recurrence;
    const now = new Date();
    
    let nextDate = new Date();
    if (frequency === 'daily') nextDate = add(now, { days: interval });
    if (frequency === 'weekly') nextDate = add(now, { weeks: interval });
    if (frequency === 'monthly') nextDate = add(now, { months: interval });
    if (frequency === 'yearly') nextDate = add(now, { years: interval });

    nextDate = set(nextDate, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });

    if (endDate && nextDate.getTime() > endDate.toDate().getTime()) {
      return null;
    }

    const newTaskRef = adminDb.collection(TASKS_COLLECTION).doc();
    
    const newTaskData: any = {
        ...parentTask,
        status: "pending",
        createdAt: AdminTimestamp.fromDate(nextDate), 
        createdBy: adminEmail,
        parentTaskId: parentTaskId, 
        nextTaskId: undefined,
        dependsOn: [], 
        assignedTo: parentTask.assignedTo || [], 
        description: "", 
    };
    
    delete (newTaskData as any).id; 
    delete (newTaskData as any).nextTaskId;

    await newTaskRef.set(newTaskData);
    return { id: newTaskRef.id };
}

// --- ++ NOVA AÇÃO: ARQUIVAR TAREFA ++ ---
export async function archiveMaintenanceTask(
  taskId: string,
  adminEmail: string
): Promise<ActionResponse<string>> {
  
  const taskRef = adminDb.collection(TASKS_COLLECTION).doc(taskId);

  try {
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      return { success: false, message: "Tarefa não encontrada." };
    }
    const taskData = taskDoc.data();
    
    // Altera o status para 'archived'
    await taskRef.update({
      status: "archived",
    });

    await addAdminActivityLog({
      type: "maintenance_task_archived", 
      actor: { type: "admin", identifier: adminEmail },
      details: `Tarefa '${taskData?.title}' foi arquivada.`,
      link: "/admin/manutencao/arquivo",
    });
    
    // Revalida ambas as páginas (Kanban e Arquivo)
    revalidatePath("/admin/manutencao");
    revalidatePath("/admin/manutencao/arquivo");
    
    return { success: true, data: taskId };

  } catch (error: any) {
    return { success: false, message: `Falha ao arquivar tarefa: ${error.message}` };
  }
}