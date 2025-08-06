"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getFirebaseDb } from '@/lib/firebase'; 
import * as firestore from 'firebase/firestore';
import { useGuest } from '@/context/GuestProvider';
import { Structure, Booking, TimeSlot } from '@/types/scheduling';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarCheck, AlertTriangle } from 'lucide-react';
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
import { toast, Toaster } from 'sonner';
import Image from 'next/image';

export default function GuestSchedulingPage() {
    const { stay, isLoading: isGuestLoading } = useGuest();
    const router = useRouter();

    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [structures, setStructures] = useState<Structure[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    const [alertState, setAlertState] = useState<{ open: boolean, structure?: Structure, timeSlot?: TimeSlot, unit?: string }>({ open: false });

    const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
    const todayFormatted = useMemo(() => format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR }), []);

    useEffect(() => {
        if (!isGuestLoading && !stay) {
            router.push('/portal');
        }
    }, [stay, isGuestLoading, router]);

    useEffect(() => {
        const initializeData = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);

            if (!firestoreDb) {
                toast.error("Erro de conexão.");
                setLoadingData(false);
                return;
            }

            const structuresQuery = firestore.query(firestore.collection(firestoreDb, 'structures'));
            const unsubStructures = firestore.onSnapshot(structuresQuery, snap => {
                setStructures(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Structure)));
                setLoadingData(false);
            });

            const bookingsQuery = firestore.query(firestore.collection(firestoreDb, 'bookings'), firestore.where('date', '==', today));
            const unsubBookings = firestore.onSnapshot(bookingsQuery, snap => {
                setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
            });
            
            return () => { unsubStructures(); unsubBookings(); };
        };
        initializeData();
    }, [today]);

    const userBookings = useMemo(() => {
        if (!stay) return [];
        return bookings.filter(b => b.stayId === stay.id && b.status === 'confirmado');
    }, [bookings, stay]);

    const handleBooking = async () => {
        const { structure, timeSlot, unit } = alertState;
        if (!db || !stay || !structure || !timeSlot) {
            return toast.error("Não foi possível identificar sua estadia para fazer a reserva.");
        }
        
        const existingBooking = userBookings.find(b => b.structureId === structure.id);
        const toastId = toast.loading(existingBooking ? "Alterando agendamento..." : "Solicitando agendamento...");

        try {
            if(existingBooking) await firestore.deleteDoc(firestore.doc(db, 'bookings', existingBooking.id));
            
            // ## INÍCIO DA CORREÇÃO ##
            // O campo 'guestId' agora usa o 'stay.id' como um identificador de usuário confiável para o contexto do portal.
            const newBooking: Omit<Booking, 'id' | 'createdAt'> = {
                structureId: structure.id,
                structureName: structure.name,
                unitId: unit || '',
                stayId: stay.id,
                guestId: stay.id, // Usando o stay.id para preencher o campo guestId
                guestName: stay.guestName,
                cabinId: stay.cabinName,
                date: today,
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
                status: 'pendente',
            };
            // ## FIM DA CORREÇÃO ##

            await firestore.addDoc(firestore.collection(db, 'bookings'), { ...newBooking, createdAt: firestore.serverTimestamp() });
            toast.success("Solicitação enviada! Aguarde a confirmação da recepção.", { id: toastId });
        } catch(error: any) {
            toast.error("Ocorreu um erro", { id: toastId, description: error.message });
        } finally {
            setAlertState({ open: false });
        }
    };
    
    const getStatusForSlot = (structure: Structure, timeSlot: TimeSlot, unit?: string) => {
        const now = new Date();
        const slotTime = parse(timeSlot.startTime, 'HH:mm', new Date());
        if (slotTime < now) return { status: 'passou' };

        const booking = bookings.find(b => 
            b.startTime === timeSlot.startTime && 
            b.structureId === structure.id &&
            (structure.managementType === 'by_structure' || b.unitId === unit)
        );
        
        if (booking) {
            if (booking.status === 'confirmado' && stay && booking.stayId === stay.id) return { status: 'meu_horario' };
            if (booking.status === 'confirmado' || booking.status === 'cancelado') return { status: 'indisponivel' };
            if (booking.status === 'disponivel') return { status: 'disponivel' };
        }
        
        if (structure.defaultStatus === 'open') return { status: 'disponivel' };
        return { status: 'indisponivel' };
    };

    if (isGuestLoading || loadingData || !stay) {
        return <div className="flex flex-col justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /><p className="mt-4 text-muted-foreground">Carregando...</p></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <Toaster richColors position="top-center" />
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Agendamentos</h1>
                <p className="text-muted-foreground">Disponibilidade para hoje, {todayFormatted}.</p>
            </div>
            
            {userBookings.length > 0 && (
                <Card className="mb-8 bg-blue-50 border-blue-200 dark:bg-blue-900/30">
                    <CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck /> Meus Agendamentos de Hoje</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                           {userBookings.map(b => (
                               <li key={b.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-white dark:bg-background">
                                   <div><span className="font-semibold">{b.structureName}</span> {b.unitId && `(${b.unitId})`}<span className="text-muted-foreground ml-2">{b.startTime} - {b.endTime}</span></div>
                                   <Badge>{b.status}</Badge>
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
                            <CardHeader className="flex flex-row items-center gap-4">
                                <Image src={structure.photoURL} alt={structure.name} width={100} height={60} className="rounded-lg object-cover aspect-video" />
                                <div>
                                    <CardTitle>{structure.name}</CardTitle>
                                    {hasBookingForThisStructure && <CardDescription className="text-orange-600 flex items-center gap-1 pt-1"><AlertTriangle size={14}/> Você já possui um agendamento para esta estrutura hoje.</CardDescription>}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {structure.managementType === 'by_structure' ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                        {(structure.timeSlots || []).map(timeSlot => {
                                            const slotInfo = getStatusForSlot(structure, timeSlot);
                                            return <Button key={timeSlot.id} variant={slotInfo.status === 'meu_horario' ? 'default' : 'outline'} disabled={slotInfo.status !== 'disponivel'} onClick={() => setAlertState({ open: true, structure, timeSlot })}>{timeSlot.startTime}</Button>;
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {structure.units.map(unit => (
                                            <div key={unit}>
                                                <h4 className="font-semibold mb-2">{unit}</h4>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                                                    {(structure.timeSlots || []).map(timeSlot => {
                                                        const slotInfo = getStatusForSlot(structure, timeSlot, unit);
                                                        return <Button key={`${unit}-${timeSlot.id}`} variant={slotInfo.status === 'meu_horario' ? 'default' : 'outline'} disabled={slotInfo.status !== 'disponivel'} onClick={() => setAlertState({ open: true, structure, timeSlot, unit })}>{timeSlot.startTime}</Button>;
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
            
            <AlertDialog open={alertState.open} onOpenChange={(open) => setAlertState({ ...alertState, open })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Agendamento</AlertDialogTitle>
                        <AlertDialogDescription>
                            {userBookings.some(b => b.structureId === alertState.structure?.id) 
                                ? `Você já tem uma reserva para ${alertState.structure?.name}. Deseja substituí-la por este novo horário das ${alertState.timeSlot?.startTime}?`
                                : `Deseja solicitar o agendamento de ${alertState.structure?.name} ${alertState.unit ? `(${alertState.unit})` : ''} para as ${alertState.timeSlot?.startTime}?`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBooking}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}