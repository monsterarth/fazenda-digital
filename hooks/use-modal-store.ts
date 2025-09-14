// hooks/use-modal-store.ts

import { create } from 'zustand';
import { Guest } from '@/types';
import { Stay } from '@/types'; // ++ ADICIONADO ++

export type ModalType = 'createStay' | 'editStay'; // ++ ADICIONADO: 'editStay' ++

interface ModalData {
  guest?: Guest;
  stay?: Stay; // ++ ADICIONADO: para passar a estadia para o diálogo de edição ++
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false, data: {} }),
}));