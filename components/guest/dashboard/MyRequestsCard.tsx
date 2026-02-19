// /components/guest/dashboard/MyRequestsCard.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Request } from '@/app/admin/(dashboard)/solicitacoes/page';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConciergeBell, Loader2, Package, Sparkles, Construction } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

export function MyRequestsCard() {
  const { stay } = useGuest();
  const [activeRequests, setActiveRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const typeInfo = {
    item: { icon: Package, label: "Item" },
    cleaning: { icon: Sparkles, label: "Limpeza" },
    maintenance: { icon: Construction, label: "Manutenção" },
  };

  useEffect(() => {
    if (!stay?.id) {
      setLoading(false);
      return;
    }

    const dbPromise = getFirebaseDb();
    const unsubPromise = dbPromise.then(db => {
        if(!db) return;
        const q = firestore.query(
            firestore.collection(db, 'requests'),
            firestore.where('stayId', '==', stay.id),
            firestore.where('status', 'in', ['pending', 'in_progress'])
        );
        const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
            setActiveRequests(snapshot.docs.map(doc => doc.data() as Request));
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

  // Define um valor padrão para o Accordion com base se há solicitações ativas
  const defaultValue = activeRequests.length > 0 ? "requests" : "";

  return (
    <Accordion type="single" collapsible defaultValue={defaultValue} className="w-full">
      <AccordionItem value="requests" className="border-none">
        <Card>
          <AccordionTrigger className="p-0 w-full hover:no-underline [&_svg]:data-[state=open]:rotate-0">
             <CardHeader className="w-full text-left">
                <CardTitle className="flex items-center gap-2"><ConciergeBell className="text-primary" /> Minhas Solicitações</CardTitle>
                <CardDescription>Acompanhe seus pedidos em andamento.</CardDescription>
              </CardHeader>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent>
              {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> :
              activeRequests.length > 0 ? (
                <div className="space-y-4">
                  <ul className="space-y-3">
                    {activeRequests.map((req, index) => {
                      const Icon = typeInfo[req.type].icon;
                      return (
                        <li key={index} className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {req.type === 'item' ? `${req.details.quantity}x ${req.details.itemName}` : typeInfo[req.type].label}
                            </p>
                            <p className="text-sm capitalize text-muted-foreground">Status: {req.status === 'pending' ? 'Pendente' : 'Em Andamento'}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <Button variant="outline" className="w-full" asChild><Link href="/servicos">Ver todos</Link></Button>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-4">
                  <p className="mb-4">Nenhuma solicitação ativa no momento.</p>
                  <Button className="w-full" asChild><Link href="/servicos">Fazer uma solicitação</Link></Button>
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  );
}
