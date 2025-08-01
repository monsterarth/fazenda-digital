"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray, SubmitHandler, FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { PreCheckIn } from '@/types';
import { cn } from '@/lib/utils';
import { isValidCPF } from '@/lib/validators';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, Toaster } from 'sonner';
import { Loader2, PlusCircle, Trash2, Send, PawPrint, ArrowRight, ArrowLeft, User, Mail, Home, Car, Phone } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Zod Schema Corrigido e Refinado
const preCheckInSchema = z.object({
    // Etapa 1
    leadGuestName: z.string().min(3, "O nome completo é obrigatório."),
    isForeigner: z.boolean(),
    leadGuestDocument: z.string().min(3, "O documento é obrigatório."),
    country: z.string().optional(),

    // Etapa 2
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
    }),

    // Etapa 3
    estimatedArrivalTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Selecione um horário válido."),
    knowsVehiclePlate: z.boolean(),
    vehiclePlate: z.string().optional(),

    // Etapa 4
    companions: z.array(z.object({
        fullName: z.string().min(3, "Nome do acompanhante é obrigatório."),
        age: z.coerce.number().positive("Idade inválida."),
        cpf: z.string().optional()
    })).optional(),
    pets: z.array(z.object({
        id: z.string(),
        name: z.string().min(2, "Nome do pet é obrigatório."),
        species: z.enum(['cachorro', 'gato', 'outro'], { required_error: "A espécie é obrigatória."}),
        breed: z.string().min(2, "Raça é obrigatória."),
        weight: z.coerce.number().positive("Peso inválido."),
        age: z.string().min(1, "Idade é obrigatória."),
        notes: z.string().optional()
    })).optional(),

}).refine(data => {
    if (!data.isForeigner) {
        return isValidCPF(data.leadGuestDocument);
    }
    return true;
}, {
    message: "CPF inválido.",
    path: ["leadGuestDocument"],
}).refine(data => {
    if (data.isForeigner && !data.country) {
        return false;
    }
    return true;
}, {
    message: "A seleção do país é obrigatória para estrangeiros.",
    path: ["country"],
});


type PreCheckInFormValues = z.infer<typeof preCheckInSchema>;

// Mock - No futuro, isso viria do Firestore
const countries = ["Argentina", "Uruguai", "Chile", "Estados Unidos", "Portugal", "Alemanha"];

