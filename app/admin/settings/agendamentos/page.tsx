"use client";

import React, { useState, useEffect } from 'react';
import * as firestore from 'firebase/firestore';
import { getFirebaseDb, uploadFile } from '@/lib/firebase';
import { Structure, TimeSlot } from '@/types/scheduling'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast, Toaster } from 'sonner';
import { PlusCircle, Edit, Trash2, Loader2, Sparkles, Wand2, Building, Grip, CalendarCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { addMinutes, format as formatTime, parse } from 'date-fns';

// --- Esquemas de Validação ---
const timeSlotSchema = z.object({
  id: z.string(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:mm"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "HH:mm"),
  label: z.string().min(1, "Rótulo obrigatório"),
});

const structureFormSchema = z.object({
  name: z.string().min(2, "O nome da estrutura é obrigatório."),
  photo: z.any().refine(file => file, "A foto da estrutura é obrigatória."),
  managementType: z.enum(['by_structure', 'by_unit']),
  defaultStatus: z.enum(['open', 'closed']),
  units: z.array(z.object({ name: z.string().min(1, "O nome da unidade é obrigatório.") })).min(1, "Adicione pelo menos uma unidade."),
  timeSlots: z.array(timeSlotSchema).min(1, "É necessário configurar pelo menos um horário."),
});

type StructureFormValues = z.infer<typeof structureFormSchema>;

// --- Componente do Painel de Edição (Inline) ---
function StructureFormPanel({ structure, onFinished, onCancel }: { structure?: Structure; onFinished: () => void; onCancel: () => void; }) {
    const form = useForm<StructureFormValues>({
        resolver: zodResolver(structureFormSchema),
        defaultValues: {
            name: structure?.name || '',
            photo: structure?.photoURL || null,
            managementType: structure?.managementType || 'by_unit',
            defaultStatus: structure?.defaultStatus || 'open',
            units: structure?.units?.map(u => ({ name: u })) || [{ name: '' }],
            timeSlots: structure?.timeSlots || [],
        }
    });

    const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({ control: form.control, name: "units" });
    const { fields: slotFields, append: appendSlot, remove: removeSlot, replace: replaceSlots } = useFieldArray({ control: form.control, name: "timeSlots" });
    
    const [generator, setGenerator] = useState({ start: '08:00', end: '22:00', duration: '60', interval: '15' });
    
    const handleGenerateSlots = () => {
        const slots: TimeSlot[] = [];
        let currentTime = parse(generator.start, 'HH:mm', new Date());
        const endTime = parse(generator.end, 'HH:mm', new Date());
        const duration = parseInt(generator.duration, 10);
        const interval = parseInt(generator.interval, 10);

        if (isNaN(duration) || duration <= 0) return toast.error("A duração deve ser um número positivo.");

        while (currentTime < endTime) {
            const slotEnd = addMinutes(currentTime, duration);
            if(slotEnd > endTime) break;
            const startTimeStr = formatTime(currentTime, 'HH:mm');
            const endTimeStr = formatTime(slotEnd, 'HH:mm');
            slots.push({ startTime: startTimeStr, endTime: endTimeStr, label: `${startTimeStr} - ${endTimeStr}`, id: `${startTimeStr}-${endTimeStr}` });
            currentTime = addMinutes(slotEnd, interval);
        }
        replaceSlots(slots);
        toast.success(`${slots.length} horários gerados!`);
    };

    const processSubmit: SubmitHandler<StructureFormValues> = async (data) => {
        const db = await getFirebaseDb();
        if (!db) return toast.error("Banco de dados indisponível.");
        
        const toastId = toast.loading(structure?.id ? "Atualizando estrutura..." : "Criando estrutura...");
        try {
            const docId = structure?.id || firestore.doc(firestore.collection(db, 'structures')).id;
            let photoURL = structure?.photoURL || '';
            if (data.photo instanceof File) {
                photoURL = await uploadFile(data.photo, `structures/${docId}/${data.photo.name}`);
            }

            // ## INÍCIO DA CORREÇÃO ##
            // Construindo o objeto de dados manualmente para garantir que o campo 'photo' (File) não seja incluído.
            const structureData = {
                name: data.name,
                photoURL: photoURL, // Usamos a variável que contém a URL da imagem
                managementType: data.managementType,
                defaultStatus: data.defaultStatus,
                units: data.units.map(u => u.name),
                timeSlots: data.timeSlots,
            };
            // ## FIM DA CORREÇÃO ##

            await firestore.setDoc(firestore.doc(db, "structures", docId), structureData);
            toast.success("Estrutura salva com sucesso!", { id: toastId });
            onFinished();
        } catch (error: any) {
            toast.error(`Ocorreu um erro: ${error.message}`, { id: toastId });
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(processSubmit)} className="flex flex-col h-full bg-muted/30 p-4 rounded-b-lg border-t">
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome da Estrutura</FormLabel><FormControl><Input placeholder="Ex: Jacuzzi" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="photo" render={({ field: { onChange } }) => (<FormItem><FormLabel>Foto</FormLabel><FormControl><Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem>)}/>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField name="managementType" control={form.control} render={({ field }) => (<FormItem><FormLabel>Gerenciamento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="by_unit">Por Unidade</SelectItem><SelectItem value="by_structure">Por Estrutura</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                    <FormField name="defaultStatus" control={form.control} render={({ field }) => (<FormItem><FormLabel>Status Padrão</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="open">Aberto</SelectItem><SelectItem value="closed">Fechado</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Unidades</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                               {unitFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <FormField name={`units.${index}.name`} control={form.control} render={({ field }) => (<FormItem className="flex-grow"><FormControl><Input placeholder={`Unidade ${index + 1}`} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeUnit(index)} disabled={unitFields.length <= 1}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendUnit({ name: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Unidade</Button>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="text-primary"/> Gerador de Horários</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                                <FormItem><FormLabel>Início</FormLabel><Input type="time" value={generator.start} onChange={e => setGenerator(g => ({...g, start: e.target.value}))}/></FormItem>
                                <FormItem><FormLabel>Fim</FormLabel><Input type="time" value={generator.end} onChange={e => setGenerator(g => ({...g, end: e.target.value}))}/></FormItem>
                                <FormItem><FormLabel>Duração</FormLabel><Input type="number" value={generator.duration} onChange={e => setGenerator(g => ({...g, duration: e.target.value}))} placeholder="min"/>
                                </FormItem><FormItem><FormLabel>Intervalo</FormLabel><Input type="number" value={generator.interval} onChange={e => setGenerator(g => ({...g, interval: e.target.value}))} placeholder="min"/>
                                </FormItem><Button type="button" onClick={handleGenerateSlots} className="w-full">Gerar</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Grade de Horários</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2">
                                     {slotFields.map((field, index) => (
                                         <div key={field.id} className="flex items-center gap-2 p-2 bg-background rounded-md">
                                             <FormField name={`timeSlots.${index}.startTime`} control={form.control} render={({ field }) => <FormItem className="flex-1"><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>}/>
                                             <FormField name={`timeSlots.${index}.endTime`} control={form.control} render={({ field }) => <FormItem className="flex-1"><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>}/>
                                             <FormField name={`timeSlots.${index}.label`} control={form.control} render={({ field }) => <FormItem className="flex-[2]"><FormControl><Input placeholder="Rótulo" {...field} /></FormControl><FormMessage /></FormItem>}/>
                                             <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                         </div>
                                     ))}
                                     {slotFields.length === 0 && <p className="text-sm text-center text-muted-foreground p-4">Use o gerador ou adicione horários.</p>}
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => appendSlot({ startTime: '', endTime: '', label: '', id: new Date().toISOString() })}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Manualmente</Button>
                                 <FormMessage>{form.formState.errors.timeSlots?.message}</FormMessage>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <div className="border-t pt-4 mt-4 flex-shrink-0 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting} size="lg">
                        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4"/>}
                        {structure ? "Salvar Alterações" : "Criar Estrutura"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}

// --- PÁGINA PRINCIPAL (SEM MODAL) ---
export default function ManageSchedulesPage() {
    const [structures, setStructures] = useState<Structure[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'create'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const db = getFirebaseDb().then(db => {
            if (!db) { toast.error("Banco de dados indisponível."); setLoading(false); return; }
            const q = firestore.query(firestore.collection(db, 'structures'));
            return firestore.onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Structure));
                setStructures(data.sort((a,b) => a.name.localeCompare(b.name)));
                setLoading(false);
            }, () => { toast.error("Falha ao carregar."); setLoading(false); });
        });
        return () => { db.then(unsub => unsub && unsub()); };
    }, []);

    const handleDeleteStructure = async (structureId: string, structureName: string) => {
        if (!confirm(`Tem certeza que deseja excluir a estrutura "${structureName}"?`)) return;
        const db = await getFirebaseDb();
        if (!db) return;
        const toastId = toast.loading(`Excluindo ${structureName}...`);
        try {
            await firestore.deleteDoc(firestore.doc(db, "structures", structureId));
            toast.success("Excluído com sucesso!", { id: toastId });
        } catch (error) { toast.error("Erro ao excluir.", { id: toastId }); }
    };
    
    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2"><CalendarCog />Configurar Estruturas</CardTitle>
                        <CardDescription>Crie e gerencie as estruturas que seus hóspedes podem agendar.</CardDescription>
                    </div>
                    {view === 'list' && (
                        <Button onClick={() => setView('create')}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Nova</Button>
                    )}
                </CardHeader>
                {view === 'create' && (
                    <CardContent>
                        <StructureFormPanel 
                            onFinished={() => setView('list')} 
                            onCancel={() => setView('list')} 
                        />
                    </CardContent>
                )}
            </Card>

            {view === 'list' && (
                structures.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-4" value={editingId || ""} onValueChange={setEditingId}>
                        {structures.map(structure => (
                            <AccordionItem value={structure.id} key={structure.id} className="bg-card rounded-lg border">
                                <div className="flex items-center w-full p-1 pr-4">
                                    <AccordionTrigger className="flex-1 p-3 hover:no-underline" onClick={() => setEditingId(prevId => prevId === structure.id ? null : structure.id)}>
                                        <div className='flex items-center gap-4 text-left'>
                                            <Image src={structure.photoURL} alt={structure.name} width={80} height={50} className="rounded-md object-cover aspect-video" />
                                            <div className='flex flex-col'>
                                                <span className="text-lg font-semibold">{structure.name}</span>
                                                <div className="flex gap-2 pt-1">
                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                        {structure.managementType === 'by_unit' ? <Building className="h-3 w-3" /> : <Grip className="h-3 w-3" />}
                                                        {structure.managementType === 'by_unit' ? 'Por Unidade' : 'Por Estrutura'}
                                                    </Badge>
                                                    <Badge variant={structure.defaultStatus === 'open' ? 'default' : 'destructive'}>{structure.defaultStatus === 'open' ? 'Aberto' : 'Fechado'}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2 pl-4 border-l">
                                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteStructure(structure.id, structure.name); }}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                    </div>
                                </div>
                                <AccordionContent>
                                    <StructureFormPanel 
                                        structure={structure}
                                        onFinished={() => setEditingId(null)}
                                        onCancel={() => setEditingId(null)}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <Card className="text-center p-12"><CardDescription>Nenhuma estrutura criada ainda.</CardDescription></Card>
                )
            )}
        </div>
    );
}