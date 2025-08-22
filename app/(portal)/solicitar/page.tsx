"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createRequest, CreateRequestData } from '@/app/actions/create-request';
import { RequestableItem } from '@/app/admin/(dashboard)/settings/servicos/page';
import { Request } from '@/app/admin/(dashboard)/solicitacoes/page';

import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Plus, Minus, Package, Sparkles, Wind, Construction, Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const maintenanceSchema = z.object({
  description: z.string().min(10, "Por favor, descreva o problema com mais detalhes.").max(500),
});

const RequestStatusTracker = ({ status }: { status: Request['status'] }) => {
    const steps = [
        { id: 'pending', label: 'Pendente' },
        { id: 'in_progress', label: 'Em Andamento' },
        { id: 'completed', label: 'Concluído' },
    ];
    const currentStepIndex = steps.findIndex(step => step.id === status);

    return (
        <div className="flex items-center justify-between w-full mt-4">
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center text-center">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center",
                            index <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        )}>
                            {index <= currentStepIndex ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <p className={cn("text-xs mt-1 w-20", index <= currentStepIndex ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                            {step.label}
                        </p>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={cn("flex-1 h-1 mx-2", index < currentStepIndex ? 'bg-primary' : 'bg-muted')} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default function RequestsPage() {
    const { stay, user: guest } = useGuest();
    const [items, setItems] = useState<RequestableItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myRequests, setMyRequests] = useState<Request[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    const [selectedItem, setSelectedItem] = useState<RequestableItem | null>(null);
    const [quantity, setQuantity] = useState(1);

    const maintenanceForm = useForm<{ description: string }>({
        resolver: zodResolver(maintenanceSchema),
        defaultValues: { description: '' },
    });

    useEffect(() => {
        const fetchItems = async () => {
          const db = await getFirebaseDb();
          if (!db) return;
          const q = firestore.query(firestore.collection(db, 'requestableItems'), firestore.orderBy('category'), firestore.orderBy('name'));
          const querySnapshot = await firestore.getDocs(q);
          setItems(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RequestableItem)));
          setLoadingItems(false);
        };
        fetchItems();

        if (stay?.id) {
            const fetchRequests = async () => {
                const db = await getFirebaseDb();
                if (!db) return;
                const q = firestore.query(
                    firestore.collection(db, 'requests'),
                    firestore.where('stayId', '==', stay.id),
                    firestore.orderBy('createdAt', 'desc')
                );
                const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
                    setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request)));
                    setLoadingRequests(false);
                });
                return () => unsubscribe();
            };
            fetchRequests();
        } else {
            setLoadingRequests(false);
        }
    }, [stay?.id]);

    const handleRequestSubmit = async (type: CreateRequestData['type'], details: CreateRequestData['details']) => {
        if (!stay || !guest) return toast.error("Informações da estadia não encontradas.");
        
        setIsSubmitting(true);
        const toastId = toast.loading("Enviando solicitação...");
        const requestData: CreateRequestData = {
          stayId: stay.id,
          guestName: guest.displayName || "Hóspede",
          cabinName: stay.cabinName,
          type,
          details,
        };
        const result = await createRequest(requestData);
        toast.dismiss(toastId);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
        setSelectedItem(null);
        setQuantity(1);
        maintenanceForm.reset();
        setIsSubmitting(false);
    };

    const itemsByCategory = useMemo(() => items.reduce((acc, item) => {
        const category = item.category || 'Outros';
        (acc[category] = acc[category] || []).push(item);
        return acc;
    }, {} as Record<string, RequestableItem[]>), [items]);

    const typeInfo = {
        item: { icon: Package, label: "Item" },
        cleaning: { icon: Sparkles, label: "Limpeza" },
        maintenance: { icon: Construction, label: "Manutenção" },
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Concierge Digital</h1>
                <p className="text-muted-foreground">Peça itens, solicite serviços e acompanhe seus pedidos aqui.</p>
            </div>

            <Tabs defaultValue="new_request">
                <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="new_request" className="text-sm">Fazer Solicitação</TabsTrigger>
                    <TabsTrigger value="tracking" className="text-sm">Acompanhamento</TabsTrigger>
                </TabsList>
                <TabsContent value="new_request" className="mt-6">
                    {/* ++ INÍCIO DA CORREÇÃO ++ */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle className="flex items-center gap-2"><Package /> Pedir um Item</CardTitle><CardDescription>Selecione um item da lista abaixo para solicitar.</CardDescription></CardHeader>
                            <CardContent>
                                {loadingItems ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> :
                                <Accordion type="single" collapsible className="w-full">
                                    {Object.entries(itemsByCategory).map(([category, catItems]) => (
                                    <AccordionItem value={category} key={category}>
                                        <AccordionTrigger className="text-lg font-medium">{category}</AccordionTrigger>
                                        <AccordionContent>
                                        <div className="space-y-4 pt-2">
                                            {catItems.map(item => (
                                            <div key={item.id} className="flex items-center justify-between rounded-md border p-4">
                                                <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-semibold">{item.name}</h4>
                                                    <Badge variant={item.type === 'loan' ? 'secondary' : 'default'}>{item.type === 'loan' ? 'Empréstimo' : 'Consumo'}</Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                                {item.type === 'consumable' && item.price && <p className="text-sm font-bold text-primary mt-1">R$ {item.price.toFixed(2).replace('.', ',')}</p>}
                                                </div>
                                                <Button size="sm" onClick={() => { setSelectedItem(item); setQuantity(1); }} className="ml-4">Solicitar</Button>
                                            </div>
                                            ))}
                                        </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                    ))}
                                </Accordion>
                                }
                            </CardContent>
                        </Card>
                        <div className="space-y-8">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles /> Solicitar Limpeza</CardTitle><CardDescription>Peça uma limpeza de rotina para sua cabana.</CardDescription></CardHeader>
                                <CardContent>
                                    <Button className="w-full" onClick={() => handleRequestSubmit('cleaning', {})} disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wind className="mr-2 h-4 w-4" />}
                                        Confirmar Solicitação
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Construction /> Relatar um Problema</CardTitle><CardDescription>Algo quebrou ou não está funcionando? Nos avise aqui.</CardDescription></CardHeader>
                                <CardContent>
                                    <Form {...maintenanceForm}>
                                        <form onSubmit={maintenanceForm.handleSubmit(data => handleRequestSubmit('maintenance', { description: data.description }))} className="space-y-4">
                                        <FormField control={maintenanceForm.control} name="description" render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Descrição do Problema</FormLabel>
                                            <FormControl><Textarea placeholder="Ex: A luz da varanda não está acendendo." {...field} /></FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                            Enviar Relato
                                        </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                     {/* ++ FIM DA CORREÇÃO ++ */}
                </TabsContent>
                <TabsContent value="tracking" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Acompanhe suas solicitações</CardTitle>
                            <CardDescription>Veja o status dos seus pedidos em tempo real.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingRequests ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> :
                             myRequests.length > 0 ? (
                                myRequests.map(request => {
                                    const Icon = typeInfo[request.type].icon;
                                    return (
                                        <div key={request.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 font-bold">
                                                        <Icon className="w-5 h-5 text-primary" />
                                                        <span>
                                                            {request.type === 'item' && `${request.details.quantity}x ${request.details.itemName}`}
                                                            {request.type === 'cleaning' && "Solicitação de Limpeza"}
                                                            {request.type === 'maintenance' && "Relato de Manutenção"}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Pedido em {format(request.createdAt.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>
                                            <RequestStatusTracker status={request.status} />
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-center text-muted-foreground py-8">Você ainda não fez nenhuma solicitação.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
               <DialogContent>
                <DialogHeader>
                    <DialogTitle>Solicitar: {selectedItem?.name}</DialogTitle>
                    <DialogDescription>
                    {selectedItem?.description}<br/>
                    {selectedItem?.type === 'consumable' && `Este item será adicionado à sua conta no valor de R$ ${selectedItem?.price?.toFixed(2).replace('.', ',')} por unidade.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-center space-x-4 py-4">
                    <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button>
                    <span className="text-2xl font-bold">{quantity}</span>
                    <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedItem(null)}>Cancelar</Button>
                    <Button onClick={() => handleRequestSubmit('item', { itemName: selectedItem?.name, quantity, itemPrice: selectedItem?.price, itemType: selectedItem?.type })} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirmar Pedido
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}