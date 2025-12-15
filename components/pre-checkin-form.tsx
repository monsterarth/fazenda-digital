"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler, FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { PreCheckIn, Property } from '@/types';
import { cn } from '@/lib/utils';
import { isValidCPF } from '@/lib/validators';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, Toaster } from 'sonner';
import { Loader2, PlusCircle, Trash2, Send, PawPrint, ArrowRight, ArrowLeft, User, Mail, Car, Phone, CheckCircle, Lock, Edit2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { createActivityLog } from '@/lib/activity-logger';
import { completeFastStayAction } from '@/app/actions/complete-fast-stay';

const preCheckInSchema = z.object({
    leadGuestName: z.string().min(3, "O nome completo é obrigatório."),
    isForeigner: z.boolean(),
    leadGuestDocument: z.string().min(3, "O documento é obrigatório."),
    country: z.string().optional(),
    leadGuestEmail: z.string().email("Forneça um e-mail válido."),
    leadGuestPhone: z.string().min(10, "Forneça um telefone válido com DDD.").regex(/^\d+$/, "Apenas números são permitidos."),
    address: z.object({
        cep: z.string().optional(),
        street: z.string().min(3, "O logradouro é obrigatório."),
        number: z.string().min(1, "O número é obrigatório.").regex(/^\d+$/, "Apenas números são permitidos."),
        complement: z.string().optional(),
        neighborhood: z.string().min(2, "O bairro é obrigatório."),
        city: z.string().min(2, "A cidade é obrigatória."),
        state: z.string().min(2, "O estado é obrigatório."),
    }),
    estimatedArrivalTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Selecione um horário válido."),
    knowsVehiclePlate: z.boolean(),
    vehiclePlate: z.string().optional(),
    
    // Schema de Acompanhantes (ACF)
    companions: z.array(z.object({
        fullName: z.string().min(3, "Nome do acompanhante é obrigatório."),
        category: z.enum(['adult', 'child', 'baby'], { required_error: "Selecione a categoria." }),
        cpf: z.string().optional()
    })).optional(),
    
    pets: z.array(z.object({
        id: z.string(),
        name: z.string().min(2, "Nome do pet é obrigatório."),
        species: z.enum(['cachorro', 'gato', 'outro']),
        breed: z.string().min(2, "Raça é obrigatória."),
        weight: z.string().min(1, "Peso é obrigatório."),
        age: z.string().min(1, "Idade é obrigatória."),
        notes: z.string().optional()
    })).optional(),
}).refine(data => {
    if (!data.isForeigner) return isValidCPF(data.leadGuestDocument);
    return true;
}, { message: "CPF inválido.", path: ["leadGuestDocument"] })
.refine(data => {
    if (data.isForeigner && (!data.country || data.country === 'Brasil')) return false;
    return true;
}, { message: "A seleção do país é obrigatória para estrangeiros.", path: ["country"] });

type PreCheckInFormValues = z.infer<typeof preCheckInSchema>;

interface PreCheckinFormProps {
    property: Property;
    prefilledData?: any;
    token?: string;
}

const generateSimpleId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const PreCheckinForm: React.FC<PreCheckinFormProps> = ({ property, prefilledData, token }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
    
    const [isLocked, setIsLocked] = useState(false);
    
    const [countriesList, setCountriesList] = useState<string[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);

    const form = useForm<PreCheckInFormValues>({
        resolver: zodResolver(preCheckInSchema),
        defaultValues: {
            leadGuestName: '', isForeigner: false, leadGuestDocument: '', country: 'Brasil', leadGuestEmail: '', leadGuestPhone: '',
            address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
            estimatedArrivalTime: '16:00', knowsVehiclePlate: true, vehiclePlate: '',
            companions: [], pets: []
        },
    });

    // --- POPULAR CAMPOS E GERAR SLOTS (Lógica Revisada e Corrigida) ---
    useEffect(() => {
        if (prefilledData) {
            console.log("Inicializando formulário. Dados recebidos:", prefilledData);
            
            setIsLocked(true);

            // --- 1. ACOMPANHANTES (HUMANOS) ---
            let initialCompanions = prefilledData.companions || [];

            // Se não houver acompanhantes salvos, mas tivermos a contagem (guestCount)
            if (initialCompanions.length === 0 && prefilledData.guestCount) {
                const { adults = 1, children = 0, babies = 0 } = prefilledData.guestCount;
                
                // O hóspede principal (Lead) é 1 adulto, então subtraímos 1 dos slots de acompanhantes
                const extraAdults = Math.max(0, Number(adults) - 1);
                const childrenCount = Number(children);
                const babiesCount = Number(babies);
                
                const adultSlots = Array.from({ length: extraAdults }).map(() => ({ fullName: '', category: 'adult' as const, cpf: '' }));
                const childSlots = Array.from({ length: childrenCount }).map(() => ({ fullName: '', category: 'child' as const, cpf: '' }));
                const babySlots = Array.from({ length: babiesCount }).map(() => ({ fullName: '', category: 'baby' as const, cpf: '' }));
                
                initialCompanions = [...adultSlots, ...childSlots, ...babySlots];
            }

            // --- 2. PETS (LÓGICA BLINDADA) ---
            let initialPets: any[] = [];
            const rawPets = prefilledData.pets;

            console.log("Processando pets. Valor bruto do documento:", rawPets);

            if (Array.isArray(rawPets)) {
                // Já é uma lista de pets (caso de edição)
                initialPets = rawPets;
            } else {
                // Caso seja número ou string numérica (Fast Stay)
                const petsCount = Number(rawPets);
                if (!isNaN(petsCount) && petsCount > 0) {
                    console.log(`Gerando ${petsCount} slots para pets.`);
                    initialPets = Array.from({ length: petsCount }).map(() => ({
                        id: generateSimpleId(),
                        name: '',
                        species: 'cachorro',
                        breed: '',
                        weight: '',
                        age: '',
                        notes: ''
                    }));
                } else {
                    console.log("Nenhum slot de pet gerado (count é 0 ou inválido).");
                }
            }

            // --- 3. RESET DO FORMULÁRIO ---
            const formData = {
                leadGuestName: prefilledData.guestName || '',
                leadGuestPhone: prefilledData.guestPhone ? prefilledData.guestPhone.replace(/\D/g, '') : '',
                leadGuestDocument: prefilledData.guestId ? prefilledData.guestId.replace(/\D/g, '') : '',
                leadGuestEmail: prefilledData.email || '',
                
                isForeigner: false, 
                country: 'Brasil',
                
                address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
                estimatedArrivalTime: '16:00',
                knowsVehiclePlate: true,
                vehiclePlate: '',
                
                companions: initialCompanions, 
                pets: initialPets
            };

            console.log("Resetando formulário com:", formData);
            form.reset(formData);
        }
    }, [prefilledData, form]);

    const isForeigner = form.watch('isForeigner');
    const arrivalTime = form.watch('estimatedArrivalTime');
    const knowsPlate = form.watch('knowsVehiclePlate');

    const { fields: companions, append: appendCompanion, remove: removeCompanion } = useFieldArray({ control: form.control, name: "companions" });
    const { fields: pets, append: appendPet, remove: removePet } = useFieldArray({ control: form.control, name: "pets" });

    const petValues = form.watch('pets');
    const petPolicyViolations = {
        count: petValues ? petValues.length > 1 : false,
        weight: petValues ? petValues.some(p => parseFloat(p.weight) > 15) : false,
    };

    const totalSteps = 4;
    const delta = 100 / totalSteps;
    
    const stepsFields: FieldPath<PreCheckInFormValues>[][] = [
        ['leadGuestName', 'isForeigner', 'leadGuestDocument', 'country'],
        ['leadGuestEmail', 'leadGuestPhone', 'address'],
        ['estimatedArrivalTime', 'knowsVehiclePlate', 'vehiclePlate'],
        ['companions', 'pets']
    ];

    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoadingCountries(true);
            try {
                const response = await fetch('https://restcountries.com/v3.1/all?fields=name,translations');
                if (!response.ok) throw new Error('Falha ao buscar países da API');
                const data: { name: { common: string }, translations: { por?: { common: string } } }[] = await response.json();
                const names = data.map(country => 
                    country.translations.por?.common || country.name.common
                ).sort((a, b) => a.localeCompare(b, 'pt', { sensitivity: 'base' })); 
                setCountriesList(names);
            } catch (error) {
                setCountriesList(["Brasil", "Outro"]);
            } finally {
                setIsLoadingCountries(false);
            }
        };
        fetchCountries();
    }, []); 

    const handleNextStep = async () => {
        const fieldsToValidate = stepsFields[currentStep];
        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) setCurrentStep(prev => prev + 1);
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
            if (data.erro) { toast.error("CEP não encontrado."); return; }
            form.setValue('address.street', data.logradouro);
            form.setValue('address.neighborhood', data.bairro);
            form.setValue('address.city', data.localidade);
            form.setValue('address.state', data.uf);
            document.getElementById('address.number')?.focus();
        } catch (error) { toast.error("Falha ao buscar o CEP."); } finally { setIsLoadingCep(false); }
    };
    
    const onSubmit: SubmitHandler<PreCheckInFormValues> = async (data) => {
        const toastId = toast.loading("Enviando seus dados...");
        try {
            if (token) {
                const result = await completeFastStayAction(token, data);
                if (result.success) {
                    toast.dismiss(toastId);
                    setIsSubmitSuccessful(true);
                } else {
                    toast.error("Erro ao processar", { id: toastId, description: result.message });
                }
                return;
            }

            const db = await getFirebaseDb();
            if (!db) { toast.error("Erro de conexão."); return; }

            const { country, ...restOfData } = data;
            const preCheckInData: Omit<PreCheckIn, 'id' | 'stayId'> = {
                ...restOfData,
                address: { ...data.address, country: isForeigner ? data.country || '' : 'Brasil' },
                pets: data.pets?.map(p => ({ ...p, weight: parseFloat(p.weight) || 0 })) || [],
                // @ts-ignore
                companions: data.companions?.filter(c => c.fullName.trim() !== '').map(c => ({
                    ...c, 
                    category: c.category 
                })) || [],
                status: 'pendente',
                createdAt: firestore.Timestamp.now(),
            };
            await firestore.addDoc(firestore.collection(db, 'preCheckIns'), preCheckInData);
            await createActivityLog({ type: 'checkin_submitted', actor: { type: 'guest', identifier: data.leadGuestName }, details: `Novo pré-check-in de ${data.leadGuestName}.`, link: '/admin/stays' });
            toast.dismiss(toastId);
            setIsSubmitSuccessful(true);
        } catch (error) {
            console.error(error);
            toast.error("Falha ao enviar.", { id: toastId });
        }
    };
    
    if (isSubmitSuccessful) {
        return (
            <Card className="w-full max-w-2xl shadow-xl text-center">
                <CardHeader>
                    {property?.logoUrl && <Image src={property.logoUrl} alt="Logo" width={96} height={96} className="mx-auto mb-4" />}
                    <div className="mx-auto bg-green-100 rounded-full p-3 w-fit"><CheckCircle className="h-10 w-10 text-green-600" /></div>
                    <CardTitle className="text-3xl mt-4">{property?.messages.preCheckInSuccessTitle || "Tudo Certo!"}</CardTitle>
                    <CardDescription>{property?.messages.preCheckInSuccessSubtitle || "Seu pré-check-in foi enviado com sucesso."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Caso tenha qualquer dúvida, não hesite em nos contatar.</p>
                    <Button asChild size="lg" className="mt-6">
                        <a href={`https://wa.me/${(property as any).phone || '554899632985'}`} target="_blank" rel="noopener noreferrer">
                            <Phone className="mr-2 h-4 w-4" /> Entrar em contato
                        </a>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-2xl shadow-xl">
             <Toaster richColors position="top-center" />
            <CardContent className="pt-6">
                <div className="mb-4">
                    <Progress value={(currentStep + 1) * delta} className="w-full" />
                    <p className="text-center text-sm text-muted-foreground mt-2">Etapa {currentStep + 1} de {totalSteps}</p>
                </div>

                <Form {...form}>
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                        {currentStep === 0 && (
                            <div className="space-y-4 animate-in fade-in-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2"><User />Informações do Responsável</h3>
                                    {isLocked && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsLocked(false)}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                            <Edit2 className="h-4 w-4 mr-2" /> Alterar Dados
                                        </Button>
                                    )}
                                </div>

                                {isLocked && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start gap-3 text-sm text-blue-800">
                                        <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold">Dados confirmados</p>
                                            <p>Já preenchemos com o que temos no sistema. Se precisar corrigir, clique em "Alterar Dados".</p>
                                        </div>
                                    </div>
                                )}

                                <FormField name="leadGuestName" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Seu nome completo" {...field} disabled={isLocked} className={isLocked ? "bg-gray-100 text-gray-600" : ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                
                                <FormField name="isForeigner" control={form.control} render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLocked} />
                                        </FormControl>
                                        <FormLabel className="font-normal">Sou estrangeiro / I'm a foreigner</FormLabel>
                                    </FormItem>
                                )} />
                                
                                {isForeigner ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="country" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>País</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCountries || isLocked}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                    <SelectContent className="max-h-[20rem] overflow-y-auto">{countriesList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="leadGuestDocument" control={form.control} render={({ field }) => (<FormItem><FormLabel>Documento</FormLabel><FormControl><Input placeholder="Passaporte" {...field} disabled={isLocked} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                ) : (
                                    <FormField name="leadGuestDocument" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPF</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    placeholder="000.000.000-00" 
                                                    {...field} 
                                                    disabled={isLocked} 
                                                    className={isLocked ? "bg-gray-100 text-gray-600" : ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                )}
                            </div>
                        )}
                        {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in-0">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><Mail />Contato e Endereço</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField name="leadGuestEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="leadGuestPhone" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone / WhatsApp</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="tel" 
                                                    placeholder="(XX) XXXXX-XXXX" 
                                                    {...field} 
                                                    disabled={isLocked} 
                                                    className={isLocked ? "bg-gray-100 text-gray-600" : ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField name="address.cep" control={form.control} render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} onBlur={(e) => handleCepLookup(e.target.value)} /></FormControl>{isLoadingCep && <p className='text-sm text-muted-foreground'>Buscando...</p>}<FormMessage /></FormItem>)} />
                                    <FormField name="address.street" control={form.control} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Avenida..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <FormField name="address.number" control={form.control} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input id="address.number" placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField name="address.complement" control={form.control} render={({ field }) => (<FormItem><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Apto, Bloco..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField name="address.neighborhood" control={form.control} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Seu bairro" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField name="address.city" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="Sua cidade" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="address.state" control={form.control} render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><FormControl><Input placeholder="UF" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 </div>
                            </div>
                        )}
                        {currentStep === 2 && (
                             <div className="space-y-4 animate-in fade-in-0">
                                 <h3 className="text-lg font-semibold flex items-center gap-2"><Car />Detalhes da Chegada</h3>
                                 <p className="text-sm text-muted-foreground">Nos informe os detalhes para uma recepção tranquila.</p>
                                <FormField name="estimatedArrivalTime" control={form.control} render={({ field }) => (<FormItem><FormLabel>Horário Previsto de Chegada</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 {arrivalTime && arrivalTime < "16:00" && (<div className="p-3 text-sm text-blue-800 bg-blue-50 border-l-4 border-blue-500 rounded-r-md">Nosso check-in padrão é às 16h, mas faremos o possível para liberar sua cabana antes.</div>)}
                                 {arrivalTime && arrivalTime > "20:30" && (<div className="p-3 text-sm text-orange-800 bg-orange-50 border-l-4 border-orange-500 rounded-r-md">Nossa recepção encerra às 20:30h. Após este horário, nossa guarita 24h estará pronta para recebê-lo(a).</div>)}
                                <div className="flex items-end gap-4">
                                    <FormField name="vehiclePlate" control={form.control} render={({ field }) => (<FormItem className="flex-grow"><FormLabel>Placa do Veículo</FormLabel><FormControl><Input placeholder="ABC-1234" {...field} disabled={!knowsPlate} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="knowsVehiclePlate" control={form.control} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2"><FormControl><Checkbox checked={!field.value} onCheckedChange={(checked) => field.onChange(!checked)} /></FormControl><FormLabel className="font-normal text-sm">Não sei / Sem carro</FormLabel></FormItem>)} />
                                </div>
                            </div>
                        )}
                        {currentStep === 3 && (
                               <div className="space-y-6 animate-in fade-in-0">
                                    <div>
                                        <h3 className="text-lg font-semibold border-b pb-2 mb-4">Acompanhantes</h3>
                                        {companions.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end mb-2">
                                                {/* CAMPO NOME */}
                                                <FormField control={form.control} name={`companions.${index}.fullName`} render={({ field }) => (
                                                    <FormItem className="col-span-5">
                                                        <FormLabel className={cn(index !== 0 && "sr-only")}>Nome</FormLabel>
                                                        <FormControl><Input placeholder={`Acompanhante ${index + 1}`} {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                
                                                {/* CAMPO CATEGORIA (ACF) */}
                                                <FormField control={form.control} name={`companions.${index}.category`} render={({ field }) => (
                                                    <FormItem className="col-span-4">
                                                        <FormLabel className={cn(index !== 0 && "sr-only")}>Categoria</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecione" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="adult">Adulto (+18)</SelectItem>
                                                                <SelectItem value="child">Criança (6-17)</SelectItem>
                                                                <SelectItem value="baby">Free (0-5)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />

                                                {/* CAMPO CPF */}
                                                <FormField control={form.control} name={`companions.${index}.cpf`} render={({ field }) => (
                                                    <FormItem className="col-span-2">
                                                        <FormLabel className={cn(index !== 0 && "sr-only")}>CPF</FormLabel>
                                                        <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                
                                                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => removeCompanion(index)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendCompanion({ fullName: '', category: 'adult', cpf: ''})}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Acompanhante
                                        </Button>
                                    </div>
                                    <div>
                                         <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><PawPrint />Pets</h3>
                                         {pets.map((field, index) => (
                                              <div key={field.id} className="p-4 border rounded-md mb-4 space-y-4 relative">
                                                  <h4 className="font-medium">Pet {index + 1}</h4>
                                                  <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removePet(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      <FormField name={`pets.${index}.name`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome do Pet</FormLabel><FormControl><Input placeholder="Nome" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                      <FormField name={`pets.${index}.species`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Espécie</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="cachorro">Cachorro</SelectItem><SelectItem value="gato">Gato</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                                  </div>
                                                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                      <FormField name={`pets.${index}.breed`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Raça</FormLabel><FormControl><Input placeholder="Ex: Vira-lata" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                      <FormField name={`pets.${index}.age`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Idade</FormLabel><FormControl><Input placeholder="Ex: 2 anos" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                      <FormField name={`pets.${index}.weight`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" placeholder="Ex: 10" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                  </div>
                                              </div>
                                         ))}
                                         <Button type="button" variant="outline" size="sm" onClick={() => appendPet({ id: generateSimpleId(), name: '', species: 'cachorro', breed: '', weight: '', age: '', notes: ''})}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pet</Button>
                                         {petPolicyViolations.count && (<div className="p-3 mt-4 text-sm text-red-800 bg-red-100 border-l-4 border-red-500 rounded-r-md"><p className="font-semibold">Atenção: Limite de pets excedido</p><p>Nossa política permite apenas 1 pet por cabana. Por favor, <a href="#" className="font-bold underline">entre em contato</a>.</p></div>)}
                                         {petPolicyViolations.weight && (<div className="p-3 mt-4 text-sm text-red-800 bg-red-100 border-l-4 border-red-500 rounded-r-md"><p className="font-semibold">Atenção: Peso acima do limite</p><p>Nosso limite é de 15kg por pet. Por favor, <a href="#" className="font-bold underline">entre em contato</a>.</p></div>)}
                                    </div>
                                 </div>
                               )}
                        <div className="flex justify-between items-center pt-4">
                            {currentStep > 0 ? (<Button type="button" variant="ghost" onClick={handlePrevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>) : <div />}
                            {currentStep < totalSteps - 1 ? (<Button type="button" onClick={handleNextStep}>Avançar <ArrowRight className="ml-2 h-4 w-4" /></Button>) : (<Button type="button" size="lg" disabled={form.formState.isSubmitting} onClick={form.handleSubmit(onSubmit)}>{form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>} Enviar</Button>)}
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}