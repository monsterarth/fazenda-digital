"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Cabin } from '@/types';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast, Toaster } from 'sonner';
import { Loader2, PlusCircle, Edit, Trash2, BedDouble, Wifi } from 'lucide-react'; // Adicionado Wifi

// ## INÍCIO DA CORREÇÃO: Adicionados os campos de Wi-Fi ao schema ##
const cabinSchema = z.object({
  name: z.string().min(2, "O nome da cabana é obrigatório."),
  capacity: z.number().min(1, "A capacidade deve ser de pelo menos 1."),
  posicao: z.number().optional(),
  wifiSsid: z.string().optional(),
  wifiPassword: z.string().optional(),
});
// ## FIM DA CORREÇÃO ##

type CabinFormValues = z.infer<typeof cabinSchema>;

export default function ManageCabinsPage() {
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [cabins, setCabins] = useState<Cabin[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCabin, setEditingCabin] = useState<Cabin | null>(null);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [cabinToDelete, setCabinToDelete] = useState<Cabin | null>(null);

    const form = useForm<CabinFormValues>({
        resolver: zodResolver(cabinSchema),
        defaultValues: {
            name: '',
            capacity: 2,
            posicao: undefined,
            wifiSsid: '',
            wifiPassword: '',
        }
    });

    useEffect(() => {
        const initializeApp = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);

            if (!firestoreDb) {
                toast.error("Falha ao conectar ao banco.");
                setLoading(false);
                return;
            }

            const q = firestore.query(firestore.collection(firestoreDb, 'cabins'), firestore.orderBy('posicao', 'asc'));
            const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
                const cabinsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cabin));
                setCabins(cabinsData);
                setLoading(false);
            }, (error) => {
                console.error("Erro de permissão no Firestore:", error);
                toast.error("Falha ao carregar cabanas.", { description: "Verifique as regras de segurança do Firestore."});
                setLoading(false);
            });

            return () => unsubscribe();
        };
        initializeApp();
    }, []);

    const handleOpenModal = (cabin: Cabin | null) => {
        setEditingCabin(cabin);
        if (cabin) {
            form.reset({
                name: cabin.name,
                capacity: cabin.capacity,
                posicao: cabin.posicao,
                wifiSsid: cabin.wifiSsid || '',
                wifiPassword: cabin.wifiPassword || '',
            });
        } else {
            form.reset({
                name: '',
                capacity: 2,
                posicao: cabins.length > 0 ? Math.max(...cabins.map(c => c.posicao || 0)) + 1 : 1,
                wifiSsid: '',
                wifiPassword: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSaveCabin: SubmitHandler<CabinFormValues> = async (data) => {
        if (!db) return;
        const toastId = toast.loading(editingCabin ? "Salvando alterações..." : "Criando nova cabana...");

        try {
            // Garante que campos opcionais vazios sejam salvos como nulos ou indefinidos
            const dataToSave = {
                ...data,
                posicao: data.posicao ?? null,
                wifiSsid: data.wifiSsid || null,
                wifiPassword: data.wifiPassword || null,
            };

            if (editingCabin) {
                const docRef = firestore.doc(db, 'cabins', editingCabin.id);
                await firestore.updateDoc(docRef, dataToSave);
                toast.success("Cabana atualizada com sucesso!", { id: toastId });
            } else {
                await firestore.addDoc(firestore.collection(db, 'cabins'), dataToSave);
                toast.success("Cabana criada com sucesso!", { id: toastId });
            }
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error("Falha ao salvar a cabana.", { id: toastId, description: error.message });
        }
    };

    const handleOpenDeleteDialog = (cabin: Cabin) => {
        setCabinToDelete(cabin);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteCabin = async () => {
        if (!db || !cabinToDelete) return;
        const toastId = toast.loading("Excluindo cabana...");
        try {
            await firestore.deleteDoc(firestore.doc(db, 'cabins', cabinToDelete.id));
            toast.success("Cabana excluída com sucesso!", { id: toastId });
        } catch (error: any) {
            toast.error("Falha ao excluir a cabana.", { id: toastId, description: error.message });
        } finally {
            setIsDeleteDialogOpen(false);
            setCabinToDelete(null);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><BedDouble /> Gerenciar Cabanas</CardTitle>
                        <CardDescription>Adicione, edite ou remova as acomodações e suas configurações.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenModal(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Cabana
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Posição</TableHead>
                                    <TableHead>Nome da Cabana</TableHead>
                                    <TableHead>Capacidade</TableHead>
                                    {/* ## INÍCIO DA CORREÇÃO: Novas colunas na tabela ## */}
                                    <TableHead>Wi-Fi SSID</TableHead>
                                    <TableHead>Senha</TableHead>
                                    {/* ## FIM DA CORREÇÃO ## */}
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cabins.length > 0 ? (
                                    cabins.map(cabin => (
                                        <TableRow key={cabin.id}>
                                            <TableCell>{cabin.posicao || '-'}</TableCell>
                                            <TableCell className="font-medium">{cabin.name}</TableCell>
                                            <TableCell>{cabin.capacity} pessoas</TableCell>
                                            {/* ## INÍCIO DA CORREÇÃO: Exibição dos dados de Wi-Fi ## */}
                                            <TableCell className="font-mono text-xs">{cabin.wifiSsid || 'Não definido'}</TableCell>
                                            <TableCell className="font-mono text-xs">{cabin.wifiPassword || 'Não definida'}</TableCell>
                                            {/* ## FIM DA CORREÇÃO ## */}
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(cabin)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Editar
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleOpenDeleteDialog(cabin)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">Nenhuma cabana cadastrada.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCabin ? "Editar Cabana" : "Adicionar Nova Cabana"}</DialogTitle>
                        <DialogDescription>Preencha as informações abaixo e clique em salvar.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form id="cabin-form" onSubmit={form.handleSubmit(handleSaveCabin)} className="space-y-4 py-4">
                            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome da Cabana</FormLabel><FormControl><Input placeholder="Ex: Cabana da Praia 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="capacity" render={({ field }) => (<FormItem><FormLabel>Capacidade</FormLabel><FormControl><Input type="number" min="1" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="posicao" render={({ field }) => (<FormItem><FormLabel>Posição (Ordem)</FormLabel><FormControl><Input type="number" min="1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}/></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            {/* ## INÍCIO DA CORREÇÃO: Novos campos de Wi-Fi no formulário ## */}
                            <div className="space-y-2 pt-4 border-t">
                                <h4 className="font-medium flex items-center gap-2 text-muted-foreground"><Wifi className="h-4 w-4" /> Configurações de Wi-Fi</h4>
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField control={form.control} name="wifiSsid" render={({ field }) => (<FormItem><FormLabel>Nome da Rede (SSID)</FormLabel><FormControl><Input placeholder="Ex: PousadaNet_Cabana1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name="wifiPassword" render={({ field }) => (<FormItem><FormLabel>Senha</FormLabel><FormControl><Input placeholder="Senha da rede" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                            {/* ## FIM DA CORREÇÃO ## */}
                        </form>
                    </Form>
                    <DialogFooter>
                        <Button type="submit" form="cabin-form" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente a cabana "{cabinToDelete?.name}" do banco de dados.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCabin}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}