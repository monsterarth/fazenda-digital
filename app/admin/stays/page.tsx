"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { PreCheckIn, Stay, Cabin } from '@/types';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import { Loader2, Hotel, CalendarIcon, Users, Edit, FileCheck, KeyRound, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

// --- Esquema de validação para o formulário do admin (CORRIGIDO) ---
const validationSchema = z.object({
    cabinId: z.string().min(1, "É obrigatório selecionar uma cabana."),
    dates: z.object({
        // `from` é uma chave obrigatória que pode conter `Date` ou `undefined`
        from: z.union([z.date(), z.undefined()]), 
        // `to` é uma chave opcional
        to: z.date().optional(),
    }).refine(data => !!data.from && !!data.to, {
        message: "As datas de check-in e check-out são obrigatórias.",
        path: ["from"], // Atribui o erro ao campo de data para exibição
    }),
});
type ValidationFormValues = z.infer<typeof validationSchema>;

// Função para gerar um token amigável
const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.match(/.{1,3}/g)!.join('-');
};

// --- PÁGINA PRINCIPAL DE GESTÃO DE ESTADIAS ---
export default function ManageStaysPage() {
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [pendingCheckIns, setPendingCheckIns] = useState<(PreCheckIn & { id: string })[]>([]);
    const [cabins, setCabins] = useState<Cabin[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCheckIn, setSelectedCheckIn] = useState<(PreCheckIn & { id: string }) | null>(null);

    const form = useForm<ValidationFormValues>({
        resolver: zodResolver(validationSchema),
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

            // Listener para pré-check-ins pendentes
            const qCheckIns = firestore.query(firestore.collection(firestoreDb, 'preCheckIns'), firestore.where('status', '==', 'pendente'));
            const unsubscribeCheckIns = firestore.onSnapshot(qCheckIns, (snapshot) => {
                const checkInsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreCheckIn & { id: string }));
                setPendingCheckIns(checkInsData);
                setLoading(false);
            }, (error) => {
                console.error("Erro ao buscar pré-check-ins:", error);
                toast.error("Erro de permissão ao buscar check-ins.");
                setLoading(false);
            });

            // Listener para cabanas
            const qCabins = firestore.collection(firestoreDb, 'cabins');
            const unsubscribeCabins = firestore.onSnapshot(qCabins, (snapshot) => {
                const cabinsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cabin));
                setCabins(cabinsData);
            }, (error) => {
                console.error("Erro ao buscar cabanas:", error);
                toast.error("Erro de permissão ao buscar cabanas.");
            });

            return () => {
                unsubscribeCheckIns();
                unsubscribeCabins();
            };
        };
        initializeApp();
    }, []);

    const handleOpenModal = (checkIn: PreCheckIn & { id: string }) => {
        setSelectedCheckIn(checkIn);
        form.reset({
            cabinId: '',
            dates: {
                from: new Date(),
                to: addDays(new Date(), 2),
            },
        });
        setIsModalOpen(true);
    };

    const handleValidateStay: SubmitHandler<ValidationFormValues> = async (data) => {
        if (!db || !selectedCheckIn || !data.dates.from || !data.dates.to) {
            toast.error("Dados insuficientes para validar a estadia.");
            return;
        }

        const toastId = toast.loading("Validando estadia e gerando token...");

        try {
            const selectedCabin = cabins.find(c => c.id === data.cabinId);
            if (!selectedCabin) throw new Error("Cabana selecionada não encontrada.");

            const batch = firestore.writeBatch(db);
            
            const stayRef = firestore.doc(firestore.collection(db, 'stays'));
            const newStay: Omit<Stay, 'id'> = {
                guestName: selectedCheckIn.guests[0].fullName,
                cabinId: selectedCabin.id,
                cabinName: selectedCabin.name,
                checkInDate: firestore.Timestamp.fromDate(data.dates.from),
                checkOutDate: firestore.Timestamp.fromDate(data.dates.to),
                numberOfGuests: selectedCheckIn.guests.length,
                token: generateToken(),
                status: 'active',
                preCheckInId: selectedCheckIn.id,
                createdAt: firestore.Timestamp.now(),
            };
            batch.set(stayRef, newStay);

            const preCheckInRef = firestore.doc(db, 'preCheckIns', selectedCheckIn.id);
            batch.update(preCheckInRef, { status: 'validado', stayId: stayRef.id });

            await batch.commit();

            toast.success("Estadia validada com sucesso!", {
                id: toastId,
                description: `Token gerado para ${newStay.guestName}: ${newStay.token}`,
                duration: 10000,
            });

            setIsModalOpen(false);
            setSelectedCheckIn(null);

        } catch (error: any) {
            toast.error("Falha ao validar a estadia.", { id: toastId, description: error.message });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileCheck /> Gestão de Estadias</CardTitle>
                    <CardDescription>Valide os pré-check-ins pendentes para ativar a estadia dos hóspedes no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Hóspede Responsável</TableHead>
                                    <TableHead>Acompanhantes</TableHead>
                                    <TableHead>Data de Envio</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingCheckIns.length > 0 ? (
                                    pendingCheckIns.map(checkIn => (
                                        <TableRow key={checkIn.id}>
                                            <TableCell className="font-medium">{checkIn.guests[0].fullName}</TableCell>
                                            <TableCell>{checkIn.guests.length - 1}</TableCell>
                                            <TableCell>{format(checkIn.createdAt.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenModal(checkIn)}>
                                                    <Edit className="mr-2 h-4 w-4"/> Revisar e Validar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">Nenhum pré-check-in pendente.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {selectedCheckIn && (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Validar Pré-Check-in de: {selectedCheckIn.guests[0].fullName}</DialogTitle>
                            <DialogDescription>Confirme os detalhes para criar a estadia e gerar o token de acesso.</DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
                            <div className="space-y-4">
                                <div><h4 className="font-semibold">Hóspedes</h4><p>{selectedCheckIn.guests.map(g => g.fullName).join(', ')}</p></div>
                                <div><h4 className="font-semibold">Contato</h4><p>{selectedCheckIn.leadGuestEmail} / {selectedCheckIn.leadGuestPhone}</p></div>
                                <div><h4 className="font-semibold">Chegada Prevista</h4><p>{selectedCheckIn.estimatedArrivalTime}</p></div>
                                {selectedCheckIn.vehiclePlate && <div><h4 className="font-semibold">Placa</h4><p>{selectedCheckIn.vehiclePlate}</p></div>}
                                {selectedCheckIn.travelReason && <div><h4 className="font-semibold">Motivo da Viagem</h4><p>{selectedCheckIn.travelReason}</p></div>}
                                {selectedCheckIn.foodRestrictions && <div><h4 className="font-semibold text-red-600">Restrições Alimentares</h4><p className="text-red-600">{selectedCheckIn.foodRestrictions}</p></div>}
                                {selectedCheckIn.isBringingPet && <Badge variant="destructive" className="flex items-center gap-2"><PawPrint className="h-4 w-4"/>Hóspede com Pet</Badge>}
                            </div>

                            <div className="space-y-4">
                                <Form {...form}>
                                    <form id="validation-form" onSubmit={form.handleSubmit(handleValidateStay)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="cabinId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cabana</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione a cabana..." /></SelectTrigger></FormControl>
                                                        <SelectContent>{cabins.sort((a,b) => (a.posicao || 0) - (b.posicao || 0)).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        
                                        <FormField
                                            control={form.control}
                                            name="dates"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Período da Estadia</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value?.from && "text-muted-foreground")}>
                                                                    {field.value?.from && field.value?.to ? (
                                                                        `${format(field.value.from, "dd/MM/yy")} até ${format(field.value.to, "dd/MM/yy")}`
                                                                    ) : (<span>Selecione as datas</span>)}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="range"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                defaultMonth={field.value?.from}
                                                                numberOfMonths={2}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </form>
                                </Form>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" form="validation-form" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                                Validar Estadia e Gerar Token
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}