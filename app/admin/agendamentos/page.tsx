"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as firestore from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { Service, Booking, Stay } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import { Calendar as CalendarIcon, Loader2, Lock, Unlock, User, CheckSquare, XSquare, Check, X } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

type SlotStatusType = 'livre' | 'solicitado' | 'confirmado' | 'bloqueado' | 'fechado';

type SlotInfo = {
    id: string; 
    status: SlotStatusType;
    booking?: Booking & { stayInfo?: Stay };
    service: Service;
    unit: string;
    timeSlot: { id: string, label: string };
};

function TimeSlotDisplay({ slotInfo, onSlotClick, inSelectionMode, isSelected, onSelectSlot }: {
    slotInfo: SlotInfo,
    onSlotClick: () => void,
    inSelectionMode: boolean,
    isSelected: boolean,
    onSelectSlot: () => void,
}) {
    const getStatusVisuals = () => {
        switch (slotInfo.status) {
            case 'confirmado': return { bg: 'bg-blue-100', text: 'text-blue-800', icon: <User className="h-4 w-4" />, label: `${slotInfo.booking?.stayInfo?.guestName}` };
            case 'solicitado': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <User className="h-4 w-4" />, label: `Solicitado por ${slotInfo.booking?.stayInfo?.guestName}` };
            case 'bloqueado': return { bg: 'bg-red-100', text: 'text-red-800', icon: <Lock className="h-4 w-4" />, label: 'Bloqueado' };
            case 'fechado': return { bg: 'bg-gray-200', text: 'text-gray-600', icon: <Lock className="h-4 w-4" />, label: 'Fechado' };
            default: return { bg: 'bg-green-100', text: 'text-green-800', icon: <Unlock className="h-4 w-4" />, label: 'Livre' };
        }
    };
    const { bg, text, icon, label } = getStatusVisuals();
    
    const handleClick = () => {
        if (inSelectionMode) onSelectSlot();
        else onSlotClick();
    };

    return (
        <div className={cn("w-full flex items-center p-2 rounded-md transition-all cursor-pointer", bg, isSelected ? 'ring-2 ring-blue-500' : 'hover:opacity-90')} onClick={handleClick}>
            {inSelectionMode && <Checkbox checked={isSelected} className="mr-3" />}
            <div className={cn("flex items-center font-semibold text-sm", text)}>
                {icon}
                <span className="ml-2">{slotInfo.timeSlot.label}</span>
            </div>
            <span className="text-xs truncate ml-auto pl-2">{label}</span>
        </div>
    );
}

