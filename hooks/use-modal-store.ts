// ARQUIVO: hooks/use-modal-store.ts
// (Note: Fornecendo o código completo do arquivo, com a nova adição)

import { create } from 'zustand';
import { Stay, Cabin, Property, Guest } from '@/types';
import { MaintenanceTask, StaffMember } from '@/types/maintenance';

export type ModalType =
  | 'createStay'
  | 'editStay'
  // Tipos de manutenção existentes
  | 'upsertMaintenanceTask'
  | 'delegateMaintenanceTask'
  | 'completeMaintenanceTask'
  | 'reviewMaintenanceTask'
  // 1. NOSSO NOVO TIPO DE MODAL (ADMIN VIEW)
  | 'viewMaintenanceTask'; // <-- ADICIONADO

interface ModalData {
  // --- Para Stays ('createStay' e 'editStay') ---
  stay?: Stay;
  cabins?: Cabin[];
  property?: Property;
  guest?: Guest;

  // --- Para Manutenção ---
  // (Todos os tipos de dados existentes são reutilizados)
  task?: MaintenanceTask;
  allTasks?: MaintenanceTask[];
  staff?: StaffMember[];
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false, data: {} }),
}));