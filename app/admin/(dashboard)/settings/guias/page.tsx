"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb, uploadFile } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Guide } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast, Toaster } from 'sonner';
import { Loader2, PlusCircle, Edit, Trash2, Book, Globe, HardHat, FileText } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Link from 'next/link';

const guideSchema = z.object({
    title: z.string().min(3, "O título é obrigatório."),
    scope: z.enum(['general', 'specific'], { required_error: "Selecione o escopo do guia." }),
    equipmentType: z.string().optional(),
    equipmentModel: z.string().optional(),
    file: z.instanceof(File).optional(),
    fileUrl: z.string().optional(),
}).refine(data => {
    if (data.scope === 'specific' && (!data.equipmentType || !data.equipmentModel)) {
        return false;
    }
    return true;
}, {
    message: "Tipo e Modelo são obrigatórios para guias específicos.",
    path: ["equipmentType"],
}).refine(data => {
    return !!data.file || !!data.fileUrl;
}, {
    message: "É necessário enviar um arquivo PDF.",
    path: ["file"],
});

type GuideFormValues = z.infer<typeof guideSchema>;

const GUIDES_COLLECTION = 'guides';

export default function ManageGuidesPage() {
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [guides, setGuides] = useState<Guide[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGuide, setEditingGuide] = useState<Guide | null>(null);

    const form = useForm<GuideFormValues>({
        resolver: zodResolver(guideSchema),
        defaultValues: {
            title: '',
            scope: 'general',
            equipmentType: '',
            equipmentModel: '',
        }
    });

    const scope = form.watch('scope');

    useEffect(() => {
        const initializeApp = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
            if (!firestoreDb) return setLoading(false);

            const q = firestore.query(firestore.collection(firestoreDb, GUIDES_COLLECTION), firestore.orderBy('title', 'asc'));
            const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
                setGuides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guide)));
                setLoading(false);
            });
            return () => unsubscribe();
        };
        initializeApp();
    }, []);

    const handleOpenModal = (guide: Guide | null) => {
        setEditingGuide(guide);
        form.reset({
            title: guide?.title || '',
            scope: guide?.scope || 'general',
            equipmentType: guide?.equipmentType || '',
            equipmentModel: guide?.equipmentModel || '',
            file: undefined,
            fileUrl: guide?.fileUrl || '',
        });
        setIsModalOpen(true);
    };

    const handleSaveGuide: SubmitHandler<GuideFormValues> = async (data) => {
        if (!db) return;
        const toastId = toast.loading(editingGuide ? "Atualizando guia..." : "Enviando guia...");

        try {
            let fileUrl = editingGuide?.fileUrl || '';
            if (data.file) {
                toast.loading("Enviando PDF...", { id: toastId });
                fileUrl = await uploadFile(data.file, `guides/${Date.now()}_${data.file.name}`);
            }

            const dataToSave: Omit<Guide, 'id'> = {
                title: data.title,
                fileUrl,
                scope: data.scope,
                equipmentType: data.scope === 'specific' ? data.equipmentType : '',
                equipmentModel: data.scope === 'specific' ? data.equipmentModel : '',
            };

            if (editingGuide) {
                await firestore.updateDoc(firestore.doc(db, GUIDES_COLLECTION, editingGuide.id), dataToSave);
                toast.success("Guia atualizado com sucesso!", { id: toastId });
            } else {
                await firestore.addDoc(firestore.collection(db, GUIDES_COLLECTION), dataToSave);
                toast.success("Guia adicionado com sucesso!", { id: toastId });
            }
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error("Falha ao salvar o guia.", { id: toastId, description: error.message });
        }
    };

    const handleDeleteGuide = async (guideId: string) => {
        if (!db) return;
        if (!confirm("Tem certeza que deseja excluir este guia?")) return;

        const toastId = toast.loading("Excluindo guia...");
        try {
            await firestore.deleteDoc(firestore.doc(db, GUIDES_COLLECTION, guideId));
            toast.success("Guia excluído com sucesso!", { id: toastId });
        } catch (error: any) {
            toast.error("Falha ao excluir o guia.", { id: toastId, description: error.message });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Book /> Gerenciar Guias e Manuais</CardTitle>
                        <CardDescription>Faça upload e gerencie os guias em PDF para hóspedes.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenModal(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Guia
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Escopo</TableHead>
                                    <TableHead>Equipamento</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {guides.length > 0 ? (
                                    guides.map(guide => (
                                        <TableRow key={guide.id}>
                                            <TableCell className="font-medium">{guide.title}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {guide.scope === 'general' ? <Globe className="h-4 w-4 text-muted-foreground" /> : <HardHat className="h-4 w-4 text-muted-foreground" />}
                                                    <span>{guide.scope === 'general' ? 'Geral' : 'Específico'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {guide.scope === 'specific' ? `${guide.equipmentType} - ${guide.equipmentModel}` : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={guide.fileUrl} target="_blank"><FileText className="mr-2 h-4 w-4" /> Ver PDF</Link>
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(guide)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteGuide(guide.id)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum guia cadastrado.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingGuide ? "Editar Guia" : "Adicionar Novo Guia"}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form id="guide-form" onSubmit={form.handleSubmit(handleSaveGuide)} className="space-y-6 py-4">
                            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Título do Guia</FormLabel><FormControl><Input placeholder="Ex: Manual da Jacuzzi" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="file" render={({ field }) => (<FormItem><FormLabel>Arquivo PDF</FormLabel><FormControl><Input type="file" accept=".pdf" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="scope" render={({ field }) => (
                                <FormItem className="space-y-3"><FormLabel>Este guia se aplica a:</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="general" /></FormControl><FormLabel className="font-normal">Toda a propriedade (Guia Geral)</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="specific" /></FormControl><FormLabel className="font-normal">Um equipamento específico</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl><FormMessage /></FormItem>
                            )} />
                            {scope === 'specific' && (
                                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                                    <FormField control={form.control} name="equipmentType" render={({ field }) => (<FormItem><FormLabel>Tipo de Equipamento</FormLabel><FormControl><Input placeholder="Ex: Cofre" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="equipmentModel" render={({ field }) => (<FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ex: SafeMax 2000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            )}
                        </form>
                    </Form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" form="guide-form" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Guia</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
