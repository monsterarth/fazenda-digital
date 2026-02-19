"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Package, Sparkles, Construction, CheckCircle, Clock, Calendar } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Tipos explícitos que agora lidam com os dois formatos de agendamento
interface TimeSlot { id: string; startTime: string; endTime: string; label: string; }
interface Booking {
  id: string;
  structureName: string;
  date: string;
  // O booking pode ter o objeto completo ou os campos separados
  timeSlot?: TimeSlot;
  startTime?: string;
  endTime?: string;
}
type RequestStatus = 'pending' | 'in_progress' | 'completed';
type RequestType = 'item' | 'cleaning' | 'maintenance';
interface Request { id: string; type: RequestType; status: RequestStatus; details: { quantity?: number; itemName?: string; }; createdAt: firestore.Timestamp; }

const RequestStatusTracker = ({ status }: { status: RequestStatus }) => {
    // ... (código do tracker permanece o mesmo)
    const steps = [
        { id: 'pending', label: 'Pendente' },
        { id: 'in_progress', label: 'Em Andamento' },
        { id: 'completed', label: 'Concluído' },
    ];
    const currentStepIndex = steps.findIndex(step => step.id === status);
    return (
        <div className="flex items-center justify-between w-full mt-4">
            {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                    <div className="flex flex-col items-center text-center">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", index <= currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                            {index <= currentStepIndex ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <p className={cn("text-xs mt-1 w-20", index <= currentStepIndex ? 'text-primary font-semibold' : 'text-muted-foreground')}>{step.label}</p>
                    </div>
                    {index < steps.length - 1 && <div className={cn("flex-1 h-1 mx-2", index < currentStepIndex ? 'bg-primary' : 'bg-muted')} />}
                </React.Fragment>
            ))}
        </div>
    );
};


export function AcompanhamentoTab() {
  const { stay } = useGuest();
  const [requests, setRequests] = useState<Request[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);


  useEffect(() => {
    if (!stay?.id) {
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
        const db = await getFirebaseDb();
        if(!db) return;

        const reqQuery = firestore.query(firestore.collection(db, 'requests'), firestore.where('stayId', '==', stay.id), firestore.orderBy('createdAt', 'desc'));
        const unsubRequests = firestore.onSnapshot(reqQuery, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request)));
            if(loading) setLoading(false);
        });

        const bookQuery = firestore.query(firestore.collection(db, 'bookings'), firestore.where('stayId', '==', stay.id), firestore.where('date', '==', today));
        const unsubBookings = firestore.onSnapshot(bookQuery, (snapshot) => {
            setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
            if(loading) setLoading(false);
        });
        
        return () => {
            unsubRequests();
            unsubBookings();
        };
    }
    fetchAll();
  }, [stay?.id, loading, today]);
  
    const typeInfo = {
        item: { icon: Package, label: "Pedido de Item" },
        cleaning: { icon: Sparkles, label: "Pedido de Limpeza" },
        maintenance: { icon: Construction, label: "Relato de Manutenção" },
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Acompanhamento</CardTitle>
                <CardDescription>Veja o status de seus pedidos e agendamentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> :
                !requests.length && !bookings.length ? <p className="text-center text-muted-foreground py-8">Nenhuma atividade para mostrar.</p> :
                (
                    <div className="space-y-6">
                        {bookings.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Seus Agendamentos de Hoje</h3>
                                {bookings.map(booking => {
                                    const bookingDate = parse(booking.date, 'yyyy-MM-dd', new Date());
                                    
                                    // ++ INÍCIO DA CORREÇÃO CRÍTICA ++
                                    // Verifica se booking.timeSlot existe. Se não, constrói o label a partir 
                                    // dos campos startTime e endTime, que devem existir no formato antigo.
                                    const timeLabel = booking.timeSlot?.label ?? `${booking.startTime} - ${booking.endTime}`;
                                    // ++ FIM DA CORREÇÃO CRÍTICA ++

                                    return (
                                        <div key={booking.id} className="border rounded-lg p-4 space-y-2">
                                            <div className="flex items-center gap-3 font-bold">
                                                <Calendar className="w-5 h-5 text-primary" />
                                                <span>{booking.structureName}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground pl-8">
                                                {format(bookingDate, "'Hoje', dd/MM", { locale: ptBR })} - {timeLabel}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {requests.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Suas Solicitações</h3>
                                {requests.map(request => {
                                    const Icon = typeInfo[request.type].icon;
                                    return (
                                        <div key={request.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 font-bold"><Icon className="w-5 h-5 text-primary" /><span>{request.type === 'item' ? `${request.details.quantity}x ${request.details.itemName}` : typeInfo[request.type].label}</span></div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Pedido em {request.createdAt && format(request.createdAt.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>
                                            <RequestStatusTracker status={request.status} />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}