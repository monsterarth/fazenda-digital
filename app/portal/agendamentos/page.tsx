"use client";

import React, { useState, useEffect } from 'react';
import * as firestore from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { Service, Booking, Cabin, TimeSlot } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast, Toaster } from 'sonner';
import { Loader2, AlertTriangle, Sparkles, Wind, Dog } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGuest } from '@/context/GuestProvider';

// CORREÇÃO: Schema de validação ajustado para maior robustez
const preferenceSchema = z.object({
    preferenceTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Selecione um horário válido."),
    // Corrigido para o formato Zod correto e tornado opcional
    additionalOptions: z.record(z.string(), z.boolean()).optional(),
    // Adicionado .default(false) para garantir que o valor seja sempre booleano
    hasPet: z.boolean().default(false), 
    petPolicyAgreed: z.boolean().default(false),
}).refine(data => !data.hasPet || data.petPolicyAgreed, {
    message: "Você deve concordar com a política sobre pets para continuar.",
    path: ["petPolicyAgreed"],
});

type PreferenceFormValues = z.infer<typeof preferenceSchema>;

export default function GuestBookingsPage() {
    const { stay, isLoading: isGuestLoading } = useGuest();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const [slotModal, setSlotModal] = useState<{ open: boolean; service?: Service, unit?: string, timeSlot?: TimeSlot }>({ open: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [preferenceModal, setPreferenceModal] = useState<{ open: boolean; service?: Service }>({ open: false });
    
    const preferenceForm = useForm<PreferenceFormValues>({
        resolver: zodResolver(preferenceSchema),
        defaultValues: { // Adicionado defaultValues para alinhar com o schema
            preferenceTime: "14:00",
            hasPet: false,
            petPolicyAgreed: false,
            additionalOptions: {},
        }
    });
    const hasPetValue = preferenceForm.watch('hasPet');

    useEffect(() => {
        const initializeApp = async () => {
            const firestoreDb = await getFirebaseDb();
            if (!firestoreDb) { toast.error("Falha ao conectar ao banco."); setLoading(false); return; }
            setDb(firestoreDb);
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

        const dateStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const bookingsQuery = firestore.query(firestore.collection(db, 'bookings'), firestore.where('date', '==', dateStr));
        const unsubBookings = firestore.onSnapshot(bookingsQuery, (snapshot) => {
            setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
            setLoading(false);
        });

        return () => { unsubServices(); unsubBookings(); };
    }, [db]);

    const isSlotAvailable = (service: Service, unit: string, timeSlotId: string): boolean => {
        const booking = bookings.find(b => b.serviceId === service.id && b.unit === unit && b.timeSlotId === timeSlotId);
        if (booking?.status === 'confirmado' || booking?.status === 'bloqueado') return false;
        if (service.defaultStatus === 'closed') return booking?.status === 'disponivel';
        return !booking;
    };
    
    const hasAlreadyBookedPreference = (serviceId: string) => {
        if (!stay?.cabinName) return false;
        return bookings.some(b => b.serviceId === serviceId && b.cabinName === stay.cabinName && (b.status === 'confirmado' || b.status === 'solicitado'));
    };
    
    const handleSlotBookingSubmit = async () => {
        if (!db || !slotModal.service || !slotModal.unit || !slotModal.timeSlot || !stay) return;

        setIsSubmitting(true);
        const { service, unit, timeSlot } = slotModal;
        const dateStr = format(startOfDay(new Date()), 'yyyy-MM-dd');

        try {
            const bookingsRef = firestore.collection(db, 'bookings');
            const cabinBookingQuery = firestore.query(bookingsRef,
                firestore.where('date', '==', dateStr),
                firestore.where('serviceId', '==', service.id),
                firestore.where('cabinName', '==', stay.cabinName),
                firestore.where('status', '==', 'confirmado')
            );

            const cabinSnapshot = await firestore.getDocs(cabinBookingQuery);
            if (!cabinSnapshot.empty) {
                throw new Error(`Sua cabana já agendou este serviço hoje.`);
            }

            await firestore.runTransaction(db, async (transaction) => {
                const slotQuery = firestore.query(bookingsRef,
                    firestore.where('date', '==', dateStr),
                    firestore.where('serviceId', '==', service.id),
                    firestore.where('unit', '==', unit),
                    firestore.where('timeSlotId', '==', timeSlot.id)
                );
                
                const slotSnapshot = await firestore.getDocs(slotQuery);
                const existingBookingDoc = slotSnapshot.docs.length > 0 ? slotSnapshot.docs[0] : null;

                if (existingBookingDoc) {
                    const existingBookingRef = firestore.doc(db, 'bookings', existingBookingDoc.id);
                    const freshBookingSnap = await transaction.get(existingBookingRef);
                    if (!freshBookingSnap.exists()) throw new Error("O horário foi removido. Atualize a página.");
                    
                    const existingBooking = freshBookingSnap.data() as Booking;
                    if (existingBooking.status === 'disponivel') {
                        transaction.update(existingBookingRef, { guestName: stay.guestName, cabinName: stay.cabinName, status: 'confirmado', createdAt: firestore.serverTimestamp() });
                    } else {
                        throw new Error("Este horário acabou de ser preenchido por outra pessoa.");
                    }
                } else {
                    if (service.defaultStatus === 'closed') throw new Error("Este horário não foi liberado.");
                    
                    const newBookingRef = firestore.doc(firestore.collection(db, 'bookings'));
                    transaction.set(newBookingRef, {
                        stayId: stay.id,
                        serviceId: service.id, serviceName: service.name, unit, date: dateStr, 
                        timeSlotId: timeSlot.id, timeSlotLabel: timeSlot.label,
                        guestName: stay.guestName, cabinName: stay.cabinName, status: 'confirmado', 
                        createdAt: firestore.serverTimestamp()
                    });
                }
            });

            toast.success("Agendamento confirmado com sucesso!");
            setSlotModal({ open: false });
        } catch (error: any) {
            toast.error(error.message || "Não foi possível realizar o agendamento.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleOpenPreferenceModal = (service: Service) => {
        const defaultOptions = service.additionalOptions?.reduce((acc, option) => {
            acc[option] = false;
            return acc;
        }, {} as Record<string, boolean>) || {};

        preferenceForm.reset({
            preferenceTime: '14:00',
            hasPet: false,
            petPolicyAgreed: false,
            additionalOptions: defaultOptions
        });
        setPreferenceModal({ open: true, service });
    };

    const handlePreferenceSubmit: SubmitHandler<PreferenceFormValues> = async (data) => {
        if (!db || !preferenceModal.service || !stay) return;
        
        const { service } = preferenceModal;
        const dateStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const toastId = toast.loading("Enviando sua solicitação...");

        if (hasAlreadyBookedPreference(service.id)) {
            toast.error("Sua cabana já solicitou este serviço hoje.", { id: toastId });
            return;
        }

        try {
            const selectedOptions = data.additionalOptions
                ? Object.entries(data.additionalOptions).filter(([, value]) => value).map(([key]) => key)
                : [];

            await firestore.addDoc(firestore.collection(db, 'bookings'), {
                stayId: stay.id,
                serviceId: service.id,
                serviceName: service.name,
                guestName: stay.guestName,
                cabinName: stay.cabinName,
                date: dateStr,
                status: 'solicitado',
                preferenceTime: data.preferenceTime,
                selectedOptions: selectedOptions,
                hasPet: data.hasPet,
                createdAt: firestore.serverTimestamp(),
                unit: 'N/A', 
            });

            toast.success("Solicitação enviada com sucesso!", { id: toastId });
            setPreferenceModal({ open: false });
        } catch (error: any) {
            toast.error(error.message || "Não foi possível enviar a solicitação.", { id: toastId });
        }
    };

    if (loading || isGuestLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <Toaster richColors position="top-center" />
            <div className="container mx-auto p-4 md:p-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Nossos Serviços</h1>
                    <p className="text-lg text-gray-500 mt-2">Veja o que oferecemos e agende sua experiência.</p>
                </header>
                
                <div className="space-y-10">
                    {services.map(service => (
                        <Card key={service.id} className="overflow-hidden shadow-lg border-2">
                             <CardHeader>
                                 <CardTitle className="flex items-center gap-3 text-2xl">
                                     {service.type === 'slots' ? <Sparkles className="text-primary"/> : <Wind className="text-green-500" />}
                                     {service.name}
                                 </CardTitle>
                                 <CardDescription>{service.type === 'slots' ? 'Escolha um horário e agende o seu uso.' : 'Solicite este serviço para hoje informando sua preferência.'}</CardDescription>
                             </CardHeader>
                             <CardContent>
                                 {service.type === 'slots' && (
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                         {service.units.map(unit => (
                                             <div key={unit} className="border rounded-lg p-4 space-y-2">
                                                 <h4 className="font-semibold text-lg">{unit}</h4>
                                                 {service.timeSlots.sort((a,b) => (a.startTime || '').localeCompare(b.startTime || '')).map(timeSlot => {
                                                     const available = isSlotAvailable(service, unit, timeSlot.id);
                                                     return (<Button key={timeSlot.id} variant={available ? 'outline' : 'secondary'} disabled={!available} onClick={() => setSlotModal({ open: true, service, unit, timeSlot })} className={cn("w-full justify-center", !available && "cursor-not-allowed line-through")}>{timeSlot.label}</Button>);
                                                 })}
                                             </div>
                                         ))}
                                     </div>
                                 )}
                                 {service.type === 'preference' && (
                                     <div className="flex justify-start">
                                         <Button size="lg" onClick={() => handleOpenPreferenceModal(service)}>
                                             Solicitar {service.name}
                                         </Button>
                                     </div>
                                 )}
                             </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <Dialog open={slotModal.open} onOpenChange={(open) => setSlotModal({ open: false })}>
                 <DialogContent>
                       <DialogHeader>
                           <DialogTitle>Confirmar Agendamento</DialogTitle>
                           <DialogDescription>
                               Serviço: {slotModal.service?.name} <br />
                               Unidade: {slotModal.unit} <br />
                               Horário: {slotModal.timeSlot?.label}
                           </DialogDescription>
                       </DialogHeader>
                       <DialogFooter>
                           <Button type="button" variant="ghost" onClick={() => setSlotModal({ open: false })}>Cancelar</Button>
                           <Button onClick={handleSlotBookingSubmit} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar"}</Button>
                       </DialogFooter>
                 </DialogContent>
            </Dialog>

            {preferenceModal.service && (
                 <Dialog open={preferenceModal.open} onOpenChange={(open) => {if(!open) setPreferenceModal({open: false})}}>
                     <DialogContent className="sm:max-w-[480px]">
                         <DialogHeader>
                             <DialogTitle className="text-2xl">Solicitar {preferenceModal.service.name}</DialogTitle>
                             <DialogDescription>Preencha os dados abaixo para solicitar o serviço para hoje.</DialogDescription>
                         </DialogHeader>
                         <Form {...preferenceForm}>
                             <form onSubmit={preferenceForm.handleSubmit(handlePreferenceSubmit)} className="space-y-6">
                                 <FormField name="preferenceTime" control={preferenceForm.control} render={({ field }) => (<FormItem><FormLabel>Horário de Preferência</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                                     <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                     <AlertTitle className="text-yellow-800">Atenção</AlertTitle>
                                     <AlertDescription className="text-yellow-700">O horário é uma preferência para auxiliar a equipe e não uma garantia de execução no exato momento.</AlertDescription>
                                 </Alert>
                                 {preferenceModal.service.additionalOptions && preferenceModal.service.additionalOptions.length > 0 && (
                                     <div className="space-y-2">
                                         <Label className="font-semibold">Serviços Adicionais (Opcional)</Label>
                                         <div className="space-y-2 rounded-md border p-4">
                                             {preferenceModal.service.additionalOptions.map(option => (
                                                 <FormField key={option} name={`additionalOptions.${option}`} control={preferenceForm.control} render={({ field }) => (
                                                     <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                         <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                                                         <FormLabel className="font-normal">{option}</FormLabel>
                                                     </FormItem>
                                                 )} />
                                             ))}
                                         </div>
                                     </div>
                                 )}
                                  <div className="space-y-3">
                                     <FormField name="hasPet" control={preferenceForm.control} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal flex items-center gap-2">Tenho pet na acomodação <Dog className="h-4 w-4"/></FormLabel></FormItem>)} />
                                     {hasPetValue && (
                                         <FormField name="petPolicyAgreed" control={preferenceForm.control} render={({ field }) => (
                                             <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-red-50 border-red-200">
                                                 <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                 <div className="space-y-1 leading-none">
                                                     <FormLabel className="text-red-800">Asseguro que o pet não estará na cabana no horário de preferência da limpeza.</FormLabel>
                                                     <FormMessage />
                                                 </div>
                                             </FormItem>
                                         )} />
                                     )}
                                   </div>
                                 <DialogFooter>
                                     <Button type="submit" disabled={preferenceForm.formState.isSubmitting} className="w-full sm:w-auto">
                                         {preferenceForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Solicitação"}
                                     </Button>
                                 </DialogFooter>
                             </form>
                         </Form>
                     </DialogContent>
                 </Dialog>
            )}
        </div>
    );
}
