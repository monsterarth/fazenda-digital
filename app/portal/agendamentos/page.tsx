"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { useGuest } from '@/context/GuestProvider';
import { Structure, Booking, TimeSlot } from '@/types/scheduling';
import { format, parse, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarCheck, AlertTriangle, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner';
import Image from 'next/image';

export default function GuestSchedulingPage() {
    const { stay, isLoading: isGuestLoading } = useGuest();
    const router = useRouter();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [structures, setStructures] = useState<Structure[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [dialogState, setDialogState] = useState<{ type: 'confirmBooking' | 'cancelBooking' | null; data: any; }>({ type: null, data: {} });
    
    const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const todayFormatted = useMemo(() => format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR }), []);

    useEffect(() => {
        if (!isGuestLoading && !stay) {
            router.push('/portal');
        }
    }, [stay, isGuestLoading, router]);

    useEffect(() => {
        if (isGuestLoading || !stay) return;

        const initializeData = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
            if (!firestoreDb) {
                toast.error("Erro de conexão com o banco de dados.");
                setLoadingData(false);
                return;
            }

            const structuresQuery = firestore.query(firestore.collection(firestoreDb, 'structures'));
            const unsubStructures = firestore.onSnapshot(structuresQuery, snap => {
                const fetchedStructures = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Structure));
                setStructures(fetchedStructures);
                setLoadingData(false);
            }, error => {
                console.error("Erro ao carregar estruturas:", error);
                toast.error("Não foi possível carregar as opções de agendamento.");
                setLoadingData(false);
            });

            // ++ INÍCIO DA CORREÇÃO 1: BUSCA DE DADOS ++
            // Agora buscamos todos os status relevantes, incluindo "disponivel" e "cancelado" (usado para bloqueios).
            const bookingsQuery = firestore.query(
                firestore.collection(firestoreDb, 'bookings'),
                firestore.where('date', '==', today)
            );
            // ++ FIM DA CORREÇÃO 1 ++
            const unsubBookings = firestore.onSnapshot(bookingsQuery, snap => {
                const fetchedBookings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
                setBookings(fetchedBookings);
            }, error => {
                console.error("Erro ao carregar agendamentos existentes:", error);
                toast.error("Não foi possível verificar a disponibilidade em tempo real.");
            });
            
            return () => {
                unsubStructures();
                unsubBookings();
            };
        };
        
        initializeData();
    }, [stay, isGuestLoading, today]);

    const userBookings = useMemo(() => {
        if (!stay) return [];
        return bookings.filter(b => b.stayId === stay.id && (b.status === 'confirmado' || b.status === 'pendente'));
    }, [bookings, stay]);

    // ++ INÍCIO DA CORREÇÃO 2: LÓGICA DE STATUS ++
    // Esta função foi completamente reescrita para refletir a sua estrutura de dados.
    const getStatusForSlot = useCallback((structure: Structure, timeSlot: TimeSlot, unit?: string) => {
        const now = new Date();
        const slotStartTime = parse(`${today} ${timeSlot.startTime}`, 'yyyy-MM-dd HH:mm', new Date());

        // 1. Horário já passou
        if (isBefore(slotStartTime, now)) {
            return { status: 'passou' };
        }

        // 2. Procura por um documento de 'booking' para este slot específico
        const bookingForSlot = bookings.find(b => 
            b.structureId === structure.id &&
            b.startTime === timeSlot.startTime &&
            (structure.managementType === 'by_structure' || b.unitId === unit)
        );

        // 3. Se um documento EXISTE, analisamos seu status
        if (bookingForSlot) {
            switch (bookingForSlot.status) {
                case 'disponivel':
                    return { status: 'disponivel' }; // Encontrou um slot explicitamente disponível
                case 'confirmado':
                case 'pendente':
                    // Se o agendamento pertence ao hóspede atual
                    if (stay && bookingForSlot.stayId === stay.id) {
                        return { status: 'meu_horario' };
                    }
                    // Se pertence a outro hóspede, está indisponível
                    return { status: 'indisponivel' };
                default:
                    // Qualquer outro status (ex: 'cancelado', 'bloqueado') torna o slot indisponível
                    return { status: 'indisponivel' };
            }
        }

        // 4. Se NENHUM documento foi encontrado, usamos a regra padrão da estrutura
        // (Isso mantém a flexibilidade para estruturas que não usam disponibilidade explícita)
        if (structure.defaultStatus === 'open') {
            return { status: 'disponivel' };
        }
        
        // 5. Se nenhuma regra permitiu, o horário está indisponível
        return { status: 'indisponivel' };
    }, [bookings, stay, today]);
    // ++ FIM DA CORREÇÃO 2 ++

    const handleBooking = async () => {
        const { structure, timeSlot, unit } = dialogState.data;
        if (!db || !stay || !structure || !timeSlot) {
            toast.error("Dados insuficientes para realizar o agendamento.");
            return;
        }
        
        const existingBookingForStructure = userBookings.find(b => b.structureId === structure.id);
        const toastId = toast.loading(existingBookingForStructure ? "Alterando seu agendamento..." : "Processando agendamento...");

        try {
            if (existingBookingForStructure) {
                await firestore.deleteDoc(firestore.doc(db, 'bookings', existingBookingForStructure.id));
            }
            
            const status = structure.approvalMode === 'automatic' ? 'confirmado' : 'pendente';
            const newBookingData: Omit<Booking, 'id' | 'createdAt'> = {
                structureId: structure.id,
                structureName: structure.name,
                unitId: unit || undefined,
                stayId: stay.id,
                guestId: stay.id, // Supondo que o guestId é o mesmo que stayId para hóspedes
                guestName: stay.guestName || stay.guestName,
                cabinId: stay.cabinId,
                date: today,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                status: status,
            };

            await firestore.addDoc(firestore.collection(db, 'bookings'), { 
                ...newBookingData, 
                createdAt: firestore.serverTimestamp() 
            });
            
            const successMessage = status === 'confirmado'
                ? "Reserva confirmada com sucesso!"
                : "Solicitação enviada! Aguarde a confirmação no seu painel.";
            toast.success(successMessage, { id: toastId });

        } catch (error: any) {
            console.error("Erro ao agendar:", error);
            toast.error("Ocorreu um erro inesperado", { id: toastId, description: "Por favor, tente novamente." });
        } finally {
            setDialogState({ type: null, data: {} });
        }
    };
    
    const handleCancelBooking = async () => {
        const { bookingId } = dialogState.data;
        if (!db || !bookingId) return;

        const toastId = toast.loading("Cancelando sua reserva...");
        try {
            await firestore.deleteDoc(firestore.doc(db, 'bookings', bookingId));
            toast.success("Reserva cancelada com sucesso.", { id: toastId });
        } catch (error: any) {
            console.error("Erro ao cancelar:", error);
            toast.error("Não foi possível cancelar a reserva.", { id: toastId, description: error.message });
        } finally {
            setDialogState({ type: null, data: {} });
        }
    };
    
    if (isGuestLoading || loadingData) {
        return <div className="flex flex-col justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Carregando agendamentos...</p></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
                <p className="text-muted-foreground">Disponibilidade para hoje, {todayFormatted}.</p>
            </div>
            
            {userBookings.length > 0 && (
                <Card className="mb-8 bg-blue-50 border-blue-200 dark:bg-blue-900/30">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300"><CalendarCheck /> Meus Agendamentos</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                           {userBookings.map(b => (
                               <li key={b.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm p-3 rounded-md bg-white dark:bg-background/70">
                                   <div>
                                       <span className="font-semibold">{b.structureName}</span> 
                                       {b.unitId && <span className="text-muted-foreground"> ({b.unitId})</span>}
                                       <span className="text-muted-foreground ml-2 font-mono">{b.startTime} - {b.endTime}</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                       <Badge variant={b.status === 'confirmado' ? 'default' : 'secondary'}>{b.status}</Badge>
                                       <Button size="sm" variant="ghost" className="h-7 text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400" onClick={() => setDialogState({ type: 'cancelBooking', data: { bookingId: b.id } })}>
                                           <XCircle className="h-4 w-4 mr-1"/> Cancelar
                                       </Button>
                                   </div>
                               </li>
                           ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-8">
                {structures.map(structure => {
                    const hasBookingForThisStructure = userBookings.some(b => b.structureId === structure.id);
                    return (
                        <Card key={structure.id}>
                            <CardHeader>
                                <div className="flex items-start gap-4">
                                    {structure.photoURL && <Image src={structure.photoURL} alt={structure.name} width={100} height={75} className="rounded-lg object-cover aspect-[4/3]" />}
                                    <div className="flex-1">
                                        <CardTitle>{structure.name}</CardTitle>
                                        {hasBookingForThisStructure && <div className="text-orange-600 dark:text-orange-400 flex items-center gap-1.5 pt-2 text-xs"><AlertTriangle size={14}/> Você já possui um agendamento. Um novo substituirá o atual.</div>}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {structure.managementType === 'by_structure' ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                        {(structure.timeSlots || []).map(timeSlot => {
                                            const { status } = getStatusForSlot(structure, timeSlot);
                                            return <Button key={timeSlot.id} variant={status === 'meu_horario' ? 'default' : 'outline'} disabled={status !== 'disponivel'} onClick={() => setDialogState({ type: 'confirmBooking', data: { structure, timeSlot } })}>{timeSlot.startTime}</Button>;
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(structure.units || []).map(unit => (
                                            <div key={unit}>
                                                <h4 className="font-semibold mb-2">{unit}</h4>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                                    {(structure.timeSlots || []).map(timeSlot => {
                                                        const { status } = getStatusForSlot(structure, timeSlot, unit);
                                                        return <Button key={`${unit}-${timeSlot.id}`} variant={status === 'meu_horario' ? 'default' : 'outline'} disabled={status !== 'disponivel'} onClick={() => setDialogState({ type: 'confirmBooking', data: { structure, timeSlot, unit } })}>{timeSlot.startTime}</Button>;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            
            <AlertDialog open={dialogState.type === 'confirmBooking'} onOpenChange={(open) => !open && setDialogState({ type: null, data: {} })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Agendamento</AlertDialogTitle>
                        <AlertDialogDescription>
                            {userBookings.some(b => b.structureId === dialogState.data.structure?.id) 
                                ? `Você já tem uma reserva para ${dialogState.data.structure?.name}. Deseja substituí-la por este novo horário das ${dialogState.data.timeSlot?.startTime}?`
                                : `Deseja solicitar o agendamento de ${dialogState.data.structure?.name} ${dialogState.data.unit ? `(${dialogState.data.unit})` : ''} para as ${dialogState.data.timeSlot?.startTime}?`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBooking}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={dialogState.type === 'cancelBooking'} onOpenChange={(open) => !open && setDialogState({ type: null, data: {} })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Reserva</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja cancelar esta reserva? Esta ação não poderá ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Manter Reserva</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleCancelBooking}>Confirmar Cancelamento</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}