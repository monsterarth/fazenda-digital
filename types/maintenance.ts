// types/maintenance.ts

import { Timestamp } from 'firebase/firestore';
// ++ INÍCIO DA ADIÇÃO ++
// Importa o tipo 'UserRole' do seu AuthContext
import { UserRole } from '@/context/AuthContext';
// ++ FIM DA ADIÇÃO ++

// Status unificado para o Kanban
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';

// Regra de recorrência
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Ex: a cada 2 (semanas, meses, etc.)
  endDate?: Timestamp; // Opcional: quando parar de repetir
}

// O modelo de dados principal para uma tarefa de manutenção
export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  
  // Localização (ex: "Piscina", "Cabana 5", "Geral")
  location: string; 
  
  createdAt: Timestamp;
  createdBy: string; // Email do admin/gestor que criou
  
  // --- Nossas Novas Features ---
  
  // 1. Delegação: Array de UIDs ou emails de funcionários
  assignedTo: string[]; 
  
  // 2. Dependências: Array de IDs de outras tarefas
  // Esta tarefa não pode começar até que todas estas estejam 'completed'.
  dependsOn: string[]; 
  
  // 3. Recorrência: Se preenchido, gera a próxima tarefa ao ser concluída
  recurrence?: RecurrenceRule; 
  
  // 4. Rastreamento: Link para a tarefa "mãe" ou "filha" na série
  parentTaskId?: string; // ID da tarefa que gerou esta
  nextTaskId?: string;   // ID da próxima tarefa na série (adicionado ao completar)
}

// Tipo para o formulário de criação (usa string para datas)
export type MaintenanceTaskFormValues = Omit<MaintenanceTask, 'id' | 'createdAt' | 'recurrence'> & {
    recurrence?: Omit<RecurrenceRule, 'endDate'> & {
        endDate?: string;
    }
};

// Tipo para os funcionários (para o formulário de delegação)
export interface StaffMember {
    uid: string;
    email: string;
    name: string;
    // ++ INÍCIO DA ADIÇÃO ++
    role: UserRole; // <-- Adiciona a role ao tipo
    // ++ FIM DA ADIÇÃO ++
}