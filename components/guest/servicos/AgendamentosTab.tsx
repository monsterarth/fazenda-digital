"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Structure, Booking, TimeSlot } from '@/types/scheduling';
import { format, parse, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarCheck, Lock, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGuest } from '@/context/GuestProvider';

const TimeSlotButton = ({ status, timeSlot, onClick }: { status: string, timeSlot: TimeSlot, onClick?: () => void }) => {
    // ... (código do botão TimeSlotButton permanece o mesmo)
    let variant: 'default' | 'secondary' | 'outline' = 'outline';
    let disabled = false;
    let icon = null;
    let className = "";

    switch (status) {
        case 'meu_horario':
            variant = 'default';
            icon = <CalendarCheck className="h-4 w-4 mr-1"/>;
            break;
        case 'disponivel':
            variant = 'secondary';
            break;
        case 'indisponivel':
        case 'bloqueado':
            disabled = true;
            className = "bg-red-100 text-red-800 line-through";
            icon = <Lock className="h-4 w-4 mr-1"/>;
            break;
        case 'passou':
            disabled = true;
            className = "bg-gray-200 text-gray-500 line-through";
            break;
    }

    return (
        <Button
            variant={variant}
            disabled={disabled}
            onClick={onClick}
            className={cn("w-full h-auto text-sm py-2 px-1", className)}
        >
            {icon}
            {timeSlot.startTime}
        </Button>
    );
};

