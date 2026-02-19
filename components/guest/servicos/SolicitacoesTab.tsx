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

import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Plus, Minus, Package, Sparkles, Wind, Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const maintenanceSchema = z.object({
  description: z.string().min(10, "Por favor, descreva o problema com mais detalhes.").max(500),
});

export function SolicitacoesTab() {
    const { stay, user: guest } = useGuest();
    const [items, setItems] = useState<RequestableItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    }, []);

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

    return (
        <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Package /> Pedir um Item</CardTitle><CardDescription>Selecione um item da lista.</CardDescription></CardHeader>
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
                        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles /> Solicitar Limpeza</CardTitle><CardDescription>Peça uma limpeza de rotina.</CardDescription></CardHeader>
                        <CardContent><Button className="w-full" onClick={() => handleRequestSubmit('cleaning', {})} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wind className="mr-2 h-4 w-4" />}Confirmar</Button></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Construction /> Relatar um Problema</CardTitle><CardDescription>Nos avise sobre qualquer problema.</CardDescription></CardHeader>
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
                                <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Enviar Relato</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
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
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirmar Pedido</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}