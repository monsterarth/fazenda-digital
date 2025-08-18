//types/index.ts

import { Timestamp, DocumentReference } from "firebase/firestore";
import { ReactNode } from "react";

// ========================================================================
// 1. ESTRUTURA CENTRAL: A ESTADIA DO HÓSPEDE (O CORAÇÃO DO SISTEMA)
// ========================================================================

export interface Stay {
  pets: any;
  id: string;
  guestName: string;
  cabinId: string;
  cabinName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  token: string;
  status: 'pending_validation' | 'active' | 'checked_out' | 'canceled';
  preCheckInId: string;
  createdAt: string;
  bookings?: Booking[];
  policiesAccepted?: {
    general?: Timestamp;
    pet?: Timestamp;
  }
}

// ========================================================================
// 2. PRÉ-CHECK-IN: O DOSSIÊ COMPLETO DO HÓSPEDE
// ========================================================================

export interface Address {
  cep?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
}

export interface Companion {
  fullName: string;
  age: number;
  cpf?: string;
}

export interface PetDetails {
  id: string;
  name: string;
  species: 'cachorro' | 'gato' | 'outro';
  breed: string;
  weight: number;
  age: string;
  notes?: string;
}

export type PreCheckInStatus = 'pendente' | 'validado' | 'arquivado' | 'validado_admin'; {
}

export interface PreCheckIn {
  id: string;
  leadGuestName: string;
  isForeigner: boolean;
  leadGuestDocument: string;
  leadGuestEmail: string;
  leadGuestPhone: string;
  address: Address;
  estimatedArrivalTime: string;
  vehiclePlate?: string;
  knowsVehiclePlate: boolean;
  companions: Companion[];
  pets: PetDetails[];
  travelReason?: string;
  foodRestrictions?: string;
  createdAt: Timestamp;
  status: PreCheckInStatus; 
  stayId?: string;
}

// ========================================================================
// 3. AGENDAMENTO DE SERVIÇOS
// ========================================================================

export interface TimeSlot {
  id: string;
  label: string;
}

export interface Service {
  id: string;
  name: string;
  type: 'slots' | 'preference' | 'on_demand';
  defaultStatus: 'closed' | 'open';
  units: string[];
  timeSlots: TimeSlot[];
  additionalOptions?: string[];
  instructions?: string;
}

export interface Booking {
    structureName: string;
    endTime: any;
    structureId: string;
    startTime: any;
    id: string;
    stayId: string;
    serviceId: string;
    serviceName: string;
    date: string;
    unit?: string;
    timeSlotId?: string;
    timeSlotLabel?: string;
    preferenceTime?: string;
    selectedOptions?: string[];
    hasPet?: boolean;
    notes?: string;
    status: 'solicitado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado_pelo_admin' | 'bloqueado';
    createdAt: Timestamp;
}

// ========================================================================
// 4. CARDÁPIO E PEDIDOS DE CAFÉ DA MANHÃ (ATUALIZADO PARA NOVAS REGRAS)
// ========================================================================

export interface Flavor {
    id: string;
    name: string;
    available: boolean;
}

export interface BreakfastMenuItem {
  obs: any;
  selectedOption: string;
  quantity: ReactNode;
  id: string;
  name: string;
  description?: string;
  available: boolean;
  order: number;
  imageUrl?: string;
  flavors: Flavor[];
}

export interface BreakfastMenuCategory {
  id: string;
  name: string;
  order: number;
  type: 'individual' | 'collective';
  items: BreakfastMenuItem[];
  limitType: 'none' | 'per_item' | 'per_category';
  limitGuestMultiplier: number;
}

export interface IndividualOrderItem {
  personId: number;
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemName: string;
  flavorId?: string;
  flavorName?: string;
}

export interface CollectiveOrderItem {
    itemId: string;
    itemName: string;
    categoryName: string;
    quantity: number;
}

export interface BreakfastOrder {
    guestName: ReactNode;
    cabinName: ReactNode;
    items: any;
    id: string;
    stayId: string;
    deliveryDate: string;
    numberOfGuests: number;
    individualItems: IndividualOrderItem[];
    collectiveItems: CollectiveOrderItem[];
    generalNotes?: string;
    status: 'pending' | 'printed' | 'delivered' | 'canceled';
    createdAt: Timestamp;
}

// ========================================================================
// 5. CONFIGURAÇÕES GERAIS
// ========================================================================

