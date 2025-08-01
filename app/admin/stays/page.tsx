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
import { Loader2, CalendarIcon, Users, Edit, FileCheck, KeyRound, PawPrint, User, Home, Phone, Globe, Car, Hash, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

// Zod schema para o formulário de validação do admin
const validationSchema = z.object({
    cabinId: z.string().min(1, "É obrigatório selecionar uma cabana."),
    dates: z.object({
        from: z.date({ required_error: "A data de check-in é obrigatória." }),
        to: z.date({ required_error: "A data de check-out é obrigatória." }),
    }).refine(data => !!data.from && !!data.to, {
        message: "As datas de check-in e check-out são obrigatórias.",
        path: ["from"],
    }),
});
type ValidationFormValues = z.infer<typeof validationSchema>;

// Função para gerar token
const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.match(/.{1,3}/g)!.join('-');
};

export default function ManageStaysPage() {
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [pendingCheckIns, setPendingCheckIns] = useState<PreCheckIn[]>([]);
    const [cabins, setCabins] = useState<Cabin[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCheckIn, setSelectedCheckIn] = useState<PreCheckIn | null>(null);

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

            const qCheckIns = firestore.query(firestore.collection(firestoreDb, 'preCheckIns'), firestore.where('status', '==', 'pendente'));
            const unsubscribeCheckIns = firestore.onSnapshot(qCheckIns, (snapshot) => {
                const checkInsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreCheckIn));
                setPendingCheckIns(checkInsData);
                setLoading(false);
            }, (error) => {
                console.error("Erro ao buscar pré-check-ins:", error);
                toast.error("Erro de permissão ao buscar check-ins.");
                setLoading(false);
            });

            const qCabins = firestore.query(firestore.collection(firestoreDb, 'cabins'), firestore.orderBy('posicao', 'asc'));
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

    const handleOpenModal = (checkIn: PreCheckIn) => {
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
                guestName: selectedCheckIn.leadGuestName,
                cabinId: selectedCabin.id,
                cabinName: selectedCabin.name,
                checkInDate: firestore.Timestamp.fromDate(data.dates.from),
                checkOutDate: firestore.Timestamp.fromDate(data.dates.to),
                numberOfGuests: 1 + (selectedCheckIn.companions?.length || 0),
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
                                            <TableCell className="font-medium">{checkIn.leadGuestName}</TableCell>
                                            <TableCell>{checkIn.companions?.length || 0}</TableCell>
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
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Validar Pré-Check-in de: {selectedCheckIn.leadGuestName}</DialogTitle>
                            <DialogDescription>Confirme os detalhes para criar a estadia e gerar o token de acesso.</DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                           
                            {/* Coluna da Esquerda: Dados do Hóspede e Endereço */}
                            <div className="space-y-6">
                                <section>
                                    <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><User />Hóspede Responsável</h4>
                                    <div className="text-sm space-y-1">
                                        <p><strong>Nome:</strong> {selectedCheckIn.leadGuestName}</p>
                                        <p><strong>{selectedCheckIn.isForeigner ? "Documento:" : "CPF:"}</strong> {selectedCheckIn.leadGuestDocument}</p>
                                        {selectedCheckIn.isForeigner && <p><strong>País:</strong> {selectedCheckIn.address.country}</p>}
                                        <p><strong>E-mail:</strong> {selectedCheckIn.leadGuestEmail}</p>
                                        <p><strong>Telefone:</strong> {selectedCheckIn.leadGuestPhone}</p>
                                    </div>
                                </section>

                                <section>
                                    <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><Home />Endereço</h4>
                                    <div className="text-sm space-y-1">
                                        <p>{selectedCheckIn.address.street}, {selectedCheckIn.address.number} {selectedCheckIn.address.complement && `- ${selectedCheckIn.address.complement}`}</p>
                                        <p>{selectedCheckIn.address.neighborhood} - {selectedCheckIn.address.city}/{selectedCheckIn.address.state}</p>
                                        <p><strong>CEP/ZIP:</strong> {selectedCheckIn.address.cep}</p>
                                    </div>
                                </section>
                                
                                <section>
                                    <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><Car />Detalhes da Chegada</h4>
                                    <div className="text-sm space-y-1">
                                        <p><strong>Chegada Prevista:</strong> {selectedCheckIn.estimatedArrivalTime}</p>
                                        <p><strong>Veículo:</strong> {selectedCheckIn.knowsVehiclePlate ? selectedCheckIn.vehiclePlate || 'Não informado' : 'Não informado / Sem carro'}</p>
                                    </div>
                                </section>
                                
                                {selectedCheckIn.companions && selectedCheckIn.companions.length > 0 && (
                                     <section>
                                        <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><Users />Acompanhantes ({selectedCheckIn.companions.length})</h4>
                                        <ul className="list-disc list-inside text-sm space-y-1">
                                            {selectedCheckIn.companions.map((c, i) => <li key={i}>{c.fullName} ({c.age} anos) {c.cpf && `- CPF: ${c.cpf}`}</li>)}
                                        </ul>
                                    </section>
                                )}
                                
                                {selectedCheckIn.pets && selectedCheckIn.pets.length > 0 && (
                                     <section>
                                        <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b"><PawPrint />Pets ({selectedCheckIn.pets.length})</h4>
                                        {selectedCheckIn.pets.map(p => (
                                            <div key={p.id} className="text-sm p-2 border rounded-md space-y-1 mb-2">
                                                <p><strong>Nome:</strong> {p.name} | <strong>Espécie:</strong> {p.species}</p>
                                                <p><strong>Raça:</strong> {p.breed} | <strong>Idade:</strong> {p.age} | <strong>Peso:</strong> {p.weight}kg</p>
                                                {p.notes && <p><strong>Notas:</strong> {p.notes}</p>}
                                                {p.weight > 15 && <Badge variant="destructive" className="mt-1">Peso Acima do Limite (15kg)</Badge>}
                                            </div>
                                        ))}
                                        {selectedCheckIn.pets.length > 1 && <Badge variant="destructive" className="mt-1">Mais de 1 pet informado</Badge>}
                                    </section>
                                )}
                            </div>

                            {/* Coluna da Direita: Validação e Criação da Estadia */}
                            <div className="space-y-4">
                                <Form {...form}>
                                    <form id="validation-form" onSubmit={form.handleSubmit(handleValidateStay)} className="space-y-4 p-4 border rounded-md bg-slate-50 sticky top-0">
                                        <h4 className="font-semibold">Aprovar e Criar Estadia</h4>
                                        <FormField
                                            control={form.control}
                                            name="cabinId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cabana</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione a cabana..." /></SelectTrigger></FormControl>
                                                        <SelectContent>{cabins.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
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
                                                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal bg-white", !field.value?.from && "text-muted-foreground")}>
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
                                                                selected={field.value as DateRange}
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