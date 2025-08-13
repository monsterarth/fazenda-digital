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
import { Loader2, CalendarCheck, AlertTriangle, XCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Componente para um botão de horário customizado
const TimeSlotButton = ({ status, timeSlot, onClick, ...props }: { status: string, timeSlot: TimeSlot, onClick?: () => void }) => {
    let variant: 'default' | 'secondary' | 'outline' = 'outline';
    let disabled = false;
    let className = "";

    switch (status) {
        case 'meu_horario':
            variant = 'default';
            className = "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md";
            break;
        case 'disponivel':
            variant = 'secondary';
            className = "bg-white/70 hover:bg-brand-light-green text-brand-dark-green border-brand-mid-green/40 shadow-sm";
            break;
        case 'indisponivel':
        case 'passou':
            disabled = true;
            className = "bg-brand-mid-green/30 text-brand-mid-green cursor-not-allowed line-through";
            break;
    }

    return (
        <Button 
            variant={variant} 
            disabled={disabled} 
            onClick={onClick} 
            className={cn("w-full h-auto text-sm py-2 px-1 transition-all", className)}
            {...props}
        >
            {timeSlot.startTime}
        </Button>
    );
};

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

            const bookingsQuery = firestore.query(
                firestore.collection(firestoreDb, 'bookings'),
                firestore.where('date', '==', today)
            );
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

    const getStatusForSlot = useCallback((structure: Structure, timeSlot: TimeSlot, unit?: string) => {
        const now = new Date();
        const slotStartTime = parse(`${today} ${timeSlot.startTime}`, 'yyyy-MM-dd HH:mm', new Date());

        if (isBefore(slotStartTime, now)) {
            return { status: 'passou' };
        }

        const bookingForSlot = bookings.find(b => 
            b.structureId === structure.id &&
            b.startTime === timeSlot.startTime &&
            (structure.managementType === 'by_structure' || b.unitId === unit)
        );

        if (bookingForSlot) {
            switch (bookingForSlot.status) {
                case 'disponivel':
                    return { status: 'disponivel' };
                case 'confirmado':
                case 'pendente':
                    if (stay && bookingForSlot.stayId === stay.id) {
                        return { status: 'meu_horario' };
                    }
                    return { status: 'indisponivel' };
                default:
                    return { status: 'indisponivel' };
            }
        }
        
        if (structure.defaultStatus === 'open') {
            return { status: 'disponivel' };
        }
        
        return { status: 'indisponivel' };
    }, [bookings, stay, today]);

    const handleBooking = async () => {
        const { structure, timeSlot, unit } = dialogState.data;
        if (!db || !stay || !structure || !timeSlot) {
            toast.error("Dados insuficientes para realizar o agendamento.");
            return;
        }
        
        // CORREÇÃO: Verificação mais robusta para agendamentos existentes
        const existingBookingForStructure = userBookings.find(b => b.structureId === structure.id);
        
        const toastId = toast.loading(existingBookingForStructure ? "Alterando seu agendamento..." : "Processando agendamento...");

        try {
            if (existingBookingForStructure) {
                // Deleta o agendamento anterior para a mesma estrutura
                await firestore.deleteDoc(firestore.doc(db, 'bookings', existingBookingForStructure.id));
            }
            
            const status = structure.approvalMode === 'automatic' ? 'confirmado' : 'pendente';
            const newBookingData: Omit<Booking, 'id' | 'createdAt'> = {
                structureId: structure.id,
                structureName: structure.name,
                unitId: unit || undefined,
                stayId: stay.id,
                guestId: stay.id,
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
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-brand-light-green">
                <Loader2 className="h-12 w-12 animate-spin text-brand-dark-green" />
                <p className="mt-4 text-brand-mid-green">Carregando agendamentos...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light-green text-brand-dark-green flex flex-col items-center p-4 md:p-8">
            <div className="w-full max-w-5xl">
                <div className="flex items-center gap-4 mb-6">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.back()} 
                        className="text-brand-dark-green hover:bg-brand-mid-green/20"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-brand-dark-green flex items-center gap-2">
                             <Sparkles className="h-7 w-7 text-brand-primary" /> Agendamentos
                        </h1>
                        <p className="text-brand-mid-green">Disponibilidade para hoje, {todayFormatted}.</p>
                    </div>
                </div>

                {userBookings.length > 0 && (
                    <Card className="mb-8 bg-brand-primary/10 border-brand-primary/30 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-brand-dark-green text-xl"><CalendarCheck className="text-brand-primary"/> Meus Agendamentos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                               {userBookings.map(b => (
                                   <li key={b.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm p-3 rounded-md bg-white/70 border border-brand-mid-green/20 shadow-sm">
                                       <div>
                                           <span className="font-semibold">{b.structureName}</span> 
                                           {b.unitId && <span className="text-brand-mid-green"> ({b.unitId})</span>}
                                           <span className="text-brand-mid-green ml-2 font-mono">{b.startTime} - {b.endTime}</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                           <Badge variant={b.status === 'confirmado' ? 'default' : 'secondary'} className={cn(b.status === 'confirmado' ? 'bg-brand-primary text-white' : 'bg-brand-mid-green/50 text-brand-dark-green')}>
                                               {b.status}
                                           </Badge>
                                           <Button 
                                               size="sm" 
                                               variant="ghost" 
                                               className="h-7 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" 
                                               onClick={() => setDialogState({ type: 'cancelBooking', data: { bookingId: b.id } })}
                                           >
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
                            <Card key={structure.id} className="bg-white/80 backdrop-blur-sm shadow-xl border-2 border-brand-mid-green/40">
                                <CardHeader>
                                    <div className="flex items-start gap-4">
                                        {structure.photoURL && <Image src={structure.photoURL} alt={structure.name} width={100} height={75} className="rounded-lg object-cover aspect-[4/3] shadow-md" />}
                                        <div className="flex-1">
                                            <CardTitle className="text-2xl font-bold">{structure.name}</CardTitle>
                                            {hasBookingForThisStructure && <div className="text-brand-primary flex items-center gap-1.5 pt-2 text-sm"><AlertTriangle size={14}/> Você já possui um agendamento. Um novo substituirá o atual.</div>}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {structure.managementType === 'by_structure' ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                            {(structure.timeSlots || []).map(timeSlot => {
                                                const { status } = getStatusForSlot(structure, timeSlot);
                                                return (
                                                    <TimeSlotButton 
                                                        key={timeSlot.id} 
                                                        status={status} 
                                                        timeSlot={timeSlot} 
                                                        onClick={() => setDialogState({ type: 'confirmBooking', data: { structure, timeSlot } })}
                                                    />
                                                );
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
                                                            return (
                                                                <TimeSlotButton 
                                                                    key={`${unit}-${timeSlot.id}`} 
                                                                    status={status} 
                                                                    timeSlot={timeSlot} 
                                                                    onClick={() => setDialogState({ type: 'confirmBooking', data: { structure, timeSlot, unit } })}
                                                                />
                                                            );
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
            </div>
            
            <Dialog open={dialogState.type === 'confirmBooking'} onOpenChange={(open) => !open && setDialogState({ type: null, data: {} })}>
                <DialogContent className="bg-white/90 backdrop-blur-sm">
                    <DialogHeader>
                        <DialogTitle className="text-brand-dark-green">Confirmar Agendamento</DialogTitle>
                        <DialogDescription className="text-brand-mid-green">
                            {userBookings.some(b => b.structureId === dialogState.data.structure?.id) 
                                ? `Você já tem uma reserva para ${dialogState.data.structure?.name}. Deseja substituí-la por este novo horário das ${dialogState.data.timeSlot?.startTime}?`
                                : `Deseja solicitar o agendamento de ${dialogState.data.structure?.name} ${dialogState.data.unit ? `(${dialogState.data.unit})` : ''} para as ${dialogState.data.timeSlot?.startTime}?`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogState({ type: null, data: {} })} className="hover:bg-brand-light-green text-brand-dark-green border-brand-mid-green/40">Voltar</Button>
                        <Button onClick={handleBooking} className="bg-brand-dark-green text-white hover:bg-brand-primary">Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogState.type === 'cancelBooking'} onOpenChange={(open) => !open && setDialogState({ type: null, data: {} })}>
                <DialogContent className="bg-white/90 backdrop-blur-sm">
                    <DialogHeader>
                        <DialogTitle className="text-brand-dark-green">Cancelar Reserva</DialogTitle>
                        <DialogDescription className="text-brand-mid-green">
                            Você tem certeza que deseja cancelar esta reserva? Esta ação não poderá ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogState({ type: null, data: {} })} className="hover:bg-brand-light-green text-brand-dark-green border-brand-mid-green/40">Manter Reserva</Button>
                        <Button onClick={handleCancelBooking} className="bg-destructive text-white hover:bg-destructive/90">Confirmar Cancelamento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}