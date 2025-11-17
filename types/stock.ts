// types/stock.ts
import { Timestamp } from 'firebase/firestore';

export type UnitOfMeasure = 'kg' | 'g' | 'l' | 'ml' | 'un';

export const UNIT_LABELS: Record<UnitOfMeasure, string> = {
  kg: 'Quilograma (kg)',
  g: 'Grama (g)',
  l: 'Litro (l)',
  ml: 'Mililitro (ml)',
  un: 'Unidade (un)',
};

// O "Item Básico" (ex: Ovo, Farinha, Leite)
export interface Ingredient {
  id: string;
  name: string;
  unit: UnitOfMeasure;
  averageCost: number; // Custo médio por unidade (ex: R$ 0,50 por 'un')
  updatedAt: Timestamp;
}

// Quem vende
export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  createdAt: Timestamp;
}

// O que o fornecedor vende (ex: "Fardo de Leite 12x1L")
// Vincula-se a um Ingrediente para calcular o custo.
export interface SupplierProduct {
  id: string;
  supplierId: string;
  ingredientId: string; // O ingrediente que isso abastece (ex: ID do Leite)
  name: string; // Nome comercial (ex: "Caixa Leite Integral")
  price: number; // Preço do pacote (ex: R$ 48,00)
  packageQuantity: number; // Quanto vem no pacote na unidade do ingrediente (ex: 12 se for 12 litros)
  // Custo Unitário calculado = price / packageQuantity
  lastUpdated: Timestamp;
}