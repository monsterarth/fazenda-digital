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

// Interface para Fornecedores
export interface WeddingSupplier {
  id: string
  name: string
  service: string
  category: 'Exclusivo' | 'Externo' | 'Sugerido'
  contact: string
  status: 'Pendente' | 'Confirmado' | 'Pago'
}

// ++ INÍCIO DA CORREÇÃO ++
// Interface para Tarefas do Checklist (ATUALIZADA)
export interface WeddingTask {
  id: string
  description: string
  // O prazo é opcional e pode ser nulo
  deadline?: string | null 
  isDone: boolean
  responsible: 'Contratante' | 'Contratada'
}
// ++ FIM DA CORREÇÃO ++

// Interface principal do Dossiê de Casamento
export interface Wedding {
  id: string
  coupleName: string
  couplePhotoUrl?: string
  
  weddingDate: string
  guestCount: number
  location: WeddingLocation
  
  coupleCity: string 
  
  hasLodgeExclusivity: boolean

  // Informações dos clientes
  clients: WeddingClient[]

  // Datas de Hospedagem (para bloqueio)
  checkInDate: string
  checkOutDate: string
  courtesyCabin?: string

  // Financeiro
  totalValue: number
  paymentPlan: PaymentInstallment[]
  deposit: Deposit // Este tipo está correto, o erro era no form

  // Gerenciamento
  suppliers: WeddingSupplier[]
  checklist: WeddingTask[] // <-- Agora usa a WeddingTask corrigida
  
  // Documentos e Notas
  contractUrl?: string
  internalObservations: string

  // Metadados
  isConfirmed: boolean 
  createdAt: Timestamp
  updatedAt: Timestamp
}