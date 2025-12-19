"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as firestore from 'firebase/firestore';
import { Property } from '@/types';
import { isValidCPF } from '@/lib/validators';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast, Toaster } from 'sonner';
import { 
    Loader2, Plus, Trash2, PawPrint, ArrowRight, ArrowLeft, 
    User, MapPin, Car, Phone, CheckCircle2, Users, FileText, AlertTriangle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { completeFastStayAction } from '@/app/actions/complete-fast-stay';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

// --- SCHEMA VALIDATION ---
const preCheckInSchema = z.object({
    leadGuestName: z.string().min(3, "Nome completo é obrigatório"),
    isForeigner: z.boolean(),
    leadGuestDocument: z.string().min(3, "Documento é obrigatório"),
    country: z.string().optional(),
    leadGuestEmail: z.string().email("E-mail inválido"),
    leadGuestPhone: z.string().min(10, "Telefone inválido (com DDD)").regex(/^\d+$/, "Apenas números"),
    
    address: z.object({
        cep: z.string().optional(),
        street: z.string().min(3, "Rua obrigatória"),
        number: z.string().min(1, "Número obrigatório"),
        complement: z.string().optional(),
        neighborhood: z.string().min(2, "Bairro obrigatório"),
        city: z.string().min(2, "Cidade obrigatória"),
        state: z.string().min(2, "Estado obrigatório"),
    }),
    
    estimatedArrivalTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Horário inválido"),
    knowsVehiclePlate: z.boolean(),
    vehiclePlate: z.string().optional(),
    travelReason: z.string().optional(),

    companions: z.array(z.object({
        fullName: z.string().min(2, "Nome é obrigatório"),
        category: z.enum(['adult', 'child', 'baby'], { required_error: "Selecione" }),
        cpf: z.string().optional()
    })).optional(),
    
    pets: z.array(z.object({
        id: z.string(),
        name: z.string().min(2, "Nome é obrigatório"),
        species: z.enum(['cachorro', 'gato', 'outro'], { required_error: "Selecione" }),
        breed: z.string().optional(),
        weight: z.string().min(1, "Peso é obrigatório"),
        age: z.string().optional(),
        notes: z.string().optional()
    })).optional(),
}).refine(data => {
    if (!data.isForeigner) return isValidCPF(data.leadGuestDocument);
    return true;
}, { message: "CPF inválido", path: ["leadGuestDocument"] });

type PreCheckInFormValues = z.infer<typeof preCheckInSchema>;

interface PreCheckinFormProps {
    property: Property;
    prefilledData?: any;
    token?: string;
}

const generateSimpleId = () => Math.random().toString(36).substr(2, 9);

// Helper para extrair texto de política com segurança
const getPolicyText = (policyData: any): string => {
    if (!policyData) return "";
    if (typeof policyData === 'string') return policyData;
    if (policyData.content) return policyData.content;
    return "";
};

export const PreCheckinForm: React.FC<PreCheckinFormProps> = ({ property, prefilledData, token }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
    const [countriesList, setCountriesList] = useState<string[]>([]);
    
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [agreedGeneral, setAgreedGeneral] = useState(false);
    const [agreedPet, setAgreedPet] = useState(false);
    
    const form = useForm<PreCheckInFormValues>({
        resolver: zodResolver(preCheckInSchema),
        defaultValues: {
            leadGuestName: '', isForeigner: false, leadGuestDocument: '', country: 'Brasil', 
            leadGuestEmail: '', leadGuestPhone: '',
            address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
            estimatedArrivalTime: '16:00', knowsVehiclePlate: true, vehiclePlate: '', travelReason: '',
            companions: [], pets: []
        },
        mode: 'onChange'
    });

    const { fields: companions, append: appendCompanion, remove: removeCompanion } = useFieldArray({ control: form.control, name: "companions" });
    const { fields: pets, append: appendPet, remove: removePet } = useFieldArray({ control: form.control, name: "pets" });

    const currentPets = form.watch('pets') || [];
    const hasPetWarning = currentPets.length > 1 || currentPets.some(p => parseFloat(p.weight || '0') > 15);

    useEffect(() => {
        if (prefilledData) {
            const initialCompanions = prefilledData.companions || [];
            
            if (initialCompanions.length === 0 && prefilledData.guestCount) {
                const { adults = 1, children = 0, babies = 0 } = prefilledData.guestCount;
                const extraAdults = Math.max(0, Number(adults) - 1);
                for(let i=0; i<extraAdults; i++) initialCompanions.push({ fullName: '', category: 'adult', cpf: '' });
                for(let i=0; i<Number(children); i++) initialCompanions.push({ fullName: '', category: 'child', cpf: '' });
                for(let i=0; i<Number(babies); i++) initialCompanions.push({ fullName: '', category: 'baby', cpf: '' });
            }

            let initialPets = [];
            if (Array.isArray(prefilledData.pets)) {
                initialPets = prefilledData.pets;
            } else if (Number(prefilledData.pets) > 0) {
                for(let i=0; i<Number(prefilledData.pets); i++) {
                    initialPets.push({ id: generateSimpleId(), name: '', species: 'cachorro', breed: '', weight: '', age: '' });
                }
            }

            form.reset({
                leadGuestName: prefilledData.guestName || '',
                leadGuestPhone: prefilledData.guestPhone?.replace(/\D/g, '') || '',
                leadGuestEmail: prefilledData.email || '',
                leadGuestDocument: prefilledData.guestId?.replace(/\D/g, '') || '',
                isForeigner: false, country: 'Brasil',
                address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
                estimatedArrivalTime: '16:00', knowsVehiclePlate: true, vehiclePlate: '',
                companions: initialCompanions,
                pets: initialPets
            });
        }
    }, [prefilledData, form, property]);

    useEffect(() => {
        fetch('https://restcountries.com/v3.1/all?fields=name,translations')
            .then(res => res.json())
            .then(data => {
                const names = data.map((c: any) => c.translations.por?.common || c.name.common).sort();
                setCountriesList(names);
            })
            .catch(() => setCountriesList(["Brasil", "Outro"]));
    }, []);

    const handleCepLookup = async (cep: string) => {
        if (form.watch('isForeigner')) return;
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        setIsLoadingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                form.setValue('address.street', data.logradouro);
                form.setValue('address.neighborhood', data.bairro);
                form.setValue('address.city', data.localidade);
                form.setValue('address.state', data.uf);
                document.getElementById('address-number')?.focus();
            } else {
                toast.error("CEP não encontrado");
            }
        } catch {
            toast.error("Erro ao buscar CEP");
        } finally {
            setIsLoadingCep(false);
        }
    };

    const steps = [
        { id: 0, title: "Você", icon: User, fields: ['leadGuestName', 'leadGuestDocument', 'leadGuestPhone', 'leadGuestEmail', 'isForeigner', 'country'] },
        { id: 1, title: "Endereço", icon: MapPin, fields: ['address.cep', 'address.street', 'address.number', 'address.neighborhood', 'address.city', 'address.state'] },
        { id: 2, title: "Chegada", icon: Car, fields: ['estimatedArrivalTime', 'vehiclePlate'] },
        { id: 3, title: "Acompanhantes", icon: Users, fields: ['companions', 'pets'] }
    ];

    const handleNext = async () => {
        const fields = steps[currentStep].fields as any;
        const isValid = await form.trigger(fields);
        if (isValid) setCurrentStep(prev => prev + 1);
    };

    const handlePreSubmit = async () => {
        const isValid = await form.trigger();
        if (!isValid) {
            toast.error("Verifique os campos obrigatórios em vermelho.");
            return;
        }
        setIsPolicyModalOpen(true);
    };

    const handleFinalSubmit = async () => {
        const data = form.getValues();
        const toastId = toast.loading("Enviando...");
        setIsPolicyModalOpen(false);
        try {
            const now = new Date();
            const policiesAccepted: any = { general: firestore.Timestamp.fromDate(now) };
            if (data.pets && data.pets.length > 0) {
                policiesAccepted.pet = firestore.Timestamp.fromDate(now);
            }
            const payload = { ...data, policiesAccepted };
            if (token) {
                const res = await completeFastStayAction(token, payload);
                if (res.success) setIsSubmitSuccessful(true);
                else throw new Error(res.message);
            }
            toast.dismiss(toastId);
        } catch (error: any) {
            toast.error(error.message || "Erro ao enviar");
        }
    };

    if (isSubmitSuccessful) {
        return (
            <Card className="w-full max-w-lg mx-auto shadow-2xl border-green-100 bg-white">
                <CardHeader className="text-center pt-10 pb-6">
                    <div className="mx-auto bg-green-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-800">Check-in Confirmado!</CardTitle>
                    <CardDescription className="text-lg">Tudo pronto para sua chegada.</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-10">
                    <p className="text-slate-600 mb-6">Recebemos seus dados. Se precisar de algo, nosso time está à disposição.</p>
                    <Button className="bg-green-600 hover:bg-green-700 w-full" onClick={() => window.location.href = `https://wa.me/554899632985`}>
                        <Phone className="w-4 h-4 mr-2" /> Falar com a Recepção
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // EXTRAÇÃO DE POLÍTICAS COM FALLBACK
    const generalPolicyContent = getPolicyText(property?.policies?.general) || "Política geral não encontrada. Consulte a recepção.";
    const petPolicyContent = getPolicyText(property?.policies?.pet) || "Política pet não encontrada. Consulte a recepção.";
    const hasPets = currentPets.length > 0;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <Toaster richColors position="top-center" />
            
            <div className="text-center mb-8">
                {property.logoUrl && <Image src={property.logoUrl} alt="Logo" width={80} height={80} className="mx-auto mb-4" />}
                <h1 className="text-2xl font-bold text-slate-800">Pré-Check-in Digital</h1>
                <p className="text-slate-500 text-sm">Preencha antecipadamente e agilize sua entrada.</p>
            </div>

            <div className="mb-8">
                <Progress value={(currentStep + 1) * 25} className="h-2" />
                <div className="flex justify-between mt-2 px-1">
                    {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = idx === currentStep;
                        const isCompleted = idx < currentStep;
                        return (
                            <div key={idx} className={cn("flex flex-col items-center gap-1 transition-all duration-300", isActive ? "text-blue-600 scale-110" : isCompleted ? "text-green-600" : "text-slate-300")}>
                                <div className={cn("p-2 rounded-full", isActive ? "bg-blue-100" : isCompleted ? "bg-green-100" : "bg-slate-100")}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-semibold uppercase hidden sm:block">{step.title}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={(e) => e.preventDefault()}>
                    <Card className="shadow-lg border-0 overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b pb-4">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                {React.createElement(steps[currentStep].icon, { className: "w-6 h-6 text-blue-600" })}
                                {steps[currentStep].title}
                            </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="p-6 space-y-6">
                            
                            {/* --- ETAPA 0: DADOS PESSOAIS --- */}
                            {currentStep === 0 && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                                    <FormField control={form.control} name="leadGuestName" render={({ field }) => (
                                        <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Como está no documento" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="leadGuestDocument" render={({ field }) => (
                                            <FormItem><FormLabel>CPF / Documento</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="leadGuestPhone" render={({ field }) => (
                                            <FormItem><FormLabel>WhatsApp / Celular</FormLabel><FormControl><Input type="tel" placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="leadGuestEmail" render={({ field }) => (
                                        <FormItem><FormLabel>E-mail (para Nota Fiscal)</FormLabel><FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="isForeigner" render={({ field }) => (
                                        <div className="flex items-center gap-2 pt-2">
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            <label className="text-sm text-slate-600">Sou estrangeiro / I'm a foreigner</label>
                                        </div>
                                    )} />
                                    {form.watch('isForeigner') && (
                                        <FormField control={form.control} name="country" render={({ field }) => (
                                            <FormItem><FormLabel>País / Country</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-60">{countriesList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage /></FormItem>
                                        )} />
                                    )}
                                </div>
                            )}

                            {/* --- ETAPA 1: ENDEREÇO --- */}
                            {currentStep === 1 && (
                                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField control={form.control} name="address.cep" render={({ field }) => (
                                            <FormItem className="col-span-1">
                                                <FormLabel>CEP</FormLabel>
                                                <FormControl><Input {...field} onBlur={(e) => handleCepLookup(e.target.value)} /></FormControl>
                                                {isLoadingCep && <span className="text-xs text-blue-500">Buscando...</span>}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="address.city" render={({ field }) => (
                                            <FormItem className="col-span-2"><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="address.street" render={({ field }) => (
                                        <FormItem><FormLabel>Rua / Avenida</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="address.number" render={({ field }) => (
                                            <FormItem><FormLabel>Número</FormLabel><FormControl><Input id="address-number" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="address.state" render={({ field }) => (
                                            <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="address.neighborhood" render={({ field }) => (
                                            <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="address.complement" render={({ field }) => (
                                            <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                        )} />
                                    </div>
                                </div>
                            )}

                            {/* --- ETAPA 2: CHEGADA --- */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-blue-800 text-sm">
                                        <Car className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <p>Precisamos destes dados para liberar sua entrada na portaria com agilidade.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="estimatedArrivalTime" render={({ field }) => (
                                            <FormItem><FormLabel>Que horas pretende chegar?</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="vehiclePlate" render={({ field }) => (
                                            <FormItem><FormLabel>Placa do Veículo</FormLabel><FormControl><Input placeholder="ABC-1234" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="travelReason" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Alguma observação especial? (Opcional)</FormLabel>
                                            <FormControl><Textarea placeholder="Berço, restrição alimentar, motivo da viagem..." className="min-h-[80px]" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            )}

                            {/* --- ETAPA 3: ACOMPANHANTES E PETS --- */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    
                                    <div>
                                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center justify-between">
                                            <span>Quem vem com você?</span>
                                            <Badge variant="outline" className="text-slate-500">{companions.length + 1} Pessoas</Badge>
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg opacity-70">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-4 h-4 text-slate-500"/></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-700">{form.watch('leadGuestName') || "Você"}</p>
                                                    <p className="text-xs text-slate-500">Responsável</p>
                                                </div>
                                            </div>
                                            {companions.map((field, index) => (
                                                <div key={field.id} className="relative p-3 border rounded-lg hover:border-blue-300 transition-colors group">
                                                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeCompanion(index)}>
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </Button>
                                                    <div className="grid grid-cols-12 gap-3">
                                                        <div className="col-span-8">
                                                            <label className="text-xs font-semibold text-slate-500 uppercase">Nome Completo</label>
                                                            <FormField name={`companions.${index}.fullName`} control={form.control} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormControl><Input {...field} className="h-8 text-sm" placeholder="Nome do acompanhante" /></FormControl>
                                                                    <FormMessage className="text-xs" />
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                        <div className="col-span-4">
                                                            <label className="text-xs font-semibold text-slate-500 uppercase">Tipo</label>
                                                            <FormField name={`companions.${index}.category`} control={form.control} render={({ field }) => (
                                                                <FormItem>
                                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                        <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="adult">Adulto</SelectItem>
                                                                            <SelectItem value="child">Criança</SelectItem>
                                                                            <SelectItem value="baby">Bebê</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage className="text-xs" />
                                                                </FormItem>
                                                            )} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => appendCompanion({ fullName: '', category: 'adult' })}>
                                                <Plus className="w-4 h-4 mr-2" /> Adicionar Pessoa
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <PawPrint className="w-4 h-4 text-orange-500" /> Vai trazer Pet?
                                        </h4>
                                        
                                        {hasPetWarning && (
                                            <div className="mb-4 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg text-orange-800 text-sm">
                                                <div className="flex items-center gap-2 font-bold mb-1">
                                                    <AlertTriangle className="w-4 h-4" /> Atenção à Política Pet
                                                </div>
                                                <p className="mb-2">A nossa pousada é Pet Friendly! Aceitamos <strong>um único pet</strong> de micro/pequeno porte (até <strong>15kg</strong>).</p>
                                                <p className="mb-2">Taxa: <strong>R$ 50,00</strong> a diária.</p>
                                                <p>Por favor, <a href="#" className="underline font-bold">entre em contato</a> para consultar exceções.</p>
                                            </div>
                                        )}

                                        {pets.map((field, index) => (
                                            <div key={field.id} className="relative p-3 border rounded-lg mb-3 bg-slate-50/50">
                                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-red-400" onClick={() => removePet(index)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500 uppercase">Nome</label>
                                                        <FormField name={`pets.${index}.name`} control={form.control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl><Input {...field} className="h-8 text-sm" placeholder="Nome do Pet" /></FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500 uppercase">Espécie</label>
                                                        <FormField name={`pets.${index}.species`} control={form.control} render={({ field }) => (
                                                            <FormItem>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                    <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="cachorro">Cachorro</SelectItem>
                                                                        <SelectItem value="gato">Gato</SelectItem>
                                                                        <SelectItem value="outro">Outro</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500 uppercase">Peso (kg)</label>
                                                        <FormField name={`pets.${index}.weight`} control={form.control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl><Input type="number" {...field} className="h-8 text-sm" placeholder="Ex: 5" /></FormControl>
                                                                <FormMessage className="text-xs" />
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                    {/* CAMPOS OPCIONAIS SEM OBRIGATORIEDADE VISUAL */}
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-400 uppercase">Raça (Opcional)</label>
                                                        <FormField name={`pets.${index}.breed`} control={form.control} render={({ field }) => (
                                                            <Input {...field} className="h-8 text-sm" placeholder="Vira-lata" />
                                                        )} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-400 uppercase">Idade (Opcional)</label>
                                                        <FormField name={`pets.${index}.age`} control={form.control} render={({ field }) => (
                                                            <Input {...field} className="h-8 text-sm" placeholder="Ex: 2 anos" />
                                                        )} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <Button type="button" variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-sm" onClick={() => appendPet({ id: generateSimpleId(), name: '', species: 'cachorro', breed: '', weight: '', age: '' })}>
                                            + Adicionar Pet
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </CardContent>
                    </Card>

                    {/* RODAPÉ DE NAVEGAÇÃO */}
                    <div className="flex justify-between items-center mt-6">
                        {currentStep > 0 ? (
                            <Button type="button" variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                            </Button>
                        ) : <div></div>}

                        {currentStep < steps.length - 1 ? (
                            <Button type="button" onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 px-8">
                                Próximo <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button type="button" disabled={form.formState.isSubmitting} onClick={handlePreSubmit} className="bg-green-600 hover:bg-green-700 px-8 text-lg font-semibold shadow-lg shadow-green-200">
                                {form.formState.isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Revisar e Confirmar"}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>

            {/* --- MODAL DE POLÍTICAS --- */}
            <Dialog open={isPolicyModalOpen} onOpenChange={setIsPolicyModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600"/> Termos e Políticas</DialogTitle>
                        <DialogDescription>
                            Para finalizar, por favor leia e aceite nossas regras de convivência.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 my-4">
                        {/* Política Geral */}
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-800">Política Geral de Hospedagem</h4>
                            <div className="bg-slate-50 p-4 rounded-md border text-sm text-slate-600 whitespace-pre-line max-h-60 overflow-y-auto">
                                {generalPolicyContent}
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="terms-general" checked={agreedGeneral} onCheckedChange={(c) => setAgreedGeneral(!!c)} />
                                <label htmlFor="terms-general" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                    Li e concordo com a política geral de hospedagem.
                                </label>
                            </div>
                        </div>

                        {/* Política Pet (Condicional) */}
                        {hasPets && (
                            <div className="space-y-2 pt-4 border-t">
                                <h4 className="font-bold text-orange-700 flex items-center gap-2"><PawPrint className="h-4 w-4"/> Política Pet</h4>
                                <div className="bg-orange-50 p-4 rounded-md border border-orange-100 text-sm text-orange-900 whitespace-pre-line max-h-60 overflow-y-auto">
                                    {petPolicyContent}
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox id="terms-pet" checked={agreedPet} onCheckedChange={(c) => setAgreedPet(!!c)} className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600" />
                                    <label htmlFor="terms-pet" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-orange-900">
                                        Li e concordo com a política de pets e taxas aplicáveis.
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPolicyModalOpen(false)}>Voltar</Button>
                        <Button 
                            onClick={handleFinalSubmit} 
                            disabled={!agreedGeneral || (hasPets && !agreedPet) || form.formState.isSubmitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Confirmar Check-in"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}