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
  description: string
  value: number
  dueDate: string // Data ISO (YYYY-MM-DD)
  isPaid: boolean
  paymentDate?: string
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
  service: string
  category: 'Exclusivo' | 'Externo' | 'Sugerido'
  contact: string
  status: 'Pendente' | 'Confirmado' | 'Pago'
  // isExclusive FOI REMOVIDO DAQUI
}

// Interface para Tarefas do Checklist
export interface WeddingTask {
  id: string
  description: string
  deadline: string // Data ISO (YYYY-MM-DD)
  isDone: boolean
  responsible: 'Contratante' | 'Contratada'
}

// Interface principal do Dossiê de Casamento (ATUALIZADA)
export interface Wedding {
  id: string
  coupleName: string
  couplePhotoUrl?: string
  
  weddingDate: string
  guestCount: number
  location: WeddingLocation
  
  coupleCity: string 
  
  // ++ ADICIONADO ++
  hasLodgeExclusivity: boolean // Exclusividade de hospedagem

  // Informações dos clientes
  clients: WeddingClient[]

  // Datas de Hospedagem (para bloqueio)
  checkInDate: string
  checkOutDate: string
  courtesyCabin?: string

  // Financeiro
  totalValue: number
  paymentPlan: PaymentInstallment[]
  deposit: Deposit 

  // Gerenciamento
  suppliers: WeddingSupplier[]
  checklist: WeddingTask[]
  
  // Documentos e Notas
  contractUrl?: string
  internalObservations: string

  // Metadados
  isConfirmed: boolean 
  createdAt: Timestamp
  updatedAt: Timestamp
}