export interface AppConfig {
  logoUrl?: string;
  nomeFazenda: string;
  subtitulo?: string;
  corFundo: string;
  corTexto: string;
  corDestaque: string;
  corDestaqueTexto: string;
  corCartao: string;
  textoBoasVindas?: string;
  textoAgradecimento: string;
  mensagemAtrasoPadrao?: string;
  mensagemDoDia?: string;
  mensagensMotivacionais?: string[];
  preCheckInWelcomeMessage?: string;
  preCheckInSuccessMessage?: string;
  isBasketBreakfastOpen: boolean;
  basketBreakfastClosedMessage: string;
  welcomeEmoji?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  successTitle?: string;
  successSubtitle?: string;
  successGratitude?: string;
  successFooter?: string;
  comandaTitle?: string;
  comandaSubtitle?: string;
  comandaPostQr?: string;
  comandaFooter?: string;
  surveySuccessTitle?: string;
  surveySuccessSubtitle?: string;
  surveySuccessFooter?: string;
}

export interface Cabin {
  id: string;
  name: string;
  capacity: number;
  posicao?: number;
  wifiSsid?: string;
  wifiPassword?: string;
}

// ========================================================================
// 6. TIPOS DE APOIO E LEGADOS
// ========================================================================

export interface HotDish {
  id: string;
  nomeItem: string;
  emoji?: string;
  disponivel: boolean;
  sabores: Flavor[];
  imageUrl?: string;
  posicao?: number;
}

export interface AccompanimentCategory {
  id: string;
  name: string;
  items: AccompanimentItem[];
}

export interface AccompanimentItem {
  id: string;
  nomeItem: string;
  emoji?: string;
  disponivel: boolean;
  descricaoPorcao?: string;
}

export interface Supplier {
  id: string;
  name: string;
}

export interface StockItem {
  id: string;
  name: string;
  supplierId: string;
  posicao?: number;
}

export interface ItemPedido {
  nomeItem: string;
  quantidade: number;
  observacao?: string;
  paraPessoa?: string;
  categoria?: string;
  sabor?: string;
}

export interface Order {
  id: string;
  stayId: DocumentReference;
  horarioEntrega?: string;
  status: "Novo" | "Em Preparação" | "Entregue" | "Cancelado";
  timestampPedido?: Timestamp;
  itensPedido?: ItemPedido[];
  observacoesGerais?: string;
  hospedeNome?: string;
  cabanaNumero?: string;
  numeroPessoas?: number;
}

export interface Comanda {
  id: string;
  guestName: string;
  cabin: string;
  numberOfGuests: number;
  token: string;
  isActive: boolean;
  status?: 'ativa' | 'arquivada';
  createdAt: Timestamp;
  usedAt?: Timestamp;
  horarioLimite?: Timestamp;
  mensagemAtraso?: string;
}

export interface Person {
  id: number;
  hotDish: {
    typeId: string;
    flavorId: string;
  } | null;
  notes?: string;
}

export interface OrderState {
  isAuthenticated: boolean;
  comanda: Omit<Comanda, 'id' | 'createdAt' | 'isActive' | 'usedAt'> | null;
  currentStep: number;
  completedSteps: number[];
  guestInfo: {
    name: string;
    cabin: string;
    people: number;
    time: string;
  };
  persons: Person[];
  accompaniments: Record<string, Record<string, number>>;
  globalHotDishNotes: string;
  specialRequests: string;
}


// ========================================================================
// 8. NOVA ESTRUTURA DE PERSONALIZAÇÃO (WHITE-LABEL)
// ========================================================================

export interface PropertyColors {
    [key: string]: string; 
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
    text: string;
    textOnPrimary: string;
}

export interface PropertyMessages {
    preCheckInWelcomeTitle: string;
    preCheckInWelcomeSubtitle: string;
    preCheckInSuccessTitle: string;
    preCheckInSuccessSubtitle: string;
    portalWelcomeTitle: string;
    portalWelcomeSubtitle: string;
    surveySuccessTitle: string;
    surveySuccessSubtitle: string;
    breakfastBasketClosed: string;
    breakfastBasketDefaultMessage: string;
}

export interface Property {
    contact: any;
    id: string;
    name: string;
    logoUrl: string;
    colors: PropertyColors;
    messages: PropertyMessages;
    breakfast?: {
      isAvailable: boolean;
      type: 'delivery' | 'on-site';
      menu: BreakfastMenuCategory[]; 
      orderingStartTime: string;
      orderingEndTime: string;
    };
policies?: {
      general: {
        content: string;
        lastUpdatedAt: Timestamp;
      };
      pet: {
        content: string;
        lastUpdatedAt: Timestamp;
      }
    };
}

// ========================================================================
// 9. TIPOS COMBINADOS (HELPER TYPES)
// ========================================================================

export type OrderWithStay = BreakfastOrder & {
  stayInfo?: Stay;
};