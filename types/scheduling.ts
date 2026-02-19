// types/scheduling.ts

import { Timestamp } from "firebase/firestore";
import { ReactNode } from "react";

// Nova tipagem mais limpa e consistente
export interface TimeSlot {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  label: string;     // Ex: "08:00 - 09:00"
}

export interface Structure {
  description: ReactNode;
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
  unit: string | undefined;
  timeSlot: any;
  id: string;
  structureId: string;
  structureName: string;
  unitId: string | null; // Usar null para o caso de 'by_structure'
  stayId: string;
  guestId: string;      
  guestName: string; 
  cabinId?: string;     
  cabinName: string; 
  date: string;         // Formato "YYYY-MM-DD"
  startTime: string;    // Formato "HH:mm"
  endTime: string;      // Formato "HH:mm"
  status: BookingStatus;
  // CORREÇÃO APLICADA AQUI: Permite Timestamp ou string
  createdAt: Timestamp | string; 
  // CORREÇÃO APLICADA AQUI: Permite Timestamp, string ou nulo
  confirmationSentAt?: Timestamp | string | null;
}