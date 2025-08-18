"use client";

import React, { useState } from 'react';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { FullStayFormValues } from '@/lib/schemas/stay-schema';
import { Cabin } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CalendarIcon, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
// ++ INÍCIO DA CORREÇÃO: Importa o componente ScrollArea ++
import { ScrollArea } from '@/components/ui/scroll-area';

interface StayFormFieldsProps {
    form: UseFormReturn<FullStayFormValues>;
    cabins: Cabin[];
}

const countries = ["Argentina", "Uruguai", "Chile", "Estados Unidos", "Portugal", "Alemanha"];
const generateSimpleId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const StayFormFields: React.FC<StayFormFieldsProps> = ({ form, cabins }) => {
    const isForeigner = form.watch('isForeigner');
    const { fields: companions, append: appendCompanion, remove: removeCompanion } = useFieldArray({ control: form.control, name: "companions" });
    const { fields: pets, append: appendPet, remove: removePet } = useFieldArray({ control: form.control, name: "pets" });
    const [isLoadingCep, setIsLoadingCep] = useState(false);

    const handleCepLookup = async (cep: string) => {
        if (isForeigner || !cep) return;
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        
        setIsLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            if (!response.ok) throw new Error('Falha na resposta da API');
            
            const data = await response.json();
            if (data.erro) {
                toast.error("CEP não encontrado.");
                return;
            }
            
            form.setValue('address.street', data.logradouro, { shouldValidate: true });
            form.setValue('address.neighborhood', data.bairro, { shouldValidate: true });
            form.setValue('address.city', data.localidade, { shouldValidate: true });
            form.setValue('address.state', data.uf, { shouldValidate: true });
            
            document.getElementById('address.number')?.focus();
            
        } catch (error) {
            toast.error("Falha ao buscar o CEP. Verifique sua conexão.");
        } finally {
            setIsLoadingCep(false);
        }
    };

    return (
        <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full space-y-4">
            
            <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-semibold">1. Detalhes da Reserva</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField 
                            control={form.control} 
                            name="cabinId" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cabana</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        {/* ++ INÍCIO DA CORREÇÃO: Adiciona ScrollArea para a lista de cabanas ++ */}
                                        <SelectContent>
                                            <ScrollArea className="h-72">
                                                {cabins.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </ScrollArea>
                                        </SelectContent>
                                        {/* ++ FIM DA CORREÇÃO ++ */}
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} 
                        />
                        <FormField control={form.control} name="dates" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Período da Estadia</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}>{field.value?.from && field.value?.to ? (`${format(field.value.from, "dd/MM/yy")} até ${format(field.value.to, "dd/MM/yy")}`) : (<span>Selecione as datas</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={field.value as DateRange} onSelect={field.onChange} numberOfMonths={2}/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-semibold">2. Hóspede Responsável</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                    <FormField name="leadGuestName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="isForeigner" control={form.control} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Hóspede Estrangeiro</FormLabel></FormItem>)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isForeigner ? (
                            <>
                                <FormField name="country" control={form.control} render={({ field }) => (<FormItem><FormLabel>País</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField name="leadGuestDocument" control={form.control} render={({ field }) => (<FormItem><FormLabel>Passaporte / Documento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </>
                        ) : (
                            <FormField name="leadGuestDocument" control={form.control} render={({ field }) => (<FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        )}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="leadGuestEmail" control={form.control} render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="leadGuestPhone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Telefone / WhatsApp</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-semibold">3. Endereço (para Nota Fiscal)</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4 items-end">
                        <FormField name="address.cep" control={form.control} render={({ field }) => (
                            <FormItem className="col-span-3 md:col-span-1">
                                <FormLabel>CEP</FormLabel>
                                <FormControl>
                                    <div className="flex items-center">
                                       <Input {...field} onBlur={(e) => handleCepLookup(e.target.value)} disabled={isForeigner} />
                                       {isLoadingCep && <Loader2 className="h-5 w-5 ml-2 animate-spin" />}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="address.street" control={form.control} render={({ field }) => (<FormItem className="col-span-3 md:col-span-2"><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField name="address.number" control={form.control} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input id="address.number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="address.complement" control={form.control} render={({ field }) => (<FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField name="address.neighborhood" control={form.control} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField name="address.city" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="address.state" control={form.control} render={({ field }) => (<FormItem><FormLabel>Estado (UF)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg font-semibold">4. Detalhes da Chegada</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="estimatedArrivalTime" control={form.control} render={({ field }) => (<FormItem><FormLabel>Horário Previsto</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="vehiclePlate" control={form.control} render={({ field }) => (<FormItem><FormLabel>Placa do Veículo</FormLabel><FormControl><Input placeholder="ABC-1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
                <AccordionTrigger className="text-lg font-semibold">5. Acompanhantes e Pets</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-6">
                    <div>
                        <h4 className="font-medium mb-2">Acompanhantes</h4>
                        {companions.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end mb-2">
                                <FormField control={form.control} name={`companions.${index}.fullName`} render={({ field }) => (<FormItem className="col-span-6"><FormControl><Input placeholder={`Nome do Acompanhante ${index + 1}`} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`companions.${index}.age`} render={({ field }) => (<FormItem className="col-span-2"><FormControl><Input type="number" placeholder="Idade" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`companions.${index}.cpf`} render={({ field }) => (<FormItem className="col-span-3"><FormControl><Input placeholder="CPF (Opcional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => removeCompanion(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendCompanion({ fullName: '', age: '', cpf: ''})}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar</Button>
                    </div>
                     <div>
                        <h4 className="font-medium mb-2">Pets</h4>
                         {pets.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-md mb-4 space-y-4 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removePet(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField name={`pets.${index}.name`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name={`pets.${index}.species`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Espécie</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="cachorro">Cachorro</SelectItem><SelectItem value="gato">Gato</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                </div>
                                 <div className="grid grid-cols-3 gap-4">
                                    <FormField name={`pets.${index}.breed`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Raça</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name={`pets.${index}.age`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Idade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name={`pets.${index}.weight`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPet({ id: generateSimpleId(), name: '', species: 'cachorro', breed: '', weight: '', age: '', notes: ''})}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pet</Button>
                    </div>
                </AccordionContent>
            </AccordionItem>

        </Accordion>
    );
};