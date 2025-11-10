import { z } from 'zod'

// Schema 1: Criação de Casamento (Já tínhamos)
export const weddingFormSchema = z.object({
  coupleName: z.string().min(3, { message: 'Nome do casal é obrigatório.' }),
  coupleCity: z.string().optional(),
  plannerName: z.string().optional(),
  soundSupplierName: z.string().optional(),
  buffetSupplierName: z.string().optional(),
  buffetIsExclusive: z.boolean().default(false),
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

// ++ INÍCIO DA ADIÇÃO ++

// Schema 2: Edição da Aba "Geral"
export const weddingGeneralFormSchema = z.object({
  coupleName: z.string().min(3, { message: 'Nome do casal é obrigatório.' }),
  coupleCity: z.string().optional(),
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

export type WeddingGeneralFormValues = z.infer<typeof weddingGeneralFormSchema>

// ++ FIM DA ADIÇÃO ++