export default function PreCheckInPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoadingCep, setIsLoadingCep] = useState(false);

    const form = useForm<PreCheckInFormValues>({
        resolver: zodResolver(preCheckInSchema),
        defaultValues: {
            leadGuestName: '',
            isForeigner: false,
            leadGuestDocument: '',
            country: 'Brasil',
            leadGuestEmail: '',
            leadGuestPhone: '',
            address: {
                cep: '',
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                state: '',
            },
            estimatedArrivalTime: '16:00',
            knowsVehiclePlate: true,
            vehiclePlate: '',
            companions: [],
            pets: []
        },
    });

    const isForeigner = form.watch('isForeigner');
    const arrivalTime = form.watch('estimatedArrivalTime');
    const knowsPlate = form.watch('knowsVehiclePlate');

    const { fields: companions, append: appendCompanion, remove: removeCompanion } = useFieldArray({ control: form.control, name: "companions" });
    const { fields: pets, append: appendPet, remove: removePet } = useFieldArray({ control: form.control, name: "pets" });

    const petValues = form.watch('pets');
    const petPolicyViolations = {
        count: petValues ? petValues.length > 1 : false,
        weight: petValues ? petValues.some(p => p.weight > 15) : false,
    };

    const totalSteps = 4;
    const delta = 100 / totalSteps;
    
    const stepsFields: FieldPath<PreCheckInFormValues>[][] = [
        ['leadGuestName', 'isForeigner', 'leadGuestDocument', 'country'],
        ['leadGuestEmail', 'leadGuestPhone', 'address'],
        ['estimatedArrivalTime', 'knowsVehiclePlate', 'vehiclePlate'],
        ['companions', 'pets']
    ];

    const handleNextStep = async () => {
        const fieldsToValidate = stepsFields[currentStep];
        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep(prev => prev + 1);
        }
    };
    
    const handlePrevStep = () => setCurrentStep(prev => prev - 1);

    const handleCepLookup = async (cep: string) => {
        if (isForeigner) return;

        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        
        setIsLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (data.erro) {
                toast.error("CEP não encontrado.");
                return;
            }
            form.setValue('address.street', data.logradouro);
            form.setValue('address.neighborhood', data.bairro);
            form.setValue('address.city', data.localidade);
            form.setValue('address.state', data.uf);
            document.getElementById('address.number')?.focus();
        } catch (error) {
            toast.error("Falha ao buscar o CEP.");
        } finally {
            setIsLoadingCep(false);
        }
    };
    
    const onSubmit: SubmitHandler<PreCheckInFormValues> = async (data) => {
        // Lógica de envio final para o Firebase...
        console.log(data);
        toast.success("Formulário enviado com sucesso!");
    };

    return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
            <Toaster richColors position="top-center" />
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Formulário de Pré-Check-in</CardTitle>
                    <CardDescription>
                       {/* Mensagem customizável aqui */}
                       Acelere sua chegada! Preencher este formulário simplifica o processo na recepção, permitindo que você pule a burocracia e comece a relaxar mais cedo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Progress value={(currentStep + 1) * delta} className="w-full" />
                         <p className="text-center text-sm text-muted-foreground mt-2">Etapa {currentStep + 1} de {totalSteps}</p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            
                            {currentStep === 0 && (
                                <div className="space-y-4 animate-in fade-in-0">
                                    <h3 className="text-lg font-semibold flex items-center gap-2"><User />Informações do Responsável</h3>
                                    <FormField name="leadGuestName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="isForeigner" control={form.control} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Sou estrangeiro / I'm a foreigner</FormLabel></FormItem>)} />
                                    {isForeigner ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField name="country" control={form.control} render={({ field }) => (<FormItem><FormLabel>País</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione seu país..." /></SelectTrigger></FormControl><SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                            <FormField name="leadGuestDocument" control={form.control} render={({ field }) => (<FormItem><FormLabel>Passaporte / Documento</FormLabel><FormControl><Input placeholder="Número do documento" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    ) : (
                                        <FormField name="leadGuestDocument" control={form.control} render={({ field }) => (<FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    )}
                                </div>
                            )}

                             {currentStep === 1 && (
                                <div className="space-y-4 animate-in fade-in-0">
                                    <h3 className="text-lg font-semibold flex items-center gap-2"><Mail />Contato e Endereço</h3>
                                     <p className="text-sm text-muted-foreground">Estas informações são necessárias para o envio de detalhes sobre sua reserva e para a emissão da Nota Fiscal.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="leadGuestEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name="leadGuestPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Telefone / WhatsApp</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="address.cep" control={form.control} render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel>CEP / ZIP Code</FormLabel><FormControl><Input placeholder="00000-000" {...field} onBlur={(e) => handleCepLookup(e.target.value)} /></FormControl>{isLoadingCep && <p className='text-sm text-muted-foreground'>Buscando...</p>}<FormMessage /></FormItem>)} />
                                        <FormField name="address.street" control={form.control} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Avenida..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                         <FormField name="address.number" control={form.control} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input id="address.number" placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField name="address.complement" control={form.control} render={({ field }) => (<FormItem><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Apto, Bloco..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField name="address.neighborhood" control={form.control} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Seu bairro" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="address.city" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Sua cidade" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name="address.state" control={form.control} render={({ field }) => (<FormItem><FormLabel>Estado / Província</FormLabel><FormControl><Input placeholder="UF" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     </div>
                                </div>
                            )}

                             {currentStep === 2 && (
                                <div className="space-y-4 animate-in fade-in-0">
                                     <h3 className="text-lg font-semibold flex items-center gap-2"><Car />Detalhes da Chegada</h3>
                                     <p className="text-sm text-muted-foreground">Para que nossa recepção possa te esperar com um café quentinho, por favor, nos dê alguns detalhes.</p>
                                    <FormField name="estimatedArrivalTime" control={form.control} render={({ field }) => (<FormItem><FormLabel>Horário Previsto de Chegada</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     {arrivalTime && arrivalTime < "16:00" && (
                                         <div className="p-3 text-sm text-blue-800 bg-blue-50 border-l-4 border-blue-500 rounded-r-md">
                                             Nosso check-in padrão é às 16h, mas faremos o possível para liberar sua cabana antes. Caso deseje garantir um early check-in, por favor, entre em contato com a recepção.
                                         </div>
                                     )}
                                     {arrivalTime && arrivalTime > "20:30" && (
                                         <div className="p-3 text-sm text-orange-800 bg-orange-50 border-l-4 border-orange-500 rounded-r-md">
                                             Nossa recepção encerra às 20:30h. Após este horário, nossa guarita 24h estará pronta para recebê-lo(a) da melhor maneira.
                                         </div>
                                     )}
                                    <div className="flex items-end gap-4">
                                        <FormField name="vehiclePlate" control={form.control} render={({ field }) => (<FormItem className="flex-grow"><FormLabel>Placa do Veículo</FormLabel><FormControl><Input placeholder="ABC-1234" {...field} disabled={!knowsPlate} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name="knowsVehiclePlate" control={form.control} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2"><FormControl><Checkbox checked={!field.value} onCheckedChange={(checked) => field.onChange(!checked)} /></FormControl><FormLabel className="font-normal text-sm">Não sei / Vou sem carro</FormLabel></FormItem>)} />
                                    </div>
                                </div>
                             )}

                            {currentStep === 3 && (
                                 <div className="space-y-6 animate-in fade-in-0">
                                     <div>
                                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Acompanhantes</h3>
                                        {companions.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end mb-2">
                                                <FormField control={form.control} name={`companions.${index}.fullName`} render={({ field }) => (<FormItem className="col-span-6"><FormLabel className={cn(index !== 0 && "sr-only")}>Nome Completo</FormLabel><FormControl><Input placeholder={`Acompanhante ${index + 1}`} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`companions.${index}.age`} render={({ field }) => (<FormItem className="col-span-2"><FormLabel className={cn(index !== 0 && "sr-only")}>Idade</FormLabel><FormControl><Input type="number" placeholder="Idade" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={form.control} name={`companions.${index}.cpf`} render={({ field }) => (<FormItem className="col-span-3"><FormLabel className={cn(index !== 0 && "sr-only")}>CPF (Opcional)</FormLabel><FormControl><Input placeholder="CPF (Opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => removeCompanion(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendCompanion({ fullName: '', age: 0, cpf: ''})}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Acompanhante</Button>
                                     </div>
                                     <div>
                                         <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><PawPrint />Pets</h3>
                                        {pets.map((field, index) => (
                                            <div key={field.id} className="p-4 border rounded-md mb-4 space-y-4 relative">
                                                <h4 className="font-medium">Pet {index + 1}</h4>
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removePet(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField name={`pets.${index}.name`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome do Pet</FormLabel><FormControl><Input placeholder="Nome do seu pet" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField name={`pets.${index}.species`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Espécie</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="cachorro">Cachorro</SelectItem><SelectItem value="gato">Gato</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                                </div>
                                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <FormField name={`pets.${index}.breed`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Raça</FormLabel><FormControl><Input placeholder="Ex: Vira-lata" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField name={`pets.${index}.age`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Idade</FormLabel><FormControl><Input placeholder="Ex: 2 anos" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                    <FormField name={`pets.${index}.weight`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" placeholder="Ex: 10" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                 </div>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendPet({ id: crypto.randomUUID(), name: '', species: 'cachorro', breed: '', weight: 0, age: '', notes: ''})}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pet</Button>
                                        
                                        {petPolicyViolations.count && (
                                            <div className="p-3 mt-4 text-sm text-red-800 bg-red-100 border-l-4 border-red-500 rounded-r-md">
                                                <p className="font-semibold">Atenção: Limite de pets excedido</p>
                                                <p>Nossa política permite apenas 1 pet por cabana. Por favor, <a href="https://wa.me/SEUNUMERO" target="_blank" rel="noopener noreferrer" className="font-bold underline flex items-center gap-1">entre em contato via WhatsApp <Phone className="h-3 w-3"/></a> para verificarmos a possibilidade de uma exceção.</p>
                                            </div>
                                        )}
                                        {petPolicyViolations.weight && (
                                             <div className="p-3 mt-4 text-sm text-red-800 bg-red-100 border-l-4 border-red-500 rounded-r-md">
                                                <p className="font-semibold">Atenção: Peso acima do limite</p>
                                                <p>Nosso limite é de 15kg por pet. Por favor, <a href="https://wa.me/SEUNUMERO" target="_blank" rel="noopener noreferrer" className="font-bold underline flex items-center gap-1">entre em contato via WhatsApp <Phone className="h-3 w-3"/></a> para verificarmos a possibilidade de uma exceção.</p>
                                            </div>
                                        )}
                                     </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4">
                                {currentStep > 0 ? (
                                    <Button type="button" variant="ghost" onClick={handlePrevStep}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                                    </Button>
                                ) : <div />}

                                {currentStep < totalSteps - 1 ? (
                                    <Button type="button" onClick={handleNextStep}>
                                        Avançar <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                                        Enviar Pré-Check-in
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}