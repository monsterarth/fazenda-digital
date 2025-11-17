// types/index.ts

import { firestore } from "firebase-admin";
import type { DocumentReference } from "firebase/firestore";
import { ReactNode } from "react";

// ========================================================================
// 0. TIPOS PRIMÁRIOS (ENTIDADES CENTRAIS)
// ========================================================================

/**
 * Representa o Hóspede principal. Esta é a definição unificada usada em todo o sistema.
 */
export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string; // Padronizado para CPF ou outro documento
  isForeigner?: boolean;
  country?: string;
  address?: Address;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  stayHistory?: string[];
}

/**
 * Representa um equipamento que pode estar presente em uma cabana.
 */
export interface Equipment {
  type: string;
  model: string;
}

/**
 * Representa a Cabana, com seus detalhes e configurações.
 */
export interface Cabin {
  id: string;
  name: string;
  capacity: number;
  posicao?: number;
  wifiSsid?: string;
  wifiPassword?: string;
  equipment?: Equipment[];
}

// ========================================================================
// 1. ESTRUTURA CENTRAL: A ESTADIA DO HÓSPEDE
// ========================================================================

/**
 * Representa a estadia de um hóspede, ligando o hóspede, a cabana e o período.
 */
export interface Stay {
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
  createdAt: Timestamp;
  endedAt?: Timestamp;
  endedBy?: string;
  
  guest?: Guest;
  cabin?: Cabin;
  bookings?: Booking[];
  
  policiesAccepted?: {
    general?: Timestamp;
    pet?: Timestamp;
  }
  communicationStatus?: {
    welcomeMessageSentAt?: Timestamp | null;
    feedbackMessageSentAt?: Timestamp | null;
  };
  pets: any;
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
  country?: string;
}

export interface Companion {
  fullName: string;
  age: number | string;
  cpf?: string;
}

export interface PetDetails {
  id: string;
  name: string;
  species: 'cachorro' | 'gato' | 'outro';
  breed: string;
  weight: number | string;
  age: string;
  notes?: string;
}

export type PreCheckInStatus = 'pendente' | 'validado' | 'arquivado' | 'validado_admin';

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
// 4. CARDÁPIO E PEDIDOS DE CAFÉ DA MANHÃ
// ========================================================================

// ++ NOVO: Definição de Item de Receita (Ficha Técnica)
export interface RecipeIngredient {
  ingredientId: string; // ID do documento em 'ingredients'
  quantity: number;     // Ex: 0.2
  unit: string;         // Ex: 'kg'
  ingredientName?: string; // Opcional para exibição no front
}

export interface Flavor {
    id: string;
    name: string;
    available: boolean;
    recipe?: RecipeIngredient[]; // ++ NOVO: Ficha técnica do sabor
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
  recipe?: RecipeIngredient[]; // ++ NOVO: Ficha técnica do item base
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
    deliveryTime?: string;
    numberOfGuests: number;
    individualItems: IndividualOrderItem[];
    collectiveItems: CollectiveOrderItem[];
    generalNotes?: string;
    status: 'pending' | 'printed' | 'delivered' | 'canceled';
    createdAt: Timestamp;
}

// ========================================================================
// 5. CONFIGURAÇÕES GERAIS E PERSONALIZAÇÃO (WHITE-LABEL)
// ========================================================================

export interface PropertyColors {
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
    whatsappPreCheckIn: string;
    whatsappWelcome: string;
    whatsappBreakfastReminder: string;
    whatsappCheckoutInfo: string;
    whatsappFeedbackRequest: string;
    whatsappBookingConfirmed: string;
    whatsappRequestReceived: string;
    whatsappEventInvite: string;
    whatsappBreakfastChange: string;
}

export interface Property {
    googleReviewLink: string | undefined;
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
      deliveryTimes?: string[];
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
    defaultSurveyId?: string;
}

// ========================================================================
// 6. TIPOS DE APOIO E LEGADOS
// ========================================================================

interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}
export type Timestamp = FirestoreTimestamp | number | Date;

export interface MessageLog {
    id: string;
    stayId?: string;
    guestName: string;
    type: string;
    content: string;
    copiedAt: Timestamp;
    actor: string;
}

export type OrderWithStay = BreakfastOrder & {
  stayInfo?: Stay;
};

// ========================================================================
// 7. GUIAS E MANUAIS
// ========================================================================

export interface Guide {
  id: string;
  title: string;
  fileUrl: string;
  scope: 'general' | 'specific';
  equipmentType?: string;
  equipmentModel?: string;
}

// ++ INÍCIO DA CORREÇÃO: Adicionando a interface 'GuestRequest' que faltava ++
// ========================================================================
// 7.5. SOLICITAÇÕES DE HÓSPEDES (Requests)
// ========================================================================

export interface GuestRequest {
  itemName: any;
  quantity: number;
  id: string;
  stayId: string;
  guestName: string;
  cabinName: string;
  type: 'item' | 'cleaning' | 'maintenance';
  status: 'pending' | 'in_progress' | 'completed' | 'canceled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  details: {
    // Para 'item'
    itemName?: string;
    quantity?: number;
    itemPrice?: number;
    itemType?: 'loan' | 'consumable';
    // Para 'maintenance'
    description?: string;
  };
}
// ++ FIM DA CORREÇÃO ++

// ========================================================================
// 8. TIPOS LEGADOS (Mantidos para compatibilidade)
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

// 9. LOG DE ATIVIDADES
// ========================================================================
export type ActivityLogActor = {
  type: 'guest' | 'admin' | 'system';
  identifier: string; // guestId, adminEmail, ou 'system'
};

export type ActivityLogType =
  // Check-in
  | 'checkin_submitted'
  | 'checkin_validated'
  | 'checkin_rejected'
  // Estadia
  | 'stay_created_manually'
  | 'stay_ended'
  | 'stay_token_updated'
  // Café
  | 'cafe_ordered'
  | 'cafe_order_updated'
  // Agendamentos
  | 'booking_requested'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_created_by_admin'
  | 'booking_cancelled_by_admin'
  | 'booking_cancelled_by_guest'
  // Solicitações
  | 'request_created'
  | 'request_cancelled'
  | 'request_in_progress'
  | 'request_completed'
  | 'request_deleted'
  // Manutenção
  | 'maintenance_task_created'
  | 'maintenance_task_status_changed'
  | 'maintenance_task_assigned'
  // Pesquisas
  | 'survey_submitted'
  // Comunicação
  | 'message_sent';

export interface ActivityLog {
  id: string;
  timestamp: Timestamp;
  type: ActivityLogType | string; // Permite strings customizadas
  actor: ActivityLogActor;
  details: string; // Ex: "Agendamento de Piscina para Hóspede X aprovado"
  link?: string; // Ex: /admin/agendamentos
}
// ## FIM DA CORREÇÃO ##