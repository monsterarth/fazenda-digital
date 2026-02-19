// /components/guest/dashboard/TodaysAgendaCard.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2, Clock } from 'lucide-react';
import { isToday } from 'date-fns';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

// ## INÍCIO DA CORREÇÃO: A interface agora reflete a estrutura real dos dados no Firestore ##
interface Booking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  structureName: string;
}
// ## FIM DA CORREÇÃO ##

export function TodaysAgendaCard() {
  const { stay } = useGuest();
  const [todaysBookings, setTodaysBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stay?.id) {
        setLoading(false);
        return;
    };

    const dbPromise = getFirebaseDb();
    
    const unsubPromise = dbPromise.then(db => {
      if (!db) {
        setLoading(false);
        return;
      }
      
      const q = firestore.query(
        firestore.collection(db, 'bookings'),
        firestore.where('stayId', '==', stay.id)
      );

      const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
        const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        
        const today = allBookings
          // Filtra para pegar apenas os agendamentos de hoje
          .filter(booking => booking.date && isToday(new Date(booking.date.replace(/-/g, '/'))))
          // Garante que apenas agendamentos com horário de início válido prossigam
          .filter(booking => typeof booking.startTime === 'string');

        // ## INÍCIO DA CORREÇÃO: Ordena usando o campo 'startTime' que existe nos dados ##
        setTodaysBookings(today.sort((a, b) => a.startTime.localeCompare(b.startTime)));
        // ## FIM DA CORREÇÃO ##
        setLoading(false);
      }, (error) => {
        console.error("Erro ao buscar agendamentos:", error);
        setLoading(false);
      });

      return unsubscribe;
    });

    return () => {
      unsubPromise.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, [stay?.id]);

  // Define um valor padrão para o Accordion com base se há agendamentos
  const defaultValue = todaysBookings.length > 0 ? "agenda" : "";

  return (
    <Accordion type="single" collapsible defaultValue={defaultValue} className="w-full">
      <AccordionItem value="agenda" className="border-none">
        <Card>
          <AccordionTrigger className="p-0 w-full hover:no-underline [&_svg]:data-[state=open]:rotate-0">
            <CardHeader className="w-full text-left">
              <CardTitle className="flex items-center gap-2"><Calendar className="text-primary" /> Agenda de Hoje</CardTitle>
              <CardDescription>Seus agendamentos confirmados para hoje.</CardDescription>
            </CardHeader>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent>
              {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
              todaysBookings.length > 0 ? (
                <ul className="space-y-3">
                  {todaysBookings.map(booking => (
                    <li key={booking.id} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{booking.structureName}</p>
                        {/* ## INÍCIO DA CORREÇÃO: Cria o label do horário dinamicamente ## */}
                        <p className="text-sm text-muted-foreground">{`${booking.startTime} - ${booking.endTime}`}</p>
                        {/* ## FIM DA CORREÇÃO ## */}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">Nenhum agendamento para hoje.</p>
              )}
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  );
}