export function AgendamentosTab() {
    const { stay, bookings: userBookings, isLoading: isGuestLoading } = useGuest();
    const [structures, setStructures] = useState<Structure[]>([]);
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [dailyOverrides, setDailyOverrides] = useState<{ [structureId: string]: 'open' | 'closed' }>({});
    const [loadingData, setLoadingData] = useState(true);
    const [dialogState, setDialogState] = useState<{ type: 'confirmBooking' | 'cancelBooking' | null; data: any; }>({ type: null, data: {} });

    const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

    useEffect(() => {
        if (isGuestLoading) return;
        if (!stay) {
            setLoadingData(false);
            return;
        };

        const initializeData = async () => {
            const firestoreDb = await getFirebaseDb();
            if (!firestoreDb) {
                toast.error("Erro de conexão.");
                setLoadingData(false);
                return;
            }

            const unsubFunctions: (() => void)[] = [];

            const structuresQuery = firestore.query(firestore.collection(firestoreDb, 'structures'));
            unsubFunctions.push(firestore.onSnapshot(structuresQuery, snap => {
                setStructures(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Structure)));
                if(loadingData) setLoadingData(false);
            }));

            const bookingsQuery = firestore.query(
                firestore.collection(firestoreDb, 'bookings'),
                firestore.where('date', '==', today)
            );
            unsubFunctions.push(firestore.onSnapshot(bookingsQuery, snap => {
                setAllBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
            }));

            const overridesDocRef = firestore.doc(firestoreDb, 'daily_overrides', today);
            unsubFunctions.push(firestore.onSnapshot(overridesDocRef, snap => {
                setDailyOverrides(snap.exists() ? snap.data() as { [structureId: string]: 'open' | 'closed' } : {});
            }));

            return () => unsubFunctions.forEach(unsub => unsub());
        };

        const unsubPromise = initializeData();
        return () => {
            unsubPromise.then(unsub => unsub && unsub());
        }
    }, [stay, isGuestLoading, today, loadingData]);
    
    // ++ CORREÇÃO: A lógica agora inclui a 'unit' opcional para a verificação ++
    const getStatusForSlot = useCallback((structure: Structure, timeSlot: TimeSlot, unit?: string) => {
        const now = new Date();
        const slotStartTime = parse(timeSlot.startTime, 'HH:mm', new Date());
        if (isBefore(slotStartTime, now)) return { status: 'passou' };

        const bookingForSlot = allBookings.find(b =>
            b.structureId === structure.id &&
            b.startTime === timeSlot.startTime &&
            // Se for por estrutura, não checa a unidade. Se for por unidade, checa.
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
        if (overrideStatus === 'closed') return { status: 'indisponivel' };
        if (overrideStatus === 'open' || structure.defaultStatus === 'open') return { status: 'disponivel' };

        return { status: 'indisponivel' };
    }, [allBookings, stay, dailyOverrides]);
    
    const handleBooking = async () => {
        // ... (lógica handleBooking via API permanece a mesma)
        const { structure, timeSlot, unit } = dialogState.data;
        if (!stay || !structure || !timeSlot) return toast.error("Dados insuficientes.");

        const auth = getAuth();
        if (!auth.currentUser) return toast.error("Usuário não autenticado.");

        const bookingData = {
            structureId: structure.id,
            structureName: structure.name,
            unitId: unit || null, // Passa a unidade para a API
            date: today,
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
            status: structure.approvalMode === 'automatic' ? 'confirmado' : 'pendente',
        };

        const toastId = toast.loading("Processando agendamento...");
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
                },
                body: JSON.stringify({ action: 'create', bookingData })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast.success("Agendamento realizado!", { id: toastId });
        } catch (error: any) {
            toast.error("Ocorreu um erro", { id: toastId, description: error.message });
        } finally {
            setDialogState({ type: null, data: {} });
        }
    };

    const handleCancelBooking = async () => {
        // ... (lógica handleCancelBooking via API permanece a mesma)
        const { bookingId } = dialogState.data;
        if (!bookingId) return;

        const auth = getAuth();
        if (!auth.currentUser) return toast.error("Usuário não autenticado.");

        const toastId = toast.loading("Cancelando sua reserva...");
        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
                },
                body: JSON.stringify({ action: 'cancel', bookingIdToCancel: bookingId })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast.success("Reserva cancelada.", { id: toastId });
        } catch (error: any) {
            toast.error("Não foi possível cancelar.", { id: toastId, description: error.message });
        } finally {
            setDialogState({ type: null, data: {} });
        }
    };

    if (isGuestLoading || loadingData) {
        return <div className="flex justify-center items-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    const todaysUserBookings = userBookings.filter(b => b.date === today);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center">
                Disponibilidade para hoje, {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
            </h2>

            {todaysUserBookings.length > 0 && (
                <Card className="mb-8">
                    <CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck/> Meus Agendamentos</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {todaysUserBookings.map(b => (
                                <li key={b.id} className="flex justify-between items-center p-3 rounded-md bg-muted">
                                    <div>
                                        <span className="font-semibold">{b.structureName}</span>
                                        {b.unitId && <span className="text-muted-foreground"> ({b.unitId})</span>}
                                        <span className="text-muted-foreground ml-2">{b.startTime} - {b.endTime}</span>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-100" onClick={() => setDialogState({ type: 'cancelBooking', data: { bookingId: b.id } })}>
                                        <XCircle className="h-4 w-4 mr-1"/> Cancelar
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-8">
                {structures.map(structure => {
                    const hasBookingForThisStructure = todaysUserBookings.some(b => b.structureId === structure.id);
                    return (
                        <Card key={structure.id}>
                            <CardHeader>
                                <div className="flex items-start gap-4">
                                    {structure.photoURL && <Image src={structure.photoURL} alt={structure.name} width={80} height={60} className="rounded-lg object-cover" />}
                                    <div className="flex-1">
                                        <CardTitle>{structure.name}</CardTitle>
                                        <CardDescription>{structure.description}</CardDescription>
                                        {hasBookingForThisStructure && <div className="text-primary flex items-center gap-1.5 pt-1 text-sm"><AlertTriangle size={14}/> Um novo agendamento substituirá o atual.</div>}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* ++ INÍCIO DA CORREÇÃO CRÍTICA: Lógica para 'by_unit' e 'by_structure' ++ */}
                                {structure.managementType === 'by_structure' ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                        {(structure.timeSlots || []).map(timeSlot => {
                                            const { status, booking } = getStatusForSlot(structure, timeSlot);
                                            return (
                                                <TimeSlotButton
                                                    key={timeSlot.id}
                                                    status={status}
                                                    timeSlot={timeSlot}
                                                    onClick={() => {
                                                        if (status === 'disponivel') setDialogState({ type: 'confirmBooking', data: { structure, timeSlot, hasExistingBooking: hasBookingForThisStructure } });
                                                        if (status === 'meu_horario' && booking) setDialogState({ type: 'cancelBooking', data: { bookingId: booking.id } });
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(structure.units || []).map(unit => (
                                            <div key={unit}>
                                                <h4 className="font-semibold mb-2">{unit}</h4>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                    {(structure.timeSlots || []).map(timeSlot => {
                                                        const { status, booking } = getStatusForSlot(structure, timeSlot, unit);
                                                        return (
                                                            <TimeSlotButton
                                                                key={`${unit}-${timeSlot.id}`}
                                                                status={status}
                                                                timeSlot={timeSlot}
                                                                onClick={() => {
                                                                    if (status === 'disponivel') setDialogState({ type: 'confirmBooking', data: { structure, timeSlot, unit, hasExistingBooking: hasBookingForThisStructure } });
                                                                    if (status === 'meu_horario' && booking) setDialogState({ type: 'cancelBooking', data: { bookingId: booking.id } });
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* ++ FIM DA CORREÇÃO CRÍTICA ++ */}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Diálogos de confirmação e cancelamento (sem alterações) */}
            <Dialog open={dialogState.type === 'confirmBooking'} onOpenChange={(open) => !open && setDialogState({ type: null, data: {} })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Agendamento</DialogTitle>
                        <DialogDescription>
                            {dialogState.data.hasExistingBooking
                                ? `Substituir sua reserva de ${dialogState.data.structure?.name} pelo horário das ${dialogState.data.timeSlot?.startTime}?`
                                : `Confirmar agendamento de ${dialogState.data.structure?.name} ${dialogState.data.unit ? `(${dialogState.data.unit})` : ''} para as ${dialogState.data.timeSlot?.startTime}?`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogState({ type: null, data: {} })}>Voltar</Button>
                        <Button onClick={handleBooking}>Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogState.type === 'cancelBooking'} onOpenChange={(open) => !open && setDialogState({ type: null, data: {} })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar Reserva</DialogTitle>
                        <DialogDescription>Tem certeza que deseja cancelar esta reserva?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogState({ type: null, data: {} })}>Manter Reserva</Button>
                        <Button onClick={handleCancelBooking} variant="destructive">Confirmar Cancelamento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}