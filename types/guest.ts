// types/guest.ts

import { Address } from '.'; // Importando o tipo Address já existente

export interface Guest {
  id: string; // ID do documento no Firestore
  name: string;
  cpf: string; // Chave principal para busca de duplicados
  email: string;
  phone: string;
  address: Address;
  isForeigner: boolean;
  country?: string;
  createdAt: number; // Timestamp da primeira estadia
  updatedAt: number; // Timestamp da última atualização
  stayHistory: string[]; // Array com os IDs das estadias
}