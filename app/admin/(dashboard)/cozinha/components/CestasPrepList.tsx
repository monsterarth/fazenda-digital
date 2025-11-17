// app/admin/(dashboard)/cozinha/components/CestasPrepList.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  BreakfastOrder,
  IndividualOrderItem,
  CollectiveOrderItem,
} from '@/types'; // Assumindo que BreakfastOrder está em @/types
import { Loader2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Helper para obter a data de amanhã no formato 'yyyy-MM-dd'
const getTomorrowDateString = () => {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd');
};

interface AggregatedItem {
  name: string;
  count: number;
}

export function CestasPrepList() {
  const [orders, setOrders] = useState<BreakfastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tomorrowStr, setTomorrowStr] = useState('');
  const [tomorrowFormatted, setTomorrowFormatted] = useState('');

  // Listener dos Pedidos de Cesta (para amanhã)
  useEffect(() => {
    if (!db) return;

    const tomorrow = getTomorrowDateString();
    setTomorrowStr(tomorrow);
    setTomorrowFormatted(
      format(addDays(new Date(), 1), "dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })
    );

    const q = query(
      collection(db, 'breakfastOrders'),
      where('deliveryDate', '==', tomorrow)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newOrders: BreakfastOrder[] = [];
        snapshot.forEach((doc) => {
          newOrders.push({ id: doc.id, ...doc.data() } as BreakfastOrder);
        });
        setOrders(newOrders);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no listener das Cestas:', err);
        toast.error('Erro ao carregar lista de preparo.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Memo para AGREGAR os itens
  const {
    totalOrders,
    totalGuests,
    individualList,
    collectiveList,
  } = useMemo(() => {
    const individualMap = new Map<string, number>();
    const collectiveMap = new Map<string, number>();
    let guests = 0;

    for (const order of orders) {
      guests += order.numberOfGuests || 0;

      // Agrega Itens Individuais
      for (const item of order.individualItems || []) {
        // Cria uma chave única (ex: "Omelete (Queijo e Presunto)")
        const key = item.flavorName
          ? `${item.itemName} (${item.flavorName})`
          : item.itemName;
        individualMap.set(key, (individualMap.get(key) || 0) + 1); // +1 por item
      }

      // Agrega Itens Coletivos
      for (const item of order.collectiveItems || []) {
        const key = item.itemName;
        collectiveMap.set(key, (collectiveMap.get(key) || 0) + item.quantity); // +quantidade
      }
    }

    // Converte os Maps em listas ordenadas
    const iList = Array.from(individualMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const cList = Array.from(collectiveMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalOrders: orders.length,
      totalGuests: guests,
      individualList: iList,
      collectiveList: cList,
    };
  }, [orders]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <span className="ml-4 text-xl text-brand-mid-green">
          Carregando pedidos de amanhã...
        </span>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-1 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-brand-dark-green">
              Lista de Produção das Cestas
            </CardTitle>
            <p className="text-lg text-brand-primary font-semibold">
              Entrega: {tomorrowFormatted}
            </p>
          </CardHeader>
          <CardContent className="flex gap-6">
            <div className="text-center p-4 bg-gray-100 rounded-lg flex-1">
              <p className="text-4xl font-bold text-brand-dark-green">
                {totalOrders}
              </p>
              <p className="text-sm text-brand-mid-green">Cestas Pedidas</p>
            </div>
            <div className="text-center p-4 bg-gray-100 rounded-lg flex-1">
              <p className="text-4xl font-bold text-brand-dark-green">
                {totalGuests}
              </p>
              <p className="text-sm text-brand-mid-green">Total de Hóspedes</p>
            </div>
          </CardContent>
        </Card>

        {totalOrders === 0 && (
          <p className="text-center text-brand-mid-green py-10">
            Nenhum pedido de cesta encontrado para amanhã ({tomorrowStr}).
          </p>
        )}

        {totalOrders > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna Itens Individuais */}
            <Card>
              <CardHeader>
                <CardTitle>Individuais (Pratos Quentes)</CardTitle>
              </CardHeader>
              <CardContent>
                {individualList.length === 0 ? (
                  <p className="text-sm text-brand-mid-green">
                    Nenhum item individual pedido.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {individualList.map((item) => (
                      <li
                        key={item.name}
                        className="flex justify-between text-lg p-3 bg-gray-50 rounded-md"
                      >
                        <span className="font-medium text-brand-dark-green">
                          {item.name}
                        </span>
                        <strong className="text-brand-primary">
                          {item.count}x
                        </strong>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Coluna Itens Coletivos */}
            <Card>
              <CardHeader>
                <CardTitle>Coletivos (Acompanhamentos)</CardTitle>
              </CardHeader>
              <CardContent>
                {collectiveList.length === 0 ? (
                  <p className="text-sm text-brand-mid-green">
                    Nenhum item coletivo pedido.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {collectiveList.map((item) => (
                      <li
                        key={item.name}
                        className="flex justify-between text-lg p-3 bg-gray-50 rounded-md"
                      >
                        <span className="font-medium text-brand-dark-green">
                          {item.name}
                        </span>
                        <strong className="text-brand-primary">
                          {item.count}x
                        </strong>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}