// app/actions/get-archived-tasks.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { MaintenanceTask } from "@/types/maintenance";
// ++ CORREÇÃO: Atualiza o caminho de importação ++
import { convertAdminTimestamps } from "@/lib/firestore-utils"; 

type ActionResponse = {
  success: true;
  data: MaintenanceTask[];
} | {
  success: false;
  message: string;
};

export async function getArchivedTasks(): Promise<ActionResponse> {
  try {
    const tasksRef = adminDb.collection("maintenance_tasks");
    
    const q = tasksRef
      .where("status", "==", "archived")
      .orderBy("createdAt", "desc"); 

    const snapshot = await q.get();

    if (snapshot.empty) {
      return { success: true, data: [] };
    }

    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const plainTasks = convertAdminTimestamps(tasks);

    return { success: true, data: plainTasks as MaintenanceTask[] };

  } catch (error: any) {
    console.error("Erro ao buscar tarefas arquivadas:", error);
    return { success: false, message: "Falha ao buscar tarefas arquivadas." };
  }
}