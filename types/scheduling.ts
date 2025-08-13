// types/scheduling.ts

import { Timestamp } from "firebase/firestore";

// Nova tipagem mais limpa e consistente
export interface TimeSlot {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  label: string;     // Ex: "08:00 - 09:00"
}

export interface Structure {
  id: string;
  name:string;
  photoURL: string;
  managementType: 'by_structure' | 'by_unit';
  units: string[];
  defaultStatus: 'open' | 'closed';
  approvalMode: 'automatic' | 'manual';
  timeSlots: TimeSlot[];
}

export type BookingStatus = 'pendente' | 'confirmado' | 'cancelado' | 'bloqueado';

export interface Booking {
  id: string;
  structureId: string;
  structureName: string;
  unitId: string | null; // Usar null para o caso de 'by_structure'
  stayId: string;
  guestName: string; // Adicionado para resolver o erro de tipagem no frontend
  cabinName: string; // Adicionado para resolver o erro de tipagem no frontend
  date: string;          // Formato "YYYY-MM-DD"
  startTime: string;     // Formato "HH:mm"
  endTime: string;       // Formato "HH:mm"
  status: BookingStatus;
  createdAt: Timestamp;
}