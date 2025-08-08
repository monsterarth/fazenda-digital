"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Service } from '@/types';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext'; // ++ Importa o hook de autenticação

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast, Toaster } from 'sonner';
import { Loader2, PlusCircle, Edit, Trash2, CalendarCog, X, Clock, Wand2, Handshake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const timeSlotSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "O rótulo é obrigatório."),
});

const serviceSchema = z.object({
    name: z.string().min(2, "O nome do serviço é obrigatório."),
    type: z.enum(['slots', 'preference', 'on_demand']),
    defaultStatus: z.enum(['open', 'closed']).optional(),
    units: z.array(z.object({ value: z.string() })).optional(),
    timeSlots: z.array(timeSlotSchema).optional(),
    additionalOptions: z.array(z.object({ value: z.string() })).optional(),
    instructions: z.string().optional(),
}).refine(data => {
    if (data.type === 'slots' && (!data.units || data.units.filter(u => u.value && u.value.trim() !== '').length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Serviços do tipo 'slots' devem ter pelo menos uma unidade.",
    path: ["units"],
}).refine(data => {
    if (data.type === 'slots' && (!data.timeSlots || data.timeSlots.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Serviços do tipo 'slots' devem ter pelo menos um horário.",
    path: ["timeSlots"],
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function ManageServicesPage() {
    const { isAdmin } = useAuth(); // ++ Usa o hook para verificar o status de admin
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    const form = useForm<ServiceFormValues>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            name: '',
            type: 'slots',
            units: [{ value: '' }],
            timeSlots: [{id: new Date().toISOString(), label: ''}],
            additionalOptions: [{ value: '' }],
            instructions: '',
        }
    });

    const serviceType = form.watch('type');

    const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({ control: form.control, name: "units" });
    const { fields: timeSlotFields, append: appendTimeSlot, remove: removeTimeSlot } = useFieldArray({ control: form.control, name: "timeSlots" });
    const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control: form.control, name: "additionalOptions" });

    useEffect(() => {
        // ++ CORREÇÃO: A inicialização agora espera pela confirmação de admin
        if (!isAdmin) return;

        const initializeApp = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
            if (!firestoreDb) {
                toast.error("Falha ao conectar ao banco.");
                setLoading(false);
                return;
            }
            const q = firestore.query(firestore.collection(firestoreDb, 'services'));
            const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
                const servicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
                setServices(servicesData);
                setLoading(false);
            }, (error) => {
                console.error("Erro no Firestore:", error);
                toast.error("Falha ao carregar serviços. Verifique as permissões.");
                setLoading(false);
            });
            return () => unsubscribe();
        };
        initializeApp();
    }, [isAdmin]); // ++ A dependência do useEffect agora é o status de admin

    const handleOpenModal = (service: Service | null) => {
        setEditingService(service);
        if (service) {
            form.reset({
                name: service.name,
                type: service.type,
                defaultStatus: service.defaultStatus,
                units: service.units && service.units.length > 0 ? service.units.map(u => ({ value: u })) : [{ value: '' }],
                timeSlots: service.timeSlots || [{id: new Date().toISOString(), label: ''}],
                additionalOptions: service.additionalOptions && service.additionalOptions.length > 0 ? service.additionalOptions.map(opt => ({ value: opt })) : [{ value: '' }],
                instructions: service.instructions || '',
            });
        } else {
            form.reset({
                name: '',
                type: 'slots',
                defaultStatus: 'open',
                units: [{ value: '' }],
                timeSlots: [{id: new Date().toISOString(), label: ''}],
                additionalOptions: [{ value: '' }],
                instructions: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveService: SubmitHandler<ServiceFormValues> = async (data) => {
        if (!db) return;
        const toastId = toast.loading(editingService ? "Atualizando serviço..." : "Criando serviço...");

        try {
            const dataToSave: Partial<Omit<Service, 'id'>> = {
                name: data.name,
                type: data.type,
            };

            if (data.type === 'slots') {
                dataToSave.units = data.units?.map(u => u.value).filter(u => u && u.trim() !== '') || [];
                dataToSave.timeSlots = data.timeSlots?.filter(ts => ts && ts.label.trim() !== '') || [];
                dataToSave.defaultStatus = data.defaultStatus || 'open';
            }
            
            if (data.type === 'preference') {
                dataToSave.additionalOptions = data.additionalOptions?.map(opt => opt.value).filter(opt => opt && opt.trim() !== '') || [];
            }
            
            if (data.type === 'on_demand') {
                dataToSave.instructions = data.instructions || '';
            }

            if (editingService) {
                const docRef = firestore.doc(db, 'services', editingService.id);
                await firestore.updateDoc(docRef, dataToSave);
                toast.success("Serviço atualizado com sucesso!", { id: toastId });
            } else {
                await firestore.addDoc(firestore.collection(db, 'services'), dataToSave);
                toast.success("Serviço criado com sucesso!", { id: toastId });
            }
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error("Falha ao salvar o serviço.", { id: toastId, description: error.message });
        }
    };

    const handleDeleteService = async (serviceId: string) => {
        if(!db) return;
        if (!confirm("Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.")) return;

        const toastId = toast.loading("Excluindo serviço...");
        try {
            await firestore.deleteDoc(firestore.doc(db, 'services', serviceId));
            toast.success("Serviço excluído com sucesso!", { id: toastId });
        } catch (error: any) {
            toast.error("Falha ao excluir serviço.", { id: toastId, description: error.message });
        }
    }
    
    const getBadgeVariant = (type: Service['type']) => {
        switch(type) {
            case 'slots': return 'default';
            case 'preference': return 'secondary';
            case 'on_demand': return 'outline';
            default: return 'default';
        }
    }

    const getTypeText = (type: Service['type']) => {
        switch(type) {
            case 'slots': return 'Horários Fixos';
            case 'preference': return 'Preferência';
            case 'on_demand': return 'Sob Demanda';
            default: 'N/A';
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><CalendarCog /> Gerenciar Serviços</CardTitle>
                        <CardDescription>Adicione, edite ou remova os serviços oferecidos.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenModal(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Serviço
                    </Button>
                </CardHeader>
                <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome do Serviço</TableHead>
                                    <TableHead>Tipo de Agendamento</TableHead>
                                    <TableHead>Detalhes</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {services.length > 0 ? (
                                    services.map(service => (
                                        <TableRow key={service.id}>
                                            <TableCell className="font-medium">{service.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={getBadgeVariant(service.type)}>
                                                    {getTypeText(service.type)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {service.type === 'slots' ? `${service.units?.length || 0} Unidade(s) / ${service.timeSlots?.length || 0} Horários` 
                                                : service.type === 'preference' ? `${service.additionalOptions?.length || 0} Opções Adicionais`
                                                : 'Serviço sob demanda'}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(service)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteService(service.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">Nenhum serviço cadastrado.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Editar Serviço" : "Adicionar Novo Serviço"}</DialogTitle>
                        <DialogDescription>Preencha as informações para configurar o serviço.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form id="service-form" onSubmit={form.handleSubmit(handleSaveService)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome do Serviço</FormLabel><FormControl><Input placeholder="Ex: Massagem Relaxante" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Tipo de Agendamento</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="slots"><div className="flex items-center gap-2"><Clock /> Horários Fixos (Ex: Jacuzzi)</div></SelectItem>
                                        <SelectItem value="preference"><div className="flex items-center gap-2"><Wand2 /> Preferência de Horário (Ex: Limpeza)</div></SelectItem>
                                        <SelectItem value="on_demand"><div className="flex items-center gap-2"><Handshake /> Sob Demanda (Ex: Aula de Surf)</div></SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>

                            {serviceType === 'slots' && (
                                <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                                    <FormField control={form.control} name="defaultStatus" render={({ field }) => (
                                        <FormItem><FormLabel>Status Padrão dos Horários</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="open">Abertos (Hóspede pode agendar)</SelectItem>
                                                <SelectItem value="closed">Fechados (Admin precisa liberar)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        </FormItem>
                                    )}/>
                                    <div className="space-y-2">
                                        <FormLabel>Unidades (Ex: Jacuzzi 1)</FormLabel>
                                        {unitFields.map((field, index) => (
                                            <FormField key={field.id} control={form.control} name={`units.${index}.value`} render={({ field }) => (
                                                <FormItem className="flex items-center gap-2"><FormControl><Input placeholder={`Unidade ${index + 1}`} {...field} /></FormControl><Button type="button" variant="ghost" size="icon" onClick={() => removeUnit(index)}><X className="h-4 w-4 text-red-500" /></Button></FormItem>
                                            )}/>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendUnit({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Unidade</Button>
                                        <FormMessage>{form.formState.errors.units?.message}</FormMessage>
                                    </div>
                                    <div className="space-y-2">
                                        <FormLabel>Horários Disponíveis</FormLabel>
                                        {timeSlotFields.map((field, index) => (
                                            <FormField key={field.id} control={form.control} name={`timeSlots.${index}.label`} render={({ field }) => (
                                                <FormItem className="flex items-center gap-2"><FormControl><Input placeholder="Ex: 14:00 - 15:00" {...field} /></FormControl><Button type="button" variant="ghost" size="icon" onClick={() => removeTimeSlot(index)}><X className="h-4 w-4 text-red-500" /></Button></FormItem>
                                            )}/>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendTimeSlot({id: new Date().toISOString(), label: ''})}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Horário</Button>
                                        <FormMessage>{form.formState.errors.timeSlots?.message}</FormMessage>
                                    </div>
                                </div>
                            )}

                            {serviceType === 'preference' && (
                                <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                                    <div className="space-y-2">
                                        <FormLabel>Opções Adicionais (Ex: Troca de toalhas)</FormLabel>
                                        {optionFields.map((field, index) => (
                                            <FormField key={field.id} control={form.control} name={`additionalOptions.${index}.value`} render={({ field }) => (
                                                 <FormItem className="flex items-center gap-2"><FormControl><Input placeholder={`Opção ${index + 1}`} {...field} /></FormControl><Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}><X className="h-4 w-4 text-red-500" /></Button></FormItem>
                                            )}/>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendOption({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Opção</Button>
                                    </div>
                                </div>
                            )}
                            
                            {serviceType === 'on_demand' && (
                                 <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                                     <FormField control={form.control} name="instructions" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Instruções para o Hóspede</FormLabel>
                                            <FormControl><Textarea placeholder="Ex: Após a solicitação, a recepção entrará em contato para confirmar a disponibilidade, valores e realizar o pagamento." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                     )}/>
                                 </div>
                            )}
                        </form>
                    </Form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" form="service-form" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Serviço
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}