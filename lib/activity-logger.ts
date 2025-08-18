import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, WriteBatch, doc } from 'firebase/firestore';

// Define os tipos de ator e de dados para um log
type ActivityActor = {
  type: 'guest' | 'admin';
  identifier: string; // Nome do Hóspede ou Email do Admin
};

// ++ INÍCIO DA CORREÇÃO: Adiciona todos os novos tipos de log de agendamento ++
export type ActivityLogData = {
  type: 
    | 'checkin_submitted' 
    | 'stay_created_manually' 
    | 'cafe_ordered' 
    | 'booking_requested'
    | 'booking_confirmed'
    | 'booking_declined'
    | 'booking_created_by_admin'
    | 'booking_cancelled_by_admin'
    | 'booking_cancelled_by_guest';
  actor: ActivityActor;
  details: string; // Ex: "Pré-check-in de João da Silva"
  link: string;   // Ex: "/admin/stays"
};
// ++ FIM DA CORREÇÃO ++

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