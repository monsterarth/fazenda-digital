"use client";

import React, { useState, useEffect } from 'react';
import * as firestore from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useGuest } from '@/context/GuestProvider';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Service, Booking } from "@/types";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import { Loader2, CalendarPlus, Clock, Wand2, Handshake, Info, Send, Calendar as CalendarIcon } from 'lucide-react';

// ## INÍCIO DA CORREÇÃO ##
// Corrigido o schema. z.date() por si só já torna o campo obrigatório.
const bookingSchema = z.object({
    date: z.date(),
    unit: z.string().optional(),
    timeSlotId: z.string().optional(),
    preferenceTime: z.string().optional(),
    selectedOptions: z.array(z.string()).optional(),
    notes: z.string().optional(),
});
// ## FIM DA CORREÇÃO ##

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function GuestServicesPage() {
    const { stay, isAuthenticated, isLoading: isGuestLoading } = useGuest();
    const router = useRouter();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [allBookingsForDay, setAllBookingsForDay] = useState<Booking[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDateForModal, setSelectedDateForModal] = useState(new Date());

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
    });

    useEffect(() => {
        if (!isGuestLoading && !isAuthenticated) {
            router.push('/portal');
        }
        const initializeDb = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
        };
        initializeDb();
    }, [isAuthenticated, isGuestLoading, router]);

    useEffect(() => {
        if (!db || !stay) return;

        const servicesQuery = firestore.query(firestore.collection(db, 'services'));
        const unsubscribeServices = firestore.onSnapshot(servicesQuery, (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
        });

        const bookingsQuery = firestore.query(firestore.collection(db, 'bookings'), firestore.where("stayId", "==", stay.id));
        const unsubscribeBookings = firestore.onSnapshot(bookingsQuery, (snapshot) => {
            setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
            setLoadingData(false);
        });

        return () => {
            unsubscribeServices();
            unsubscribeBookings();
        };
    }, [db, stay]);

    // **NOVO EFEITO**: Buscar todos os agendamentos do dia selecionado no modal
    useEffect(() => {
        if (!db || !selectedService) return;
        const dateStr = format(selectedDateForModal, 'yyyy-MM-dd');
        const allBookingsQuery = firestore.query(firestore.collection(db, 'bookings'), firestore.where('date', '==', dateStr), firestore.where('serviceId', '==', selectedService.id));
        
        const unsubscribe = firestore.onSnapshot(allBookingsQuery, (snapshot) => {
            const bookingsData = snapshot.docs.map(doc => doc.data() as Booking);
            setAllBookingsForDay(bookingsData);
        });
        return () => unsubscribe();
    }, [db, selectedDateForModal, selectedService]);

    const handleOpenModal = (service: Service) => {
        setSelectedService(service);
        const today = new Date();
        setSelectedDateForModal(today);
        form.reset({
            date: today,
            unit: service.units?.[0] || '',
            timeSlotId: '',
            preferenceTime: '',
            selectedOptions: [],
            notes: '',
        });
        setIsModalOpen(true);
    };

    const handleBookingSubmit: SubmitHandler<BookingFormValues> = async (data) => {
        if (!db || !stay || !selectedService) return;
        
        // **NOVA VALIDAÇÃO**
        if (selectedService.type === 'slots' && !data.timeSlotId) {
            toast.error("Por favor, selecione um horário.");
            return;
        }

        const toastId = toast.loading("Enviando sua solicitação...");
        try {
            const bookingData: Omit<Booking, 'id'> = {
                stayId: stay.id,
                serviceId: selectedService.id,
                serviceName: selectedService.name,
                date: format(data.date, 'yyyy-MM-dd'),
                status: 'solicitado',
                createdAt: firestore.Timestamp.now(),
                ...data.unit && { unit: data.unit },
                ...data.timeSlotId && { timeSlotId: data.timeSlotId, timeSlotLabel: selectedService.timeSlots.find(ts => ts.id === data.timeSlotId)?.label },
                ...data.preferenceTime && { preferenceTime: data.preferenceTime },
                ...data.selectedOptions && { selectedOptions: data.selectedOptions },
                ...data.notes && { notes: data.notes },
            };

            await firestore.addDoc(firestore.collection(db, 'bookings'), bookingData);
            toast.success("Solicitação enviada com sucesso!", { id: toastId });
            setIsModalOpen(false);

        } catch (error: any) {
            toast.error("Falha ao enviar solicitação.", { id: toastId, description: error.message });
        }
    };
    
    if (isGuestLoading || loadingData) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
    }

    const today = startOfDay(new Date());

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
            <Toaster richColors position="top-center" />
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-bold text-gray-800">Agendamento de Serviços</h1>
                    <p className="text-md text-gray-600">Explore e solicite as experiências que oferecemos.</p>
                </header>

                {bookings.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>Meus Agendamentos</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {bookings.map(booking => (
                                    <div key={booking.id} className="flex justify-between items-center p-2 border rounded-md">
                                        <div>
                                            <p className="font-semibold">{booking.serviceName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(booking.date.replace(/-/g, '\/')), "dd 'de' MMMM", { locale: ptBR })}
                                                {booking.timeSlotLabel && ` - ${booking.timeSlotLabel}`}
                                                {booking.preferenceTime && ` - Preferência: ${booking.preferenceTime}`}
                                            </p>
                                        </div>
                                        <Badge>{booking.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-800">Serviços Disponíveis</h2>
                    {services.map(service => (
                        <Card key={service.id}>
                            <CardHeader>
                                <CardTitle>{service.name}</CardTitle>
                                <CardDescription>
                                    {service.type === 'slots' && 'Este serviço opera com horários e unidades fixas para o dia de hoje.'}
                                    {service.type === 'preference' && 'Solicite este serviço para hoje informando sua preferência de horário.'}
                                    {service.type === 'on_demand' && 'Este serviço é sob demanda. Fale conosco para agendar.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => handleOpenModal(service)}>
                                    <CalendarPlus className="mr-2 h-4 w-4" /> Solicitar Agendamento
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {selectedService && (
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Agendar: {selectedService.name}</DialogTitle>
                                <DialogDescription>Preencha os detalhes abaixo para solicitar seu agendamento.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form id="booking-form" onSubmit={form.handleSubmit(handleBookingSubmit)} className="space-y-4 py-4">
                                    
                                    {selectedService.type === 'on_demand' ? (
                                         <FormField control={form.control} name="date" render={({ field }) => (
                                            <FormItem className="flex flex-col items-center"><FormLabel>Data Desejada</FormLabel><FormControl><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={{ before: today }} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    ) : (
                                        <div className="flex items-center justify-center text-center p-3 bg-slate-100 rounded-md">
                                            <CalendarIcon className="mr-2 h-5 w-5 text-slate-600"/>
                                            <p className="font-medium text-slate-800">
                                                Agendamento para hoje, {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                                            </p>
                                        </div>
                                    )}

                                    {selectedService.type === 'slots' && (
                                        <>
                                            <FormField control={form.control} name="unit" render={({ field }) => (
                                                <FormItem><FormLabel>Unidade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a unidade..." /></SelectTrigger></FormControl><SelectContent>{selectedService.units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name="timeSlotId" render={({ field }) => (
                                                <FormItem className="space-y-2"><FormLabel>Horário</FormLabel><FormControl>
                                                    <div className="grid grid-cols-3 gap-2">{selectedService.timeSlots.map(ts => {
                                                        const isBooked = allBookingsForDay.some(b => b.timeSlotId === ts.id && (b.status === 'confirmado' || b.status === 'solicitado'));
                                                        return <Button key={ts.id} type="button" variant={field.value === ts.id ? 'default' : 'outline'} onClick={() => field.onChange(ts.id)} disabled={isBooked}>{ts.label}</Button>
                                                    })}</div>
                                                </FormControl><FormMessage /></FormItem>
                                            )}/>
                                        </>
                                    )}

                                    {selectedService.type === 'preference' && (
                                        <>
                                            <FormField control={form.control} name="preferenceTime" render={({ field }) => (
                                                <FormItem><FormLabel>Preferência de Horário</FormLabel><FormControl><Input placeholder="Ex: Manhã, por volta das 10h" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            {selectedService.additionalOptions && selectedService.additionalOptions.length > 0 && (
                                                <FormField control={form.control} name="selectedOptions" render={() => (
                                                    <FormItem><FormLabel>Opções Adicionais</FormLabel>
                                                    {selectedService.additionalOptions?.map(opt => (
                                                        <FormField key={opt} control={form.control} name="selectedOptions" render={({ field }) => (
                                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(opt)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), opt]) : field.onChange(field.value?.filter(v => v !== opt))}} /></FormControl><FormLabel className="font-normal">{opt}</FormLabel></FormItem>
                                                        )}/>
                                                    ))}
                                                    </FormItem>
                                                )}/>
                                            )}
                                        </>
                                    )}

                                    {selectedService.type === 'on_demand' && (
                                        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-r-md">
                                            <div className="flex items-start gap-2">
                                                <Info className="h-5 w-5 mt-1"/>
                                                <div>
                                                    <h5 className="font-semibold">Instruções</h5>
                                                    <p className="text-sm">{selectedService.instructions}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <FormField control={form.control} name="notes" render={({ field }) => (
                                        <FormItem><FormLabel>Observações (opcional)</FormLabel><FormControl><Textarea placeholder="Alguma informação adicional que gostaria de nos passar?" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </form>
                            </Form>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" form="booking-form" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                    Enviar Solicitação
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </div>
    );
}