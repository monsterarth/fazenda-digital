"use client";

import React from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { PreCheckIn } from '@/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast, Toaster } from 'sonner';
import { Loader2, PlusCircle, Trash2, Send, PawPrint } from 'lucide-react';

// --- Esquema de Validação com Zod (CORRIGIDO) ---
// Adicionado .default(false) aos campos booleanos para garantir que
// o tipo inferido seja 'boolean' e não 'boolean | undefined', resolvendo o conflito.
const preCheckInSchema = z.object({
  leadGuestCpf: z.string().min(11, "CPF é obrigatório e deve ter 11 dígitos."),
  leadGuestEmail: z.string().email("Forneça um e-mail válido."),
  leadGuestPhone: z.string().min(10, "Forneça um telefone válido com DDD."),
  address: z.string().min(5, "O endereço é obrigatório."),
  estimatedArrivalTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Selecione um horário válido."),
  vehiclePlate: z.string().optional(),
  travelReason: z.string().optional(),
  foodRestrictions: z.string().optional(),
  
  guests: z.array(z.object({ 
    fullName: z.string().min(2, "O nome do hóspede é obrigatório.") 
  })).min(1, "Pelo menos um hóspede (o responsável) é necessário."),

  isBringingPet: z.boolean().default(false),
  petPolicyAgreed: z.boolean().default(false),
}).refine(data => {
    if (data.isBringingPet && !data.petPolicyAgreed) {
        return false;
    }
    return true;
}, {
    message: "Você deve ler e concordar com nossa política para pets.",
    path: ["petPolicyAgreed"],
});

type PreCheckInFormValues = z.infer<typeof preCheckInSchema>;

export default function PreCheckInPage() {
    const form = useForm<PreCheckInFormValues>({
        resolver: zodResolver(preCheckInSchema),
        defaultValues: {
            guests: [{ fullName: '' }],
            isBringingPet: false,
            petPolicyAgreed: false,
            estimatedArrivalTime: '14:00',
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "guests"
    });

    const isBringingPet = form.watch('isBringingPet');

    const onSubmit: SubmitHandler<PreCheckInFormValues> = async (data) => {
        const db = await getFirebaseDb();
        if (!db) {
            toast.error("Erro de conexão. Por favor, tente novamente.");
            return;
        }

        const toastId = toast.loading("Enviando seus dados...");

        try {
            const preCheckInData: Omit<PreCheckIn, 'id' | 'stayId'> = {
                ...data,
                guests: data.guests.map((guest, index) => ({
                    fullName: guest.fullName,
                    isLead: index === 0,
                })),
                status: 'pendente',
                createdAt: firestore.Timestamp.now(),
            };

            await firestore.addDoc(firestore.collection(db, 'preCheckIns'), preCheckInData);

            toast.success("Pré-Check-in enviado com sucesso!", {
                id: toastId,
                description: "Sua solicitação foi recebida e será validada pela nossa equipe.",
            });
            form.reset();

        } catch (error) {
            toast.error("Falha ao enviar o formulário.", {
                id: toastId,
                description: "Por favor, verifique os dados e tente novamente."
            });
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
            <Toaster richColors position="top-center" />
            <Card className="w-full max-w-3xl shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Formulário de Pré-Check-in</CardTitle>
                    <CardDescription>
                        Para agilizar sua chegada, por favor, preencha os dados abaixo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Informações dos Hóspedes</h3>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`guests.${index}.fullName`}
                                            render={({ field }) => (
                                                <FormItem className="flex-grow">
                                                    <FormLabel className={cn(index !== 0 && "sr-only")}>
                                                        {index === 0 ? "Nome Completo do Responsável" : `Acompanhante ${index + 1}`}
                                                    </FormLabel>
                                                    <FormControl><Input placeholder={index === 0 ? "Seu nome completo" : "Nome do acompanhante"} {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {index > 0 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ fullName: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Acompanhante</Button>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Contato e Endereço</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField name="leadGuestEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="leadGuestPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Telefone / WhatsApp</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField name="leadGuestCpf" control={form.control} render={({ field }) => (<FormItem><FormLabel>CPF do Responsável</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField name="address" control={form.control} render={({ field }) => (<FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Input placeholder="Rua, Número, Cidade - Estado" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Detalhes da Chegada e Estadia</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField name="estimatedArrivalTime" control={form.control} render={({ field }) => (<FormItem><FormLabel>Horário Previsto de Chegada</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="vehiclePlate" control={form.control} render={({ field }) => (<FormItem><FormLabel>Placa do Veículo (Opcional)</FormLabel><FormControl><Input placeholder="ABC-1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField name="travelReason" control={form.control} render={({ field }) => (<FormItem><FormLabel>Motivo da Viagem (Opcional)</FormLabel><FormControl><Input placeholder="Ex: Férias, Aniversário, Trabalho..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField name="foodRestrictions" control={form.control} render={({ field }) => (<FormItem><FormLabel>Alergias ou Restrições Alimentares (Opcional)</FormLabel><FormControl><Input placeholder="Ex: Intolerância a lactose, alergia a camarão..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>

                             <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2"><PawPrint className="h-5 w-5"/> Política de Pets</h3>
                                <FormField name="isBringingPet" control={form.control} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Vou levar um pet para a hospedagem.</FormLabel></FormItem>)} />
                                
                                {isBringingPet && (
                                     <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50">
                                         <p className="text-sm text-yellow-800">
                                             Ao marcar esta opção, você deve ler e concordar com nossa <a href="/politica-pet.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Política de Hospedagem de Pets</a>. 
                                             Lembre-se que aceitamos apenas 1 pet de até 15kg por cabana, mediante taxa diária.
                                         </p>
                                         <FormField name="petPolicyAgreed" control={form.control} render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 mt-4">
                                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel className="font-normal">Li e concordo com a Política de Hospedagem de Pets.</FormLabel>
                                                    <FormMessage />
                                                </div>
                                            </FormItem>
                                        )} />
                                     </div>
                                )}
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                                Enviar Pré-Check-in
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}