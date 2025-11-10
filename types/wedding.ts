import { Timestamp } from 'firebase/firestore'

// Definição do Local do Evento
export type WeddingLocation = 'Maram' | 'Mayam' | 'Outro'

// Interface para os Contratantes
export interface WeddingClient {
  id: string
  name: string
  cpf: string
  email: string
  phone: string
  address: string
}

// Interface para o Plano de Pagamento
export interface PaymentInstallment {
  id: string
  description: string // Ex: "Sinal (50%)", "Saldo (50%)"
  value: number
  dueDate: string // Data ISO (YYYY-MM-DD)
  isPaid: boolean
  paymentDate?: string // Data que foi pago
}

// Interface para o Caução
export interface Deposit {
  value: number
  status: 'Pendente' | 'Recebido' | 'Devolvido'
  receivedDate?: string
  returnedDate?: string
}

// Interface para Fornecedores (ATUALIZADA)
export interface WeddingSupplier {
  id: string
  name: string
  service: string // Ex: "Buffet", "Som", "Cerimonial"
  category: 'Exclusivo' | 'Externo' | 'Sugerido'
  contact: string
  status: 'Pendente' | 'Confirmado' | 'Pago'
  isExclusive?: boolean // ++ ADICIONADO para o checkbox
}

// Interface para Tarefas do Checklist
export interface WeddingTask {
  id: string
  description: string // Ex: "Enviar Lista de Convidados"
  deadline: string // Data ISO (YYYY-MM-DD)
  isDone: boolean
  responsible: 'Contratante' | 'Contratada' // Quem deve executar
}

// Interface principal do Dossiê de Casamento (ATUALIZADA)
export interface Wedding {
  id: string
  coupleName: string // Ex: "Milene & Pedro"
  couplePhotoUrl?: string
  
  weddingDate: string // Data ISO (YYYY-MM-DD)
  guestCount: number
  location: WeddingLocation
  
  coupleCity: string // ++ ADICIONADO (Cidade dos noivos)

  // Informações dos clientes
  clients: WeddingClient[]

  // Datas de Hospedagem (para bloqueio)
  checkInDate: string
  checkOutDate: string
  courtesyCabin?: string // Ex: "Hibisco"

  // Financeiro
  totalValue: number
  paymentPlan: PaymentInstallment[]
  deposit: Deposit 

  // Gerenciamento
  suppliers: WeddingSupplier[]
  checklist: WeddingTask[]
  
  // Documentos e Notas
  contractUrl?: string // Link para o PDF/DOCX no Firebase Storage
  internalObservations: string

  // Metadados
  isConfirmed: boolean 
  createdAt: Timestamp
  updatedAt: Timestamp
}