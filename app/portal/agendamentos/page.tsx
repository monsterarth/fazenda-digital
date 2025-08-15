// src/app/portal/agendamentos/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Structure, Booking, TimeSlot } from '@/types/scheduling';
import { format, parse, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarCheck, AlertTriangle, XCircle, ArrowLeft, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGuest } from '@/context/GuestProvider';

// Componente TimeSlotButton (sem alterações)
const TimeSlotButton = ({ status, timeSlot, onClick, ...props }: { status: string, timeSlot: TimeSlot, onClick?: () => void }) => {
    let variant: 'default' | 'secondary' | 'outline' = 'outline';
    let disabled = false;
    let className = "";
    let icon = null;

    switch (status) {
        case 'meu_horario':
            variant = 'default';
            className = "bg-brand-primary hover:bg-brand-primary/90 text-white shadow-md";
            icon = <CalendarCheck className="h-4 w-4 mr-1"/>;
            break;
        case 'disponivel':
            variant = 'secondary';
            className = "bg-white/70 hover:bg-brand-light-green text-brand-dark-green border-brand-mid-green/40 shadow-sm";
            break;
        case 'bloqueado':
            disabled = true;
            className = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 line-through cursor-not-allowed";
            icon = <Lock className="h-4 w-4 mr-1"/>;
            break;
        case 'indisponivel':
            disabled = true;
            className = "bg-brand-mid-green/30 text-brand-mid-green cursor-not-allowed line-through";
            break;
        case 'passou':
            disabled = true;
            className = "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed line-through";
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
            {icon}
            {timeSlot.startTime}
        </Button>
    );
};

