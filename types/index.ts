import { Timestamp, DocumentReference } from "firebase/firestore";

// ========================================================================
// 1. ESTRUTURA CENTRAL: A ESTADIA DO HÓSPEDE (O CORAÇÃO DO SISTEMA)
// ========================================================================

export interface Stay {
  id: string;
  guestName: string;
  cabinId: string;
  cabinName: string;
  checkInDate: Timestamp;
  checkOutDate: Timestamp;
  numberOfGuests: number;
  token: string;
  status: 'pending_validation' | 'active' | 'checked_out' | 'canceled';
  preCheckInId: string;
  createdAt: Timestamp;
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
  status: 'pendente' | 'validado' | 'arquivado';
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
// 4. CARDÁPIO E PEDIDOS DE CAFÉ DA MANHÃ (NOVO)
// ========================================================================

export interface BreakfastMenuItem {
  id: string;
  name: string;
  description?: string;
  available: boolean;
  order: number;
}

export interface BreakfastMenuCategory {
  id: string;
  name: string;
  order: number;
  items: BreakfastMenuItem[];
}

export interface BreakfastOrderItem {
    itemName: string;
    categoryName: string;
    quantity: number;
}

export interface BreakfastOrder {
    id: string;
    stayId: DocumentReference;
    deliveryDate: Timestamp;
    numberOfGuests: number;
    items: BreakfastOrderItem[];
    generalNotes: string;
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

export interface Flavor {
  id: string;
  nomeSabor: string;
  disponivel: boolean;
  posicao: number;
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

export interface Order { // Mantido como Order para compatibilidade com a referência
  id: string;
  stayId: string;
  horarioEntrega: string;
  status: "Novo" | "Em Preparação" | "Entregue" | "Cancelado";
  timestampPedido: Timestamp;
  itensPedido: ItemPedido[];
  observacoesGerais?: string;
  observacoesPratosQuentes?: string;
  hospedeNome?: string; // Adicionado para impressão
  cabanaNumero?: string; // Adicionado para impressão
  numeroPessoas?: number; // Adicionado para impressão
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