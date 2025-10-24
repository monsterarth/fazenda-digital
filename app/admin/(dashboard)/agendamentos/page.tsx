// /app/admin/(dashboard)/agendamentos/page.tsx

"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as firestore from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { Structure, Booking } from '@/types/scheduling';
import { Stay } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { toast, Toaster } from 'sonner';
import { Calendar as CalendarIcon, Loader2, Lock, Unlock, User, Trash2, XSquare, CheckSquare, AlertTriangle, PlusCircle, Sparkles, BedDouble, Check, X, Bell, RefreshCw } from 'lucide-react';
import { format, startOfDay, isBefore, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { addActivityLogToBatch } from '@/lib/activity-logger';

// --- Tipos e Interfaces ---
type SlotStatusType = 'disponivel' | 'reservado' | 'pendente' | 'bloqueado' | 'fechado' | 'passou';
type DailyOverrides = { [structureId: string]: 'open' | 'closed' };
type SlotInfo = {
    id: string;
    status: SlotStatusType;
    structure: Structure;
    unit: string | null;
    startTime: string;
    endTime: string;
    booking?: Booking;
};
type Guest = { id: string; guestName: string; cabinName: string; };

// --- Componente de Horário (Slot Visual) ---
function TimeSlotDisplay({ slotInfo, onClick, inSelectionMode, isSelected }: {
    slotInfo: SlotInfo; onClick: () => void; inSelectionMode: boolean; isSelected: boolean;
}) {
    const visuals = useMemo(() => {
        switch (slotInfo.status) {
            case 'reservado': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', icon: <User className="h-4 w-4" />, label: slotInfo.booking?.guestName };
            case 'pendente': return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', icon: <User className="h-4 w-4 animate-pulse" />, label: slotInfo.booking?.guestName };
            case 'bloqueado': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', icon: <Lock className="h-4 w-4" />, label: 'Bloqueado' };
            case 'fechado': return { bg: 'bg-gray-200 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', icon: <Lock className="h-4 w-4" />, label: 'Fechado' };
            case 'passou': return { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-500 dark:text-gray-600', icon: slotInfo.booking ? <User className="h-4 w-4 opacity-50" /> : <Lock className="h-4 w-4 opacity-50" />, label: slotInfo.booking?.guestName || 'Passou' };
            default: return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', icon: <Unlock className="h-4 w-4" />, label: 'Disponível' };
        }
    }, [slotInfo]);

    return (
        <Button
            className={cn("w-full flex items-center p-2 rounded-md transition-all cursor-pointer h-auto justify-start", visuals.bg, isSelected ? 'ring-2 ring-blue-500' : 'hover:opacity-80')}
            onClick={onClick}
            disabled={slotInfo.status === 'passou'}
        >
            {inSelectionMode && <Checkbox checked={isSelected} className="mr-3" />}
            <div className={cn("flex items-center font-semibold text-sm", visuals.text)}>
                {visuals.icon}
                <span className="ml-2">{slotInfo.startTime}</span>
            </div>
            <span className={cn("text-xs truncate ml-auto pl-2 text-right", visuals.text)}>{visuals.label}</span>
        </Button>
    );
}

// --- Página Principal ---
export default function AdminBookingsDashboard() {
    const { user, isAdmin } = useAuth();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [structures, setStructures] = useState<Structure[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [dailyOverrides, setDailyOverrides] = useState<DailyOverrides>({});
    const [activeGuests, setActiveGuests] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
    const [modalState, setModalState] = useState<{ open: boolean, slotInfo: SlotInfo | null }>({ open: false, slotInfo: null });
    const [selectedStayId, setSelectedStayId] = useState<string>('');
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedSlots, setSelectedSlots] = useState<Map<string, SlotInfo>>(new Map());
    const isDateInPast = useMemo(() => isBefore(selectedDate, startOfDay(new Date())), [selectedDate]);

    useEffect(() => {
        if (!isAdmin) return;

        const initializeApp = async () => {
            const firestoreDb = await getFirebaseDb();
            if (!firestoreDb) { toast.error("Falha ao conectar ao banco."); setLoading(false); return; }
            setDb(firestoreDb);

            const unsubStructures = firestore.onSnapshot(firestore.collection(firestoreDb, 'structures'), snap => {
                setStructures(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Structure)));
            }, (error) => console.error("Erro no listener de structures:", error));
            
            const staysQuery = firestore.query(firestore.collection(firestoreDb, 'stays'), firestore.where("status", "==", "active"));
            const unsubStays = firestore.onSnapshot(staysQuery, snap => {
                const guestData = snap.docs.map(doc => {
                    const data = doc.data() as Stay;
                    return {
                        id: doc.id,
                        guestName: data.guestName || 'Hóspede sem nome',
                        cabinName: data.cabinName || 'Cabana?',
                    };
                });
                setActiveGuests(guestData);
            }, (error) => console.error("Erro no listener de stays:", error));
            
            return () => { unsubStructures(); unsubStays(); };
        };
        initializeApp();
    }, [isAdmin]);
    
    useEffect(() => {
        if (!db || !isAdmin) return;

        setLoading(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        const bookingsQuery = firestore.query(firestore.collection(db, 'bookings'), firestore.where('date', '==', dateStr));
        const unsubBookings = firestore.onSnapshot(bookingsQuery, (snapshot) => {
            const fetchedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            const populatedBookings = fetchedBookings.map(booking => {
                const guest = activeGuests.find(g => g.id === booking.stayId);
                return {
                    ...booking,
                    guestName: guest?.guestName || booking.guestName || 'Desconhecido'
                };
            });
            setBookings(populatedBookings);
            setLoading(false);
        }, (error) => {
            console.error("Erro no listener de bookings:", error);
            setLoading(false);
        });

        const overrideDocRef = firestore.doc(db, 'daily_overrides', dateStr);
        const unsubOverrides = firestore.onSnapshot(overrideDocRef, (doc) => {
            setDailyOverrides(doc.exists() ? doc.data() as DailyOverrides : {});
        }, (error) => {
            console.error("Erro no listener de daily_overrides:", error);
        });

        return () => { unsubBookings(); unsubOverrides(); };
    }, [db, selectedDate, isAdmin, activeGuests]);

    const pendingBookings = useMemo(() => {
        return bookings
            .filter(b => b.status === 'pendente')
            .sort((a, b) => (a.createdAt as firestore.Timestamp).toMillis() - (b.createdAt as firestore.Timestamp).toMillis());
    }, [bookings]);

    const bookingsMap = useMemo(() => {
        const map = new Map<string, Booking>();
        bookings.forEach(b => {
            const key = `${b.structureId}-${b.unitId ?? 'null'}-${b.startTime}`;
            map.set(key, b);
        });
        return map;
    }, [bookings]);

    const getSlotInfo = useCallback((structure: Structure, unit: string | null, timeSlot: any): SlotInfo => {
        const id = `${structure.id}-${unit ?? 'null'}-${timeSlot.startTime}`;
        const booking = bookingsMap.get(id);
        let status: SlotStatusType;
        const now = new Date();
        const slotDateTime = parse(`${format(selectedDate, 'yyyy-MM-dd')} ${timeSlot.startTime}`, 'yyyy-MM-dd HH:mm', new Date());

        if (isBefore(slotDateTime, now)) {
            status = 'passou';
        } else if (booking) {
            switch (booking.status) {
                case 'confirmado': status = 'reservado'; break;
                case 'pendente': status = 'pendente'; break;
                case 'bloqueado': status = 'bloqueado'; break;
                default: status = 'disponivel';
            }
        } else {
            const overrideStatus = dailyOverrides[structure.id];
            if (overrideStatus === 'open') {
                status = 'disponivel';
            } else if (overrideStatus === 'closed') {
                status = 'fechado';
            } else {
                status = structure.defaultStatus === 'open' ? 'disponivel' : 'fechado';
            }
        }

        return { id, status, structure, unit, startTime: timeSlot.startTime, endTime: timeSlot.endTime, booking };
    }, [bookingsMap, selectedDate, dailyOverrides]);
    
    const handleSlotClick = (slotInfo: SlotInfo) => {
        if (isDateInPast) return toast.info("Não é possível alterar disponibilidade de datas passadas.");
        if (selectionMode) {
            const newSelection = new Map(selectedSlots);
            if (newSelection.has(slotInfo.id)) newSelection.delete(slotInfo.id);
            else newSelection.set(slotInfo.id, slotInfo);
            setSelectedSlots(newSelection);
        } else {
            setModalState({ open: true, slotInfo });
            setSelectedStayId('');
        }
    };
    
    const handleOverrideAction = async (structureId: string, action: 'open' | 'revert') => {
        if (!db) return;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const toastId = toast.loading("Atualizando status do dia...");
        try {
            const overrideDocRef = firestore.doc(db, 'daily_overrides', dateStr);
            const updateData = { [structureId]: action === 'open' ? 'open' : firestore.deleteField() };
            await firestore.setDoc(overrideDocRef, updateData, { merge: true });
            toast.success("Status do dia atualizado!", { id: toastId });
        } catch(error: any) {
            toast.error("Falha ao atualizar status do dia.", { id: toastId, description: error.message });
        }
    };

    const handleModalAction = async (action: 'create' | 'block' | 'release' | 'cancel' | 'approve' | 'decline') => {
        if (!db || !modalState.slotInfo) return;
        const { structure, unit, startTime, endTime, booking } = modalState.slotInfo;
        const toastId = toast.loading("Processando...");

        try {
            const timeSlotObject = structure.timeSlots.find(ts => ts.startTime === startTime);
            if (!timeSlotObject) {
                throw new Error("Detalhes do horário não encontrados.");
            }

            const batch = firestore.writeBatch(db);
            const existingDocRef = booking ? firestore.doc(db, 'bookings', booking.id) : null;
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const collectionRef = firestore.collection(db, 'bookings');

            if (action === 'approve' && existingDocRef && booking) {
                batch.update(existingDocRef, { status: 'confirmado' });
                addActivityLogToBatch(batch, { type: 'booking_confirmed', actor: { type: 'admin', identifier: user?.email || 'Admin' }, details: `Agendamento de ${structure.name} para ${booking.guestName} aprovado.`, link: '/admin/agendamentos' });
                toast.success("Reserva aprovada!", { id: toastId });
            }
            else if (action === 'decline' && existingDocRef && booking) {
                batch.delete(existingDocRef);
                addActivityLogToBatch(batch, { type: 'booking_declined', actor: { type: 'admin', identifier: user?.email || 'Admin' }, details: `Agendamento de ${structure.name} para ${booking.guestName} recusado.`, link: '/admin/agendamentos' });
                toast.success("Solicitação recusada.", { id: toastId });
            }
            else if (action === 'cancel' && existingDocRef && booking) {
                batch.delete(existingDocRef);
                addActivityLogToBatch(batch, { type: 'booking_cancelled_by_admin', actor: { type: 'admin', identifier: user?.email || 'Admin' }, details: `Agendamento de ${structure.name} para ${booking.guestName} cancelado.`, link: '/admin/agendamentos' });
                toast.success("Reserva cancelada!", { id: toastId });
            }
            else if (action === 'release' && existingDocRef) {
                batch.delete(existingDocRef);
                toast.success("Horário liberado!", { id: toastId });
            }
            else if (action === 'block') {
                const blockBooking: Omit<Booking, 'id' | 'createdAt'> = { 
                    structureId: structure.id, 
                    structureName: structure.name, 
                    unitId: unit, 
                    stayId: 'admin', 
                    guestId: 'admin', // CORREÇÃO: Adicionada propriedade 'guestId'
                    date: dateStr, 
                    startTime, 
                    endTime, 
                    status: 'bloqueado', 
                    guestName: 'Admin', 
                    cabinName: 'N/A',
                    unit: unit ?? undefined,
                    timeSlot: timeSlotObject,
                };
                if (existingDocRef) batch.delete(existingDocRef);
                const newDocRef = firestore.doc(collectionRef);
                batch.set(newDocRef, { ...blockBooking, createdAt: firestore.serverTimestamp() });
                toast.success("Horário bloqueado!", { id: toastId });
            }
            else if (action === 'create') {
                const guest = activeGuests.find(g => g.id === selectedStayId);
                if (!guest) {
                    toast.error("Hóspede inválido.", { id: toastId });
                    return;
                };
                const newBooking: Omit<Booking, 'id' | 'createdAt'> = { 
                    structureId: structure.id, 
                    structureName: structure.name, 
                    unitId: unit, 
                    stayId: guest.id, 
                    guestId: guest.id, // CORREÇÃO: Adicionada propriedade 'guestId'
                    date: dateStr, 
                    startTime, 
                    endTime, 
                    status: 'confirmado', 
                    guestName: guest.guestName, 
                    cabinName: guest.cabinName,
                    unit: unit ?? undefined,
                    timeSlot: timeSlotObject,
                };
                if (existingDocRef) batch.delete(existingDocRef);
                const newDocRef = firestore.doc(collectionRef);
                batch.set(newDocRef, { ...newBooking, createdAt: firestore.serverTimestamp() });
                addActivityLogToBatch(batch, { type: 'booking_created_by_admin', actor: { type: 'admin', identifier: user?.email || 'Admin' }, details: `Agendamento de ${structure.name} criado para ${guest.guestName}.`, link: '/admin/agendamentos' });
                toast.success(`Reserva para ${guest.guestName} criada!`, { id: toastId });
            }
            
            await batch.commit();
            setModalState({ open: false, slotInfo: null });
        } catch (error: any) {
            toast.error(`Falha: ${error.message}`, { id: toastId });
        }
    };

    const handlePendingAction = async (bookingId: string, action: 'approve' | 'decline') => {
        if (!db) return;
        const toastId = toast.loading("Processando...");
        try {
            const batch = firestore.writeBatch(db);
            const docRef = firestore.doc(db, 'bookings', bookingId);
            const booking = bookings.find(b => b.id === bookingId);
            if (!booking) throw new Error("Agendamento não encontrado para log.");

            if (action === 'approve') {
                batch.update(docRef, { status: 'confirmado' });
                addActivityLogToBatch(batch, { type: 'booking_confirmed', actor: { type: 'admin', identifier: user?.email || 'Admin' }, details: `Agendamento de ${booking.structureName} para ${booking.guestName} aprovado.`, link: '/admin/agendamentos' });
                toast.success("Reserva aprovada!", { id: toastId });
            } else {
                batch.delete(docRef);
                addActivityLogToBatch(batch, { type: 'booking_declined', actor: { type: 'admin', identifier: user?.email || 'Admin' }, details: `Agendamento de ${booking.structureName} para ${booking.guestName} recusado.`, link: '/admin/agendamentos' });
                toast.success("Solicitação recusada.", { id: toastId });
            }
            await batch.commit();
        } catch (error: any) {
            toast.error(`Falha: ${error.message}`, { id: toastId });
        }
    };

    const handleBulkAction = async (action: 'block' | 'release') => {
        if (!db || selectedSlots.size === 0) return;
        const toastId = toast.loading(`${action === 'block' ? 'Bloqueando' : 'Liberando'} ${selectedSlots.size} horários...`);
        try {
            const batch = firestore.writeBatch(db);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
            selectedSlots.forEach(slot => {
                if (slot.booking) {
                    batch.delete(firestore.doc(db, 'bookings', slot.booking.id));
                }
    
                if (action === 'block') {
                    const docRef = firestore.doc(firestore.collection(db, 'bookings'));
                    
                    const timeSlotObject = slot.structure.timeSlots.find(ts => ts.startTime === slot.startTime);
                    if (!timeSlotObject) {
                        console.error(`Não foi possível encontrar o horário para ${slot.startTime} na estrutura ${slot.structure.name}`);
                        return; 
                    }

                    const baseBooking: Omit<Booking, 'id' | 'createdAt'> = {
                        structureId: slot.structure.id, 
                        structureName: slot.structure.name, 
                        unitId: slot.unit, 
                        stayId: 'admin', 
                        guestId: 'admin', // CORREÇÃO: Adicionada propriedade 'guestId'
                        date: dateStr, 
                        startTime: slot.startTime, 
                        endTime: slot.endTime, 
                        status: 'bloqueado', 
                        guestName: 'Admin', 
                        cabinName: 'N/A',
                        unit: slot.unit ?? undefined,
                        timeSlot: timeSlotObject
                    };
                    batch.set(docRef, { ...baseBooking, createdAt: firestore.serverTimestamp() });
                }
            });
            await batch.commit();
            toast.success("Ação em massa concluída!", { id: toastId });
            setSelectionMode(false);
            setSelectedSlots(new Map());
        } catch (error: any) {
            toast.error(`Falha na operação: ${error.message}`, { id: toastId });
        }
    };

    if (loading && structures.length === 0) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /> Carregando agendamentos...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 pb-24">
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Painel de Agendamentos</CardTitle>
                        <CardDescription>Gerencie reservas e disponibilidade das estruturas.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <Button disabled={isDateInPast} variant={selectionMode ? "destructive" : "outline"} onClick={() => { setSelectionMode(!selectionMode); setSelectedSlots(new Map()); }} className="w-full md:w-auto">
                            {selectionMode ? <XSquare className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                            {selectionMode ? "Cancelar" : "Ações em Massa"}
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full md:w-[280px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(startOfDay(date))} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
            </Card>

            {isDateInPast && <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/30"><CardContent className="p-3 text-amber-700 dark:text-amber-300 text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Modo de visualização. Não é possível alterar datas passadas.</CardContent></Card>}

            {!isDateInPast && pendingBookings.length > 0 && (
                <Card className="border-yellow-400 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-800"><Bell className="animate-ping" /> {pendingBookings.length} Nova(s) Solicitação(ões)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {pendingBookings.map(booking => (
                                <div key={booking.id} className="flex items-center justify-between p-2 bg-white rounded-md">
                                    <div className="text-sm">
                                        <span className="font-bold">{booking.guestName}</span> ({booking.cabinName}) solicitou <span className="font-bold">{booking.structureName}</span> às <span className="font-bold">{booking.startTime}</span>.
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600" onClick={() => handlePendingAction(booking.id, 'approve')}><Check size={16} /></Button>
                                        <Button size="icon" className="h-8 w-8" variant="destructive" onClick={() => handlePendingAction(booking.id, 'decline')}><X size={16} /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading && structures.length === 0 ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {structures.map(structure => (
                        <Card key={structure.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="flex items-center gap-3">
                                        <Image src={structure.photoURL} alt={structure.name} width={48} height={30} className="rounded-md object-cover aspect-video" />
                                        {structure.name}
                                    </CardTitle>
                                    {structure.defaultStatus === 'closed' && !isDateInPast && (
                                        dailyOverrides[structure.id] === 'open' ? (
                                            <Button size="sm" variant="outline" onClick={() => handleOverrideAction(structure.id, 'revert')} className="h-8 text-xs">
                                                <RefreshCw className="h-3 w-3 mr-1.5" /> Reverter
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => handleOverrideAction(structure.id, 'open')} className="h-8 text-xs">
                                                <Unlock className="h-3 w-3 mr-1.5" /> Abrir no dia
                                            </Button>
                                        )
                                    )}
                                </div>
                               </CardHeader>
                            <CardContent className="space-y-3">
                                {
                                    (structure.managementType === 'by_structure' ? [null] : structure.units).map((unit) => (
                                        <div key={unit ?? 'no-unit'}>
                                            {structure.managementType === 'by_unit' && <h4 className="text-sm font-semibold text-muted-foreground mb-1.5">{unit}</h4>}
                                            <div className="space-y-1">
                                                {(structure.timeSlots || []).map(timeSlot => {
                                                    const slotInfo = getSlotInfo(structure, unit, timeSlot);
                                                    return (
                                                        <TimeSlotDisplay
                                                            key={slotInfo.id}
                                                            slotInfo={slotInfo}
                                                            onClick={() => handleSlotClick(slotInfo)}
                                                            inSelectionMode={selectionMode}
                                                            isSelected={selectedSlots.has(slotInfo.id)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                }
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {selectionMode && !isDateInPast && (
                <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border-t p-4 shadow-lg rounded-t-lg flex items-center justify-center gap-4 z-50">
                    <span className="font-semibold text-sm">{selectedSlots.size} horário(s) selecionado(s).</span>
                    <Button size="sm" variant="destructive" onClick={() => handleBulkAction('block')} disabled={selectedSlots.size === 0}><Lock className="h-4 w-4 mr-2" />Bloquear</Button>
                    <Button size="sm" onClick={() => handleBulkAction('release')} disabled={selectedSlots.size === 0}><Unlock className="h-4 w-4 mr-2" />Liberar</Button>
                </div>
            )}

            {modalState.slotInfo && (
                <Dialog open={modalState.open} onOpenChange={(open) => !open && setModalState({ open: false, slotInfo: null })}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Gerenciar Horário</DialogTitle>
                            <DialogDescription>
                                {modalState.slotInfo.structure.name} ({modalState.slotInfo.unit ?? 'n/a'}) - {modalState.slotInfo.startTime}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <p className="font-semibold text-sm">Ações Rápidas</p>
                                <div className="flex flex-wrap gap-2">
                                    {modalState.slotInfo.status === 'pendente' && <>
                                        <Button className="bg-green-500 hover:bg-green-600" onClick={() => handleModalAction('approve')}><Check className="h-4 w-4 mr-2" />Aprovar Reserva</Button>
                                        <Button variant="destructive" onClick={() => handleModalAction('decline')}><X className="h-4 w-4 mr-2" />Recusar</Button>
                                    </>}
                                    {modalState.slotInfo.status === 'reservado' && <Button variant="outline" onClick={() => handleModalAction('cancel')}><Trash2 className="h-4 w-4 mr-2" />Cancelar Reserva</Button>}
                                    {modalState.slotInfo.status === 'bloqueado' && <Button variant="outline" onClick={() => handleModalAction('release')}><Unlock className="h-4 w-4 mr-2" />Desbloquear</Button>}
                                    {(modalState.slotInfo.status === 'fechado' || modalState.slotInfo.status === 'disponivel') && <Button variant="secondary" onClick={() => handleModalAction('block')}><Lock className="h-4 w-4 mr-2" />Bloquear Horário</Button>}
                                    {(modalState.slotInfo.status === 'fechado' || modalState.slotInfo.status === 'bloqueado') && <Button onClick={() => handleModalAction('release')}><Sparkles className="h-4 w-4 mr-2" />Abrir para Hóspedes</Button>}
                                </div>
                            </div>
                            <div className="border-t my-4"></div>
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm flex items-center gap-2"><BedDouble className="h-4 w-4" /> Criar / Alterar Reserva</h3>
                                <p className="text-xs text-muted-foreground">Selecione um hóspede ativo para criar uma nova reserva neste horário.</p>
                                {activeGuests.length > 0 ? (
                                    <Select value={selectedStayId} onValueChange={setSelectedStayId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione um hóspede..." /></SelectTrigger>
                                        <SelectContent className="max-h-[300px] overflow-y-auto"> {/* CORREÇÃO APLICADA AQUI */}
                                            {activeGuests.sort((a, b) => a.guestName.localeCompare(b.guestName)).map(g => <SelectItem key={g.id} value={g.id}>{g.guestName} ({g.cabinName})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="p-3 rounded-md bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <p>Nenhum hóspede com status "active" na coleção "stays".</p>
                                    </div>
                                )}
                                <Button onClick={() => handleModalAction('create')} disabled={!selectedStayId} className="w-full">
                                    <PlusCircle className="h-4 w-4 mr-2" /> Salvar Reserva para Hóspede
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}