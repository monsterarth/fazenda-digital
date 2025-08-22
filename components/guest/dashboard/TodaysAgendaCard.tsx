"use client";

import React, { useState, useEffect } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2, Clock } from 'lucide-react';
import { format, isToday } from 'date-fns';

// ++ INÍCIO DA CORREÇÃO ++
// Definimos explicitamente a estrutura de dados que esperamos do Firestore.
// Isso resolve os erros de tipagem do TypeScript.
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

interface Booking {
  id: string;
  date: firestore.Timestamp;
  timeSlot: TimeSlot;
  structureName: string;
  // outras propriedades que possam existir...
}
// ++ FIM DA CORREÇÃO ++


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
    
    dbPromise.then(db => {
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
        
        // Verificação de segurança para garantir que 'date' existe antes de usar 'toDate()'
        const today = allBookings.filter(booking => booking.date && isToday(booking.date.toDate()));

        setTodaysBookings(today.sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime)));
        setLoading(false);
      }, (error) => {
        console.error("Erro ao buscar agendamentos:", error);
        setLoading(false);
      });

      return unsubscribe;
    }).then(unsubscribe => {
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    });

  }, [stay?.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calendar className="text-primary" /> Agenda de Hoje</CardTitle>
        <CardDescription>Seus agendamentos confirmados para hoje.</CardDescription>
      </CardHeader>
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
                  {/* O erro não acontecerá mais pois 'timeSlot' está definido no tipo */}
                  <p className="text-sm text-muted-foreground">{booking.timeSlot.label}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">Nenhum agendamento para hoje.</p>
        )}
      </CardContent>
    </Card>
  );
}