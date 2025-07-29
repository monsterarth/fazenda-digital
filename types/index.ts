import { Timestamp } from "firebase/firestore";

// ========================================================================
// 1. ESTRUTURA CENTRAL: A ESTADIA DO HÓSPEDE (O CORAÇÃO DO SISTEMA)
// Esta interface unifica a jornada do hóspede. Todas as outras ações
// (pedidos, agendamentos) serão vinculadas a uma única "Stay".
// ========================================================================

export interface Stay {
  id: string;
  guestName: string;         // Nome principal do hóspede, vindo do pré-check-in.
  cabinId: string;           // ID da cabana para referência interna.
  cabinName: string;         // Nome da cabana (denormalizado para fácil exibição).
  checkInDate: Timestamp;    // Data de início da estadia.
  checkOutDate: Timestamp;   // Data de término da estadia.
  numberOfGuests: number;
  token: string;             // Token de acesso único do hóspede para o portal.
  status: 'pending_validation' | 'active' | 'checked_out' | 'canceled';
  preCheckInId: string;      // Link para os dados originais do pré-check-in.
  createdAt: Timestamp;
}

// ========================================================================
// 2. PRÉ-CHECK-IN: O DOSSIÊ COMPLETO DO HÓSPEDE
// Coleta todas as informações necessárias uma única vez.
// ========================================================================

export interface Guest {
  fullName: string;
  isLead: boolean;
}

export interface PreCheckIn {
  id: string;
  // Dados do responsável
  leadGuestCpf: string;
  leadGuestEmail: string;
  leadGuestPhone: string;
  address: string;
  // Detalhes da Estadia
  estimatedArrivalTime: string;
  vehiclePlate?: string;
  travelReason?: string;
  // Detalhes dos Hóspedes
  guests: Guest[];
  foodRestrictions?: string;
  isBringingPet: boolean;
  petPolicyAgreed: boolean; // Confirmação da política de pets
  // Controle do Admin
  createdAt: Timestamp;
  status: 'pendente' | 'validado' | 'arquivado';
  stayId?: string;
}


// ========================================================================
// 3. AGENDAMENTO DE SERVIÇOS (REESTRUTURADO)
// ========================================================================

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

export interface Service {
  id: string;
  name: string;
  type: 'slots' | 'preference';
  defaultStatus: 'closed' | 'open';
  units: string[];
  timeSlots: TimeSlot[];
  additionalOptions?: string[];
}

export interface Booking {
    id: string;
    stayId: string;
    serviceId: string;
    serviceName: string;
    date: string;
    
    // Para 'slots'
    unit?: string; 
    timeSlotId?: string;
    timeSlotLabel?: string;
    
    // Para 'preference'
    preferenceTime?: string;
    selectedOptions?: string[];
    hasPet?: boolean;
    
    // Controle do Admin
    notes?: string;
    status: 'solicitado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado_pelo_admin' | 'bloqueado';
    createdAt: Timestamp;
}

// ========================================================================
// 4. PEDIDOS DE CAFÉ E ITENS (REESTRUTURADO)
// A interface "Order" antiga foi mantida e agora se conecta a uma "Stay".
// ========================================================================

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
  stayId: string; // <-- Ponto de conexão principal
  horarioEntrega: string;
  status: "Novo" | "Em Preparação" | "Entregue" | "Cancelado";
  timestampPedido: Timestamp;
  itensPedido: ItemPedido[];
  observacoesGerais?: string;
  observacoesPratosQuentes?: string;
  // Os campos hospedeNome, cabanaNumero, numeroPessoas foram removidos
  // pois agora virão da "Stay" vinculada.
}

// ========================================================================
// 5. CONFIGURAÇÕES GERAIS E CARDÁPIO (Estrutura Mantida e Aprimorada)
// ========================================================================

export interface AppConfig {
  // Aparência
  logoUrl?: string;
  nomeFazenda: string;
  subtitulo?: string;
  corFundo: string;
  corTexto: string;
  corDestaque: string;
  corDestaqueTexto: string;
  corCartao: string;
  
  // Mensagens Gerais
  textoBoasVindas?: string;
  textoAgradecimento: string;
  mensagemAtrasoPadrao?: string;
  mensagemDoDia?: string;
  mensagensMotivacionais?: string[];
  preCheckInWelcomeMessage?: string;
  preCheckInSuccessMessage?: string;

  // Controle de Serviços
  isBasketBreakfastOpen: boolean; 
  basketBreakfastClosedMessage: string;

  // Mensagens Personalizáveis (mantidas do sistema anterior)
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

// ========================================================================
// 6. TIPOS PARA GESTÃO DE ESTOQUE (Estrutura Mantida)
// ========================================================================

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

// ========================================================================
// 7. TIPOS LEGADOS (Mantidos para referência, podem ser removidos no futuro)
// O sistema de "Comanda" e "OrderState" era do fluxo antigo de token por serviço.
// ========================================================================

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