export default function BookingsCalendarPage() {
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [bookings, setBookings] = useState<(Booking & { stayInfo?: Stay })[]>([]);
    const [activeStays, setActiveStays] = useState<Stay[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
    const [editForm, setEditForm] = useState({ stayId: '' });

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [selectedBookingRequest, setSelectedBookingRequest] = useState<(Booking & {stayInfo?: Stay}) | null>(null);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedSlots, setSelectedSlots] = useState<Map<string, SlotInfo>>(new Map());

    useEffect(() => {
        const initializeApp = async () => {
            setLoading(true);
            const firestoreDb = await getFirebaseDb();
            if (!firestoreDb) { toast.error("Falha ao conectar ao banco."); setLoading(false); return; }
            setDb(firestoreDb);

            const staysQuery = firestore.query(firestore.collection(firestoreDb, 'stays'), firestore.where('status', '==', 'active'));
            const unsubStays = firestore.onSnapshot(staysQuery, (snapshot) => {
                setActiveStays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stay)));
            });
            return () => unsubStays();
        };
        initializeApp();
    }, []);

    useEffect(() => {
        if (!db) return;
        setLoading(true);

        const servicesQuery = firestore.query(firestore.collection(db, 'services'));
        const unsubServices = firestore.onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
        });

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const bookingsQuery = firestore.query(firestore.collection(db, 'bookings'), firestore.where('date', '==', dateStr));
        const unsubBookings = firestore.onSnapshot(bookingsQuery, async (snapshot) => {
            const bookingsDataPromises = snapshot.docs.map(async (doc) => {
                const booking = { id: doc.id, ...doc.data() } as Booking & { stayInfo?: Stay };
                if (booking.stayId) {
                    const stayRef = firestore.doc(db, 'stays', booking.stayId);
                    const staySnap = await firestore.getDoc(stayRef);
                    if (staySnap.exists()) {
                        booking.stayInfo = staySnap.data() as Stay;
                    }
                }
                return booking;
            });
            const bookingsData = await Promise.all(bookingsDataPromises);
            setBookings(bookingsData);
            setLoading(false);
        });

        return () => { unsubServices(); unsubBookings(); };
    }, [db, selectedDate]);

    const preferenceAndOnDemandBookings = useMemo(() => {
        return bookings.filter(b => b.status === 'solicitado' && 
            (services.find(s => s.id === b.serviceId)?.type === 'preference' || services.find(s => s.id === b.serviceId)?.type === 'on_demand'));
    }, [bookings, services]);

    const getSlotInfo = (service: Service, unit: string, timeSlot: { id: string; label: string; }): SlotInfo => {
        const id = `${service.id}-${unit}-${timeSlot.id}`;
        const booking = bookings.find(b => b.serviceId === service.id && b.unit === unit && b.timeSlotId === timeSlot.id);
        let status: SlotStatusType = 'livre';
        if (booking) {
            status = booking.status as SlotStatusType;
        } else if (service.defaultStatus === 'closed') {
            status = 'fechado';
        }
        return { id, status, booking, service, unit, timeSlot };
    };

    const handleSlotClick = (slotInfo: SlotInfo) => {
        if (selectionMode) { handleSelectSlot(slotInfo); return; }
        setSelectedSlot(slotInfo);
        setEditForm({ stayId: slotInfo.booking?.stayId || '' });
        setIsModalOpen(true);
    };
    
    const handleRequestClick = (booking: Booking & {stayInfo?: Stay}) => {
        setSelectedBookingRequest(booking);
        setIsRequestModalOpen(true);
    }

    const handleSelectSlot = (slotInfo: SlotInfo) => {
        const newSelection = new Map(selectedSlots);
        if (newSelection.has(slotInfo.id)) {
            newSelection.delete(slotInfo.id);
        } else {
            newSelection.set(slotInfo.id, slotInfo);
        }
        setSelectedSlots(newSelection);
    };

    const handleBulkAction = async (action: 'block' | 'open') => {
        if (!db || selectedSlots.size === 0) return;
        const toastId = toast.loading(`Processando ${selectedSlots.size} horários...`);
        try {
            const batch = firestore.writeBatch(db);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            
            selectedSlots.forEach(slot => {
                const bookingExists = !!slot.booking?.id;

                if (action === 'open') {
                    if(bookingExists) batch.delete(firestore.doc(db, 'bookings', slot.booking!.id));
                } else if (action === 'block') {
                    const blockData = {
                        serviceId: slot.service.id, serviceName: slot.service.name, unit: slot.unit,
                        date: dateStr, timeSlotId: slot.timeSlot.id, timeSlotLabel: slot.timeSlot.label,
                        status: 'bloqueado', createdAt: firestore.serverTimestamp()
                    };
                    if (bookingExists) {
                        batch.update(firestore.doc(db, 'bookings', slot.booking!.id), blockData);
                    } else { 
                        const newBookingRef = firestore.doc(firestore.collection(db, 'bookings'));
                        batch.set(newBookingRef, blockData);
                    }
                }
            });

            await batch.commit();
            toast.success("Ação em massa concluída com sucesso!", { id: toastId });
            setSelectionMode(false);
            setSelectedSlots(new Map());
        } catch (error: any) {
            toast.error("Falha na ação em massa.", { id: toastId, description: error.message });
        }
    }

    const handleModalAction = async (action: 'create' | 'cancel' | 'block' | 'unblock') => {
        if (!db || !selectedSlot) return;
        const { service, unit, timeSlot, booking } = selectedSlot;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const toastId = toast.loading("Processando...");

        try {
            if (action === 'create') {
                if (!editForm.stayId) { toast.error("Selecione um hóspede.", { id: toastId }); return; }
                const stay = activeStays.find(s => s.id === editForm.stayId);
                const newBookingData = {
                    serviceId: service.id, serviceName: service.name, unit, date: dateStr,
                    timeSlotId: timeSlot.id, timeSlotLabel: timeSlot.label,
                    stayId: stay?.id, 
                    status: 'confirmado', createdAt: firestore.serverTimestamp()
                };
                if(booking?.id) {
                    await firestore.updateDoc(firestore.doc(db, 'bookings', booking.id), newBookingData);
                } else {
                    await firestore.addDoc(firestore.collection(db, 'bookings'), newBookingData);
                }
                toast.success("Reserva criada com sucesso!", { id: toastId });
            }
            else if (action === 'cancel' && booking?.id) {
                await firestore.deleteDoc(firestore.doc(db, 'bookings', booking.id));
                toast.success("Reserva cancelada!", { id: toastId });
            }
            else if (action === 'block') {
                const blockData = {
                    serviceId: service.id, serviceName: service.name, unit, date: dateStr,
                    timeSlotId: timeSlot.id, timeSlotLabel: timeSlot.label,
                    status: 'bloqueado', createdAt: firestore.serverTimestamp()
                };
                if (booking?.id) {
                    await firestore.updateDoc(firestore.doc(db, 'bookings', booking.id), blockData);
                } else {
                    await firestore.addDoc(firestore.collection(db, 'bookings'), blockData);
                }
                toast.success("Horário bloqueado!", { id: toastId });
            }
            else if (action === 'unblock' && booking?.id) {
                 await firestore.deleteDoc(firestore.doc(db, 'bookings', booking.id));
                 toast.success("Horário desbloqueado!", { id: toastId });
            }
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error(`Falha na operação: ${error.message}`, { id: toastId });
        }
    };
    
    const handleUpdateBookingStatus = async (bookingId: string, status: Booking['status']) => {
        if(!db) return;
        const toastId = toast.loading("Atualizando status...");
        try {
            await firestore.updateDoc(firestore.doc(db, 'bookings', bookingId), { status });
            toast.success("Status atualizado com sucesso!", { id: toastId });
            setIsRequestModalOpen(false);
        } catch (error: any) {
            toast.error("Falha ao atualizar status.", { id: toastId, description: error.message });
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Agenda de Serviços</CardTitle>
                        <CardDescription>Gerencie agendamentos e disponibilidade.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <Button variant={selectionMode ? "destructive" : "outline"} onClick={() => { setSelectionMode(!selectionMode); setSelectedSlots(new Map()); }}>
                            {selectionMode ? <XSquare className="h-4 w-4 mr-2"/> : <CheckSquare className="h-4 w-4 mr-2" />}
                            {selectionMode ? "Cancelar Seleção" : "Selecionar Vários"}
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full md:w-[280px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(startOfDay(date))} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                {selectionMode && (
                    <CardContent className="pt-4 border-t">
                        <div className="flex flex-wrap items-center gap-2">
                             <p className="text-sm font-medium">{selectedSlots.size} horários selecionados.</p>
                             <Button size="sm" onClick={() => handleBulkAction('open')} disabled={selectedSlots.size === 0}><Unlock className="h-4 w-4 mr-2"/>Liberar / Abrir</Button>
                             <Button size="sm" variant="secondary" onClick={() => handleBulkAction('block')} disabled={selectedSlots.size === 0}><Lock className="h-4 w-4 mr-2"/>Bloquear / Fechar</Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {loading ? <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div> : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                         {services.filter(s => s.type === 'slots').map(service => (
                            <React.Fragment key={service.id}>
                                {service.units.map(unit => (
                                    <Card key={`${service.id}-${unit}`}>
                                        <CardHeader>
                                            <CardTitle>{service.name}</CardTitle>
                                            <CardDescription>{unit}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                            {service.timeSlots.sort((a,b) => a.label.localeCompare(b.label)).map(slot => {
                                                const slotInfo = getSlotInfo(service, unit, slot);
                                                return <TimeSlotDisplay key={slot.id} slotInfo={slotInfo} onSlotClick={() => handleSlotClick(slotInfo)} inSelectionMode={selectionMode} isSelected={selectedSlots.has(slotInfo.id)} onSelectSlot={() => handleSelectSlot(slotInfo)} />
                                            })}
                                        </CardContent>
                                    </Card>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                         <Card>
                            <CardHeader><CardTitle>Solicitações Pendentes</CardTitle></CardHeader>
                            <CardContent>
                                {preferenceAndOnDemandBookings.length > 0 ? (
                                    <div className="space-y-2">
                                        {preferenceAndOnDemandBookings.map(booking => (
                                            <div key={booking.id} className="flex justify-between items-center p-2 border rounded-md bg-yellow-50 cursor-pointer hover:bg-yellow-100" onClick={() => handleRequestClick(booking)}>
                                                <div>
                                                    <p className="font-semibold">{booking.serviceName}</p>
                                                    <p className="text-sm text-yellow-800">{booking.stayInfo?.guestName} ({booking.stayInfo?.cabinName})</p>
                                                    <p className="text-xs text-muted-foreground">{booking.preferenceTime || 'Sob demanda'}</p>
                                                </div>
                                                <Badge variant="secondary">Revisar</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação pendente.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
            
            <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Revisar Solicitação</DialogTitle><DialogDescription>{selectedBookingRequest?.serviceName}</DialogDescription></DialogHeader>
                    <div className="py-4 space-y-2">
                        <p><strong>Hóspede:</strong> {selectedBookingRequest?.stayInfo?.guestName} ({selectedBookingRequest?.stayInfo?.cabinName})</p>
                        <p><strong>Preferência:</strong> {selectedBookingRequest?.preferenceTime || 'Não especificado'}</p>
                        {selectedBookingRequest?.selectedOptions && <p><strong>Opções:</strong> {selectedBookingRequest.selectedOptions.join(', ')}</p>}
                        {selectedBookingRequest?.notes && <p><strong>Notas:</strong> {selectedBookingRequest.notes}</p>}
                    </div>
                    <DialogFooter className="gap-2">
                         <Button variant="destructive" onClick={() => handleUpdateBookingStatus(selectedBookingRequest!.id, 'cancelado_pelo_admin')}><X className="h-4 w-4 mr-2"/>Recusar</Button>
                         <Button onClick={() => handleUpdateBookingStatus(selectedBookingRequest!.id, 'confirmado')}><Check className="h-4 w-4 mr-2"/>Confirmar Agendamento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedSlot && (
                 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Gerenciar Horário</DialogTitle>
                            <DialogDescription>{selectedSlot.service.name} ({selectedSlot.unit}) - {selectedSlot.timeSlot.label}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <p>Status atual: <Badge>{selectedSlot.status}</Badge></p>
                            {selectedSlot.booking?.stayInfo && <p className="mt-2">Reservado por: {selectedSlot.booking.stayInfo.guestName} ({selectedSlot.booking.stayInfo.cabinName})</p>}
                           
                            {(selectedSlot.status === 'livre' || selectedSlot.status === 'fechado') && (
                                <div className="space-y-2 pt-4 border-t">
                                    <Label htmlFor="stayId">Agendar para Hóspede</Label>
                                    <Select value={editForm.stayId} onValueChange={(value) => setEditForm({ stayId: value })}>
                                        <SelectTrigger><SelectValue placeholder="Selecione uma estadia ativa..." /></SelectTrigger>
                                        <SelectContent>
                                            {activeStays.map(s => <SelectItem key={s.id} value={s.id}>{s.guestName} ({s.cabinName})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="flex-wrap justify-end gap-2">
                            <DialogClose asChild><Button type="button" variant="outline">Fechar</Button></DialogClose>
                            {selectedSlot.status === 'solicitado' && <Button onClick={() => handleUpdateBookingStatus(selectedSlot.booking!.id, 'confirmado')}><Check className="h-4 w-4 mr-2"/>Confirmar</Button>}
                            {selectedSlot.status === 'confirmado' && <Button variant="destructive" onClick={() => handleModalAction('cancel')}>Cancelar Reserva</Button>}
                            {(selectedSlot.status === 'livre' || selectedSlot.status === 'fechado') && <Button onClick={() => handleModalAction('create')} disabled={!editForm.stayId}>Agendar</Button>}
                            {(selectedSlot.status === 'livre' || selectedSlot.status === 'solicitado') && <Button variant="secondary" onClick={() => handleModalAction('block')}>Bloquear</Button>}
                            {selectedSlot.status === 'bloqueado' && <Button variant="secondary" onClick={() => handleModalAction('unblock')}>Desbloquear</Button>}
                        </DialogFooter>
                    </DialogContent>
                 </Dialog>
            )}
        </div>
    );
}