export default function GuestSchedulingPage() {
    // ++ INÍCIO DA CORREÇÃO: 'bookings' do usuário agora vem do provider ++
    const { stay, bookings: userBookings, isLoading: isGuestLoading } = useGuest();
    // ++ FIM DA CORREÇÃO ++
    const router = useRouter();
    const [structures, setStructures] = useState<Structure[]>([]);
    // Este estado 'allBookings' agora se refere a todos os agendamentos do dia, para checar disponibilidade
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [dailyOverrides, setDailyOverrides] = useState<{ [structureId: string]: 'open' | 'closed' }>({});
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
            if (!firestoreDb) {
                toast.error("Erro de conexão com o banco de dados.");
                setLoadingData(false);
                return;
            }

            const structuresQuery = firestore.query(firestore.collection(firestoreDb, 'structures'));
            const unsubStructures = firestore.onSnapshot(structuresQuery, snap => {
                setStructures(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Structure)));
                setLoadingData(false);
            }, error => {
                console.error("Erro ao carregar estruturas:", error);
                toast.error("Não foi possível carregar as opções de agendamento.");
                setLoadingData(false);
            });

            // Listener para TODOS os agendamentos do dia (para checar disponibilidade)
            const bookingsQuery = firestore.query(
                firestore.collection(firestoreDb, 'bookings'),
                firestore.where('date', '==', today)
            );
            const unsubBookings = firestore.onSnapshot(bookingsQuery, snap => {
                setAllBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
            }, error => {
                console.error("Erro ao carregar agendamentos existentes:", error);
                toast.error("Não foi possível verificar a disponibilidade em tempo real.");
            });

            const overridesDocRef = firestore.doc(firestoreDb, 'daily_overrides', today);
            const unsubOverrides = firestore.onSnapshot(overridesDocRef, snap => {
                setDailyOverrides(snap.exists() ? snap.data() as { [structureId: string]: 'open' | 'closed' } : {});
            }, error => {
                console.error("Erro ao carregar exceções diárias:", error);
            });

            return () => {
                unsubStructures();
                unsubBookings();
                unsubOverrides();
            };
        };

        initializeData();
    }, [stay, isGuestLoading, today]);

    const getStatusForSlot = useCallback((structure: Structure, timeSlot: TimeSlot, unit?: string) => {
        const now = new Date();
        const slotStartTime = parse(`${today} ${timeSlot.startTime}`, 'yyyy-MM-dd HH:mm', new Date());

        if (isBefore(slotStartTime, now)) {
            return { status: 'passou' };
        }

        const bookingForSlot = allBookings.find(b =>
            b.structureId === structure.id &&
            b.startTime === timeSlot.startTime &&
            (structure.managementType === 'by_structure' || b.unitId === unit)
        );

        if (bookingForSlot) {
            if (stay && bookingForSlot.stayId === stay.id) {
                return { status: 'meu_horario', booking: bookingForSlot };
            }
            if(bookingForSlot.status === 'bloqueado') {
                return { status: 'bloqueado' };
            }
            return { status: 'indisponivel' };
        }
        
        const overrideStatus = dailyOverrides[structure.id];
        if (overrideStatus === 'closed') {
            return { status: 'indisponivel' };
        }
        if (overrideStatus === 'open' || structure.defaultStatus === 'open') {
            return { status: 'disponivel' };
        }

        return { status: 'indisponivel' };
    }, [allBookings, stay, today, dailyOverrides]);
    
    // As funções handleBooking e handleCancelBooking permanecem as mesmas
    const handleBooking = async () => {
        const { structure, timeSlot, unit } = dialogState.data;
        if (!stay || !structure || !timeSlot) {
            toast.error("Dados insuficientes para realizar o agendamento.");
            return;
        }

        const auth = getAuth();
        if (!auth.currentUser) {
            toast.error("Usuário não autenticado.");
            return;
        }

        const existingBookingForStructure = userBookings.find(b => b.structureId === structure.id);
        const action = 'create';
        const bookingData = {
            structureId: structure.id,
            structureName: structure.name,
            unitId: unit || null,
            date: today,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            status: structure.approvalMode === 'automatic' ? 'confirmado' : 'pendente',
        };

        const toastId = toast.loading(existingBookingForStructure ? "Alterando seu agendamento..." : "Processando agendamento...");

        try {
            const res = await fetch('/api/portal/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
                },
                body: JSON.stringify({ action, bookingData })
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error);
            }

            const successMessage = structure.approvalMode === 'automatic'
                ? "Reserva confirmada com sucesso!"
                : "Solicitação enviada! Aguarde a confirmação no seu painel.";
            toast.success(successMessage, { id: toastId });

        } catch (error: any) {
            console.error("Erro ao agendar:", error);
            toast.error("Ocorreu um erro inesperado", { id: toastId, description: error.message });
        } finally {
            setDialogState({ type: null, data: {} });
        }
    };

    const handleCancelBooking = async () => {
        const { bookingId } = dialogState.data;
        if (!bookingId) return;

        const auth = getAuth();
        if (!auth.currentUser) {
            toast.error("Usuário não autenticado.");
            return;
        }

        const toastId = toast.loading("Cancelando sua reserva...");
        try {
            const res = await fetch('/api/portal/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
                },
                body: JSON.stringify({ action: 'cancel', bookingIdToCancel: bookingId })
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error);
            }

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
    
    // Filtra apenas os agendamentos do dia de hoje para exibir na lista
    const todaysUserBookings = userBookings.filter(b => b.date === today);

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
                
                {/* ++ INÍCIO DA CORREÇÃO: Utiliza a nova variável para a lista ++ */}
                {todaysUserBookings.length > 0 && (
                    <Card className="mb-8 bg-brand-primary/10 border-brand-primary/30 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-brand-dark-green text-xl"><CalendarCheck className="text-brand-primary"/> Meus Agendamentos de Hoje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                               {todaysUserBookings.map(b => (
                                   <li key={b.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm p-3 rounded-md bg-white/70 border border-brand-mid-green/20 shadow-sm">
                                       <div>
                                           <span className="font-semibold">{b.structureName}</span>
                                           {b.unitId && <span className="text-brand-mid-green"> ({b.unitId})</span>}
                                           <span className="text-brand-mid-green ml-2 font-mono">{b.startTime} - {b.endTime}</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                           <Badge variant={b.status === 'confirmado' ? 'default' : 'secondary'} className={cn(b.status === 'confirmado' ? 'bg-brand-primary text-white' : 'bg-brand-mid-green/50 text-brand-dark-green')}>
                                               {b.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
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
                {/* ++ FIM DA CORREÇÃO ++ */}

                <div className="space-y-8">
                    {structures.map(structure => {
                        const hasBookingForThisStructure = todaysUserBookings.some(b => b.structureId === structure.id);
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
                                                        onClick={() => setDialogState({ type: 'confirmBooking', data: { structure, timeSlot, hasExistingBooking: hasBookingForThisStructure } })}
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
                                                                    onClick={() => setDialogState({ type: 'confirmBooking', data: { structure, timeSlot, unit, hasExistingBooking: hasBookingForThisStructure } })}
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
                            {dialogState.data.hasExistingBooking
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