// types/maintenance.ts

import { Timestamp } from 'firebase/firestore'; // <-- USANDO O TIMESTAMP DO CLIENTE

// Status unificado para o Kanban
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';

// Regra de recorrência
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Timestamp; // Opcional: quando parar de repetir
}

// O modelo de dados principal para uma tarefa de manutenção
export interface MaintenanceTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  
  location: string; 
  
  createdAt: Timestamp; // <-- Timestamp do cliente
  createdBy: string; 
  
  assignedTo: string[]; 
  dependsOn: string[]; 
  recurrence?: RecurrenceRule; 
  parentTaskId?: string; 
  nextTaskId?: string;   
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
}