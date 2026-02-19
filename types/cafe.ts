// types/cafe.ts
import { Timestamp } from './index';

export interface BreakfastAttendee {
  id: string;
  stayId: string;
  cabinName: string;
  guestName: string; 
  isPrimary: boolean;
  date: string;
  status: 'pending' | 'attended' | 'finished';
  table: string | null;
  checkInAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface BreakfastTable {
  id: string;
  tableName: string;
  date: string;
  status: 'open' | 'closed';
  createdAt: Timestamp;
}

export interface KitchenOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  notes?: string;
  flavorName?: string;
  // Opcional: Custo unitário gravado no item se quisermos granularidade
  unitCost?: number; 
}

export interface KitchenOrder {
  id: string;
  table: string;
  items: KitchenOrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  createdAt: Timestamp;
  createdBy: string;
  totalCost?: number; // ++ NOVO: Custo total da comanda (CMV)
}