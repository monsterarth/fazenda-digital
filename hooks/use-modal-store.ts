// hooks/use-modal-store.ts

import { create } from 'zustand';
import { Stay, Cabin, Property, Guest } from '@/types';
import { MaintenanceTask, StaffMember } from '@/types/maintenance';

export type ModalType =
  | 'createStay'          // Novo Fast Stay
  | 'createStayLegacy'    // Antigo Modal Completo (Adicionado)
  | 'editStay'
  | 'upsertMaintenanceTask'
  | 'delegateMaintenanceTask'
  | 'completeMaintenanceTask'
  | 'reviewMaintenanceTask'
  | 'viewMaintenanceTask';

interface ModalData {
  // --- Para Stays ---
  stay?: Stay;
  cabins?: Cabin[];
  property?: Property;
  guest?: Guest;

  // --- Para Manutenção ---
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