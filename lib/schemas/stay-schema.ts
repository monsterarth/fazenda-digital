import { z } from 'zod';
import { isValidCPF } from '@/lib/validators';

const companionSchema = z.object({
    fullName: z.string().min(1, "Nome do acompanhante é obrigatório."),
    age: z.string().min(1, "Idade é obrigatória."),
    cpf: z.string().optional()
});

const petSchema = z.object({
    id: z.string(),
    name: z.string().min(2, "Nome do pet é obrigatório."),
    species: z.enum(['cachorro', 'gato', 'outro']),
    breed: z.string().min(2, "Raça é obrigatória."),
    weight: z.string().min(1, "Peso é obrigatório."),
    age: z.string().min(1, "Idade é obrigatória."),
    notes: z.string().optional()
});

export const fullStaySchema = z.object({
    // Pre-check-in
    leadGuestName: z.string().min(3, "O nome completo é obrigatório."),
    isForeigner: z.boolean(),
    leadGuestDocument: z.string().min(3, "O documento é obrigatório."),
    country: z.string().optional(),
    leadGuestEmail: z.string().email("Forneça um e-mail válido."),
    leadGuestPhone: z.string().min(10, "Forneça um telefone válido com DDD."),
    address: z.object({
        cep: z.string().optional(),
        street: z.string().min(3, "O logradouro é obrigatório."),
        number: z.string().min(1, "O número é obrigatório."),
        complement: z.string().optional(),
        neighborhood: z.string().min(2, "O bairro é obrigatório."),
        city: z.string().min(2, "A cidade é obrigatória."),
        state: z.string().min(2, "O estado é obrigatório."),
        country: z.string().optional(),
    }),
    estimatedArrivalTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Selecione um horário válido."),
    knowsVehiclePlate: z.boolean(),
    vehiclePlate: z.string().optional(),
    
    // CORREÇÃO: Removido .default([]) para uma inferência mais limpa.
    // O `defaultValues` no `useForm` cuidará de fornecer o array vazio.
    companions: z.array(companionSchema),
    pets: z.array(petSchema),

    // Stay
    cabinId: z.string().min(1, "É obrigatório selecionar uma cabana."),
    dates: z.object({
        from: z.date({ message: "Data de check-in é obrigatória." }),
        to: z.date({ message: "Data de check-out é obrigatória." }),
    }),
}).superRefine((data, ctx) => {
    if (!data.isForeigner && !isValidCPF(data.leadGuestDocument)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "CPF inválido.",
            path: ["leadGuestDocument"],
        });
    }
});

// Este tipo agora é a nossa fonte única da verdade.
export type FullStayFormValues = z.infer<typeof fullStaySchema>;