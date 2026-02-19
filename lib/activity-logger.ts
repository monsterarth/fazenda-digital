// lib/activity-logger.ts

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, WriteBatch, doc } from 'firebase/firestore';

// Define os tipos de ator e de dados para um log
type ActivityActor = {
  type: 'guest' | 'admin';
  identifier: string; // Nome do Hóspede ou Email do Admin
};

// ++ ATUALIZADO: O tipo ActivityLogData agora inclui Manutenção ++
export type ActivityLogData = {
  type: 
  | "checkin_submitted"
  | "stay_created_manually"
  | "checkin_validated"
  | "checkin_rejected"
  | "cafe_ordered"
  | "booking_requested"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_created_by_admin"
  | "booking_cancelled_by_admin"
  | "booking_cancelled_by_guest"
  | "survey_submitted"
  | "stay_token_updated"
  | "stay_updated"
  // Tipos de Solicitação (já estavam no dashboard, mas faltando aqui)
  | 'request_created'       
  | 'request_cancelled'
  | 'request_in_progress' 
  | 'request_completed'   
  | 'request_deleted'
  // ++ ADICIONADO: Tipos de Manutenção ++
  | 'maintenance_task_created'
  | 'maintenance_task_assigned'
  | 'maintenance_task_status_changed'
  | 'maintenance_task_completed'
  | 'maintenance_task_archived'
  | 'maintenance_task_deleted'; // <-- O novo tipo para a exclusão
    
  actor: ActivityActor;
  details: string; 
  link: string;
};
/**
 * Adiciona uma operação de criação de log a um batch do Firestore.
 * @param batch O batch de escrita do Firestore ao qual a operação será adicionada.
 * @param data Os dados do log de atividade.
 */
export const addActivityLogToBatch = (batch: WriteBatch, data: ActivityLogData) => {
  const logRef = doc(collection(db, 'activity_logs'));
  batch.set(logRef, {
    ...data,
    timestamp: serverTimestamp(),
  });
};

/**
 * Cria um novo documento de log de atividade de forma independente.
 * @param data Os dados do log de atividade.
 */
export const createActivityLog = async (data: ActivityLogData) => {
    try {
        await addDoc(collection(db, 'activity_logs'), {
            ...data,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Falha ao criar o log de atividade:", error);
    }
}