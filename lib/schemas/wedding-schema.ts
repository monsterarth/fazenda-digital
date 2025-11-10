import { z } from 'zod'

// Schema 1: Criação de Casamento (ATUALIZADO)
export const weddingFormSchema = z.object({
  coupleName: z.string().min(3, { message: 'Nome do casal é obrigatório.' }),
  coupleCity: z.string().optional(),
  plannerName: z.string().optional(),
  soundSupplierName: z.string().optional(),
  buffetSupplierName: z.string().optional(),
  // buffetIsExclusive FOI REMOVIDO
  
  // ++ ADICIONADO ++
  hasLodgeExclusivity: z.boolean().default(false),

  weddingDate: z.date({ required_error: 'Data do evento é obrigatória.' }),
  checkInDate: z.date({ required_error: 'Data do Check-in é obrigatória.' }),
  checkOutDate: z.date({ required_error: 'Data do Check-out é obrigatória.' }),
  location: z.enum(['Maram', 'Mayam', 'Outro'], {
    required_error: 'Local é obrigatório.',
  }),
  guestCount: z.coerce
    .number()
    .min(1, { message: 'Número de convidados deve ser maior que 0.' }),
  totalValue: z.coerce
    .number()
    .min(0, { message: 'Valor total não pode ser negativo.' }),
  internalObservations: z.string().optional(),
})
export type WeddingFormValues = z.infer<typeof weddingFormSchema>


// Schema 2: Edição da Aba "Geral" (ATUALIZADO)
export const weddingGeneralFormSchema = z.object({
  coupleName: z.string().min(3, { message: 'Nome do casal é obrigatório.' }),
  coupleCity: z.string().optional(),
  
  // ++ ADICIONADO ++
  hasLodgeExclusivity: z.boolean().default(false),

  weddingDate: z.date({ required_error: 'Data do evento é obrigatória.' }),
  checkInDate: z.date({ required_error: 'Data do Check-in é obrigatória.' }),
  checkOutDate: z.date({ required_error: 'Data do Check-out é obrigatória.' }),
  location: z.enum(['Maram', 'Mayam', 'Outro'], {
    required_error: 'Local é obrigatório.',
  }),
  guestCount: z.coerce
    .number()
    .min(1, { message: 'Número de convidados deve ser maior que 0.' }),
  internalObservations: z.string().optional(),
})
export type WeddingGeneralFormValues = z.infer<typeof weddingGeneralFormSchema>


// (Schema 3: Aba Financeiro - Inalterado)
export const paymentInstallmentSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Descrição é obrigatória.'),
  value: z.coerce.number().min(0, 'Valor deve ser positivo.'),
  dueDate: z.date(),
  isPaid: z.boolean().default(false),
})
export const depositSchema = z.object({
  value: z.coerce.number().min(0, 'Valor deve ser positivo.'),
  status: z.enum(['Pendente', 'Recebido', 'Devolvido']),
})
export const weddingFinancialFormSchema = z.object({
  totalValue: z.coerce.number().min(0, 'Valor total é obrigatório.'),
  deposit: depositSchema.optional(),
  paymentPlan: z.array(paymentInstallmentSchema),
})
export type WeddingFinancialFormValues = z.infer<typeof weddingFinancialFormSchema>
export type PaymentInstallmentValues = z.infer<typeof paymentInstallmentSchema>


// (Schema 4: Aba Fornecedores - Inalterado)
export const supplierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório.'),
  service: z.string().min(1, 'Serviço é obrigatório.'),
  category: z.enum(['Exclusivo', 'Externo', 'Sugerido']),
  contact: z.string().optional(),
  status: z.enum(['Pendente', 'Confirmado', 'Pago']),
})
export const weddingSuppliersFormSchema = z.object({
  suppliers: z.array(supplierSchema),
})
export type WeddingSuppliersFormValues = z.infer<typeof weddingSuppliersFormSchema>
export type SupplierValues = z.infer<typeof supplierSchema>


// (Schema 5: Aba Checklist - Inalterado)
export const taskSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Descrição é obrigatória.'),
  isDone: z.boolean().default(false),
  responsible: z.enum(['Contratante', 'Contratada']),
  deadline: z.date().optional(),
})
export const weddingChecklistFormSchema = z.object({
  checklist: z.array(taskSchema),
})
export type WeddingChecklistFormValues = z.infer<typeof weddingChecklistFormSchema>
export type TaskValues = z.infer<typeof taskSchema>