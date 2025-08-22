"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast, Toaster } from 'sonner';
import { Loader2, PlusCircle, Edit, Trash2, Package, Sparkles, HandCoins, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ## ATUALIZAÇÃO: Adicionado tipo e preço ao item ##
export interface RequestableItem {
  id: string;
  name: string;
  category: string;
  type: 'loan' | 'consumable'; // Tipo do item
  price?: number; // Preço, opcional
  description?: string;
}

// ## ATUALIZAÇÃO: Schema de validação com lógica condicional para o preço ##
const itemSchema = z.object({
    name: z.string().min(2, "O nome do item é obrigatório."),
    category: z.string().min(2, "A categoria é obrigatória."),
    type: z.enum(['loan', 'consumable'], { required_error: "O tipo é obrigatório."}),
    price: z.preprocess(
      (val) => (val === "" ? undefined : Number(val)),
      z.number({ invalid_type_error: "O preço deve ser um número." }).positive("O preço deve ser positivo.").optional()
    ),
    description: z.string().optional(),
}).refine(data => {
    // Se o tipo for 'consumable', o preço é obrigatório.
    if (data.type === 'consumable' && (data.price === undefined || data.price <= 0)) {
        return false;
    }
    return true;
}, {
    message: "O preço é obrigatório para itens de consumo.",
    path: ["price"], // Campo onde o erro será exibido
});

type ItemFormValues = z.infer<typeof itemSchema>;

const ITEMS_COLLECTION = 'requestableItems';

export default function ManageRequestableItemsPage() {
    const { isAdmin } = useAuth();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [items, setItems] = useState<RequestableItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RequestableItem | null>(null);

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: '',
            category: '',
            type: 'loan',
            price: undefined,
            description: '',
        }
    });

    const itemType = form.watch('type');

    useEffect(() => {
        if (!isAdmin) return;
        const initializeApp = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
            if (!firestoreDb) {
                toast.error("Falha ao conectar ao banco de dados.");
                setLoading(false);
                return;
            }
            const q = firestore.query(firestore.collection(firestoreDb, ITEMS_COLLECTION));
            const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
                const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RequestableItem));
                setItems(itemsData.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
                setLoading(false);
            }, (error) => {
                console.error("Erro no Firestore:", error);
                toast.error("Falha ao carregar itens. Verifique as permissões de acesso.");
                setLoading(false);
            });
            return () => unsubscribe();
        };
        initializeApp();
    }, [isAdmin]);

    const handleOpenModal = (item: RequestableItem | null) => {
        setEditingItem(item);
        if (item) {
            form.reset({
                name: item.name,
                category: item.category,
                type: item.type,
                price: item.price,
                description: item.description || '',
            });
        } else {
            form.reset({
                name: '',
                category: '',
                type: 'loan',
                price: undefined,
                description: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveItem: SubmitHandler<ItemFormValues> = async (data) => {
        if (!db) return;
        const toastId = toast.loading(editingItem ? "Atualizando item..." : "Criando item...");

        try {
            // ## ATUALIZAÇÃO: Salva os novos campos ##
            const dataToSave: Omit<RequestableItem, 'id'> = {
                name: data.name,
                category: data.category,
                type: data.type,
                description: data.description || '',
            };

            if (data.type === 'consumable') {
                dataToSave.price = data.price;
            }

            if (editingItem) {
                const docRef = firestore.doc(db, ITEMS_COLLECTION, editingItem.id);
                await firestore.updateDoc(docRef, dataToSave);
                toast.success("Item atualizado com sucesso!", { id: toastId });
            } else {
                await firestore.addDoc(firestore.collection(db, ITEMS_COLLECTION), dataToSave);
                toast.success("Item criado com sucesso!", { id: toastId });
            }
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error("Falha ao salvar o item.", { id: toastId, description: error.message });
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if(!db) return;
        if (!confirm("Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.")) return;

        const toastId = toast.loading("Excluindo item...");
        try {
            await firestore.deleteDoc(firestore.doc(db, ITEMS_COLLECTION, itemId));
            toast.success("Item excluído com sucesso!", { id: toastId });
        } catch (error: any) {
            toast.error("Falha ao excluir o item.", { id: toastId, description: error.message });
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
                        <CardTitle className="flex items-center gap-2"><Package /> Gerenciar Itens Solicitáveis</CardTitle>
                        <CardDescription>Adicione, edite ou remova itens que os hóspedes podem solicitar.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenModal(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                    </Button>
                </CardHeader>
                <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome do Item</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Preço</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length > 0 ? (
                                    items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            {/* ## ATUALIZAÇÃO: Badge para o tipo ## */}
                                            <TableCell>
                                                <Badge variant={item.type === 'loan' ? 'secondary' : 'default'}>
                                                    {item.type === 'loan' ? 'Empréstimo' : 'Consumo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{item.category}</TableCell>
                                            {/* ## ATUALIZAÇÃO: Exibe o preço formatado ## */}
                                            <TableCell>
                                                {item.type === 'consumable' && item.price ? 
                                                    `R$ ${item.price.toFixed(2).replace('.', ',')}` : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(item)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteItem(item.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">Nenhum item cadastrado.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Editar Item" : "Adicionar Novo Item"}</DialogTitle>
                        <DialogDescription>Preencha as informações para configurar um item que pode ser solicitado pelos hóspedes.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form id="item-form" onSubmit={form.handleSubmit(handleSaveItem)} className="space-y-6 py-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome do Item</FormLabel><FormControl><Input placeholder="Ex: Toalha de Piscina" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Categoria</FormLabel><FormControl><Input placeholder="Ex: Utensílios" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            {/* ## ATUALIZAÇÃO: Campo para selecionar o tipo ## */}
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Tipo de Item</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="loan"><div className="flex items-center gap-2"><Repeat /> Empréstimo (sem custo)</div></SelectItem>
                                        <SelectItem value="consumable"><div className="flex items-center gap-2"><HandCoins /> Consumo (com custo)</div></SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            {/* ## ATUALIZAÇÃO: Campo de preço condicional ## */}
                            {itemType === 'consumable' && (
                                <FormField control={form.control} name="price" render={({ field }) => (
                                    <FormItem><FormLabel>Preço (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ex: 25.50" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            )}
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição (Opcional)</FormLabel>
                                    <FormControl><Textarea placeholder="Ex: Item emprestado, devolver na recepção após o uso." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </form>
                    </Form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" form="item-form" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Sparkles className="mr-2 h-4 w-4" />
                            Salvar Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}