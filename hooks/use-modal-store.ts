// hooks/use-modal-store.ts

import { create } from 'zustand';
// ## INÍCIO DA CORREÇÃO ##
// Importar todos os tipos necessários
import { Stay, Cabin, Property, Guest } from '@/types'; 
import { MaintenanceTask, StaffMember } from '@/types/maintenance';
// ## FIM DA CORREÇÃO ##

export type ModalType = 
  | 'createStay' 
  | 'editStay' 
  | 'createMaintenanceTask'
  | 'delegateMaintenanceTask'
  | 'editMaintenanceTask'; // ++ ADICIONADO ++

// ## INÍCIO DA CORREÇÃO ##
// A interface ModalData deve conter todas as propriedades
// que qualquer modal possa precisar.
interface ModalData {
  // --- Para Stays ('createStay' e 'editStay') ---
  stay?: Stay;
  cabins?: Cabin[];
  property?: Property;
  guest?: Guest; // <-- Esta era a propriedade que faltava

  // --- Para Manutenção ('createMaintenanceTask' e 'delegateMaintenanceTask') ---
  task?: MaintenanceTask;
  allTasks?: MaintenanceTask[];
  staff?: StaffMember[];
}
// ## FIM DA CORREÇÃO ##

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