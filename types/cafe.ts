// types/cafe.ts
import { Timestamp } from './index';

/**
 * Representa um ÚNICO participante esperado para o café no salão.
 * Se uma estadia tem 4 hóspedes, 4 destes documentos serão criados.
 */
export interface BreakfastAttendee {
  id: string;
  stayId: string;
  cabinName: string;
  
  guestName: string; 
  isPrimary: boolean;
  
  date: string; // "yyyy-MM-dd"
  
  // ++ CORREÇÃO: Adicionado o status 'finished' ++
  status: 'pending' | 'attended' | 'finished'; // Pendente, Presente, ou Finalizado
  
  table: string | null; // Mesa vinculada (ex: "Mesa 05")
  checkInAt: Timestamp | null; // Horário do check-in no salão
  createdAt: Timestamp; // Horário que o registro foi criado
}

/**
 * Representa o estado de uma mesa no salão para um dia específico.
 */
export interface BreakfastTable {
  id: string;
  tableName: string; // "Mesa 05"
  date: string; // "yyyy-MM-dd"
  status: 'open' | 'closed';
  createdAt: Timestamp;
}

/**
 * Representa uma comanda de pratos quentes para a cozinha.
 */
export interface KitchenOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  notes?: string;
  flavorName?: string;
}

export interface KitchenOrder {
  id: string;
  table: string; // Ex: "Mesa 05"
  items: KitchenOrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  createdAt: Timestamp;
  createdBy: string; // Nome ou ID do garçom
}