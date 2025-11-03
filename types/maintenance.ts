// types/maintenance.ts

import { Timestamp } from "firebase/firestore";

// ++ NOVO: Tipo para as roles de staff (espelhado do AuthContext)
export type StaffRole = 
  | "super_admin"
  | "recepcao"
  | "marketing"
  | "cafe"
  | "manutencao"
  | "guarita";

/**
 * ++ NOVO: Perfil de Funcionário (Mestre)
 * Armazena os dados da conta de todos os funcionários.
 * (Coleção: 'staff_profiles')
 */
export interface StaffProfile {
  id: string; // UID do Firebase Auth
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: Timestamp;
}


/**
 * Armazena dados de performance e metadados de um funcionário
 * da manutenção. O ID deste documento é o UID do Firebase Auth
 * do usuário (que deve ter a role 'manutencao').
 * (Coleção: 'maintenance_staff')
 */
export interface MaintenanceStaff {
  id: string; // UID do Firebase Auth
  name: string; // Nome de exibição
  isActive: boolean; // Se o funcionário está ativo na plataforma
  totalPoints: number; // A soma dos 'weight' de todas as tarefas concluídas
}

/**
* A Ordem de Serviço (O.S.)
* Baseado no nosso brainstorm de MVP (simples e mobile).
* (Coleção: 'maintenance_tasks')
*/
export interface MaintenanceTask {
  id: string;
  title: string;       
  location: string;    
  priority: 'low' | 'medium' | 'high';
  weight: number;         

  status: 'backlog' | 'in_progress' | 'awaiting_review' | 'archived';

  assignedToId?: string; // UID do funcionário ('manutencao')
  assignedToName?: string;

  createdAt: Timestamp;
  createdById: string; // UID do gestor ('super_admin' ou 'recepcao')
  createdBy: string;   // Nome do gestor
  
  completedAt?: Timestamp; // Quando o *funcionário* marcou como 'awaiting_review'
  reviewedAt?: Timestamp;  // Quando o *gestor* marcou como 'archived'
}