// types/scheduling.ts

import { Timestamp } from "firebase/firestore";

// ## INÍCIO DA CORREÇÃO ##

// Define a estrutura de um único horário configurável pelo admin
export interface TimeSlot {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  label: string;     // "08:00 - 09:00"
}

// A interface TimeSettings não é mais usada pela nova página de configuração,
// mas a mantemos aqui para evitar quebrar outras partes do sistema durante a transição.
export interface TimeSettings {
  open: string;       // Formato "HH:mm"
  close: string;      // Formato "HH:mm"
  duration: number;   // Duração da reserva em minutos
  interval: number;   // Intervalo entre as reservas em minutos
}

export interface Structure {
  id: string;
  name:string;
  photoURL: string;
  managementType: 'by_structure' | 'by_unit';
  units: string[];
  defaultStatus: 'open' | 'closed';
  approvalMode: 'automatic' | 'manual';


  // O campo 'timeSettings' foi substituído por 'timeSlots' para se alinhar
  // com a nova interface de configuração manual e gerada.
  timeSlots: TimeSlot[];
}

// ## FIM DA CORREÇÃO ##


export type BookingStatus = 'pendente' | 'confirmado' | 'cancelado' | 'em_andamento' | 'finalizado' | 'disponivel';

// Representa um agendamento (ou bloqueio/liberação) feito para um horário
export interface Booking {
  id: string;
  structureId: string;
  structureName: string;
  unitId?: string | null; // Corrigido para aceitar null

  stayId: string;        // ID do documento da coleção 'stays'. É a âncora da reserva.

  guestId: string;      // ID do usuário (denormalizado para referência)
  guestName: string;
  cabinId: string;
  date: string;          // Formato "YYYY-MM-DD"
  startTime: string;     // Formato "HH:mm"
  endTime: string;       // Formato "HH:mm"
  status: BookingStatus;
  createdAt: Timestamp;
}