// hooks/use-modal-store.ts

import { create } from 'zustand';
import { Stay, Cabin, Property, Guest } from '@/types'; 
import { MaintenanceTask, StaffMember } from '@/types/maintenance';

export type ModalType = 
  | 'createStay' 
  | 'editStay' 
  // ++ ATUALIZADO: Consolidado em um único tipo ++
  | 'upsertMaintenanceTask' // Substitui 'createMaintenanceTask'
  | 'delegateMaintenanceTask';

interface ModalData {
  // --- Para Stays ('createStay' e 'editStay') ---
  stay?: Stay;
  cabins?: Cabin[];
  property?: Property;
  guest?: Guest; 

  // --- Para Manutenção ---
  task?: MaintenanceTask;       // Usado por 'upsertMaintenanceTask' (edição) e 'delegate'
  allTasks?: MaintenanceTask[]; // Usado por 'upsertMaintenanceTask' (para dependências)
  staff?: StaffMember[];      // Usado por 'upsertMaintenanceTask' e 'delegate'
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