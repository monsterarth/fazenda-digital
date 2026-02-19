// app/admin/(dashboard)/cozinha/components/SalaoKDS.tsx
'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  orderBy,
  serverTimestamp, // ++ CORREÇÃO: Importação adicionada
} from 'firebase/firestore';
import { KitchenOrder } from '@/types/cafe';
import {
  Loader2,
  Clock,
  Utensils,
  CheckCircle,
  XCircle,
  ChefHat,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper para obter o início do dia (para o query)
const getStartOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(now);
};

// Componente de Card de Pedido
const OrderCard: React.FC<{
  order: KitchenOrder;
  isUpdating: boolean;
  onUpdateStatus: (id: string, status: KitchenOrder['status']) => void;
}> = ({ order, isUpdating, onUpdateStatus }) => {
  const time = (order.createdAt as Timestamp)?.toDate().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="shadow-md border-l-4 border-brand-primary">
      <CardHeader>
        <CardTitle className="text-xl text-brand-dark-green flex justify-between">
          {order.table}
          <span className="text-sm font-mono text-brand-mid-green">{time}</span>
        </CardTitle>
        <CardDescription>Enviado por: {order.createdBy}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 list-disc list-inside">
          {order.items.map((item, idx) => (
            <li key={idx} className="text-brand-dark-green">
              <strong>{item.quantity}x</strong> {item.itemName}
              {item.flavorName && (
                <span className="text-sm text-brand-mid-green">
                  {' '}
                  ({item.flavorName})
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {order.status === 'pending' && (
          <Button
            className="w-full bg-brand-primary hover:bg-brand-primary/90"
            size="lg"
            onClick={() => onUpdateStatus(order.id, 'preparing')}
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Utensils className="mr-2 h-4 w-4" /> Iniciar Preparo
          </Button>
        )}
        {order.status === 'preparing' && (
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
            onClick={() => onUpdateStatus(order.id, 'ready')}
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Pronto
          </Button>
        )}
        {order.status === 'ready' && (
          <>
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              onClick={() => onUpdateStatus(order.id, 'delivered')}
              disabled={isUpdating}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ChefHat className="mr-2 h-4 w-4" /> Pedido Entregue (Arquivar)
            </Button>
            <Button
              className="w-full"
              size="sm"
              variant="ghost"
              onClick={() => onUpdateStatus(order.id, 'preparing')}
              disabled={isUpdating}
            >
              Voltar para "Em Preparo"
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

// Componente Principal do KDS
export function SalaoKDS() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Refs para o som de notificação
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const knownOrdersRef = useRef<Set<string>>(new Set());

  // Listener principal do KDS
  useEffect(() => {
    if (!db) return;

    const todayStart = getStartOfToday();
    const q = query(
      collection(db, 'kitchenOrders'),
      where('createdAt', '>=', todayStart),
      where('status', 'in', ['pending', 'preparing', 'ready']),
      orderBy('createdAt', 'asc') // Ordena do mais antigo para o mais novo
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newOrders: KitchenOrder[] = [];
        const newPendingIds: string[] = [];

        snapshot.forEach((doc) => {
          const order = { id: doc.id, ...doc.data() } as KitchenOrder;
          newOrders.push(order);
          if (order.status === 'pending') {
            newPendingIds.push(order.id);
          }
        });

        setOrders(newOrders);
        setLoading(false);

        // Lógica do Som de Notificação
        let playedSound = false;
        for (const id of newPendingIds) {
          if (!knownOrdersRef.current.has(id)) {
            // Novo pedido pendente encontrado
            playedSound = true;
          }
        }

        // Atualiza o set de pedidos conhecidos
        knownOrdersRef.current = new Set(newPendingIds);

        // Toca o som (apenas se houver ref e um novo pedido)
        if (playedSound && notificationSoundRef.current) {
          notificationSoundRef.current.play().catch((e) =>
            console.warn('Não foi possível tocar o som de notificação.', e)
          );
          toast.info('Novo pedido na cozinha!', {
            icon: <Volume2 className="h-5 w-5 text-brand-primary" />,
          });
        }
      },
      (err) => {
        console.error('Erro no listener do KDS:', err);
        toast.error('Erro ao conectar com a cozinha.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Separa os pedidos em colunas
  const { pendingOrders, preparingOrders, readyOrders } = useMemo(() => {
    return {
      pendingOrders: orders.filter((o) => o.status === 'pending'),
      preparingOrders: orders.filter((o) => o.status === 'preparing'),
      readyOrders: orders.filter((o) => o.status === 'ready'),
    };
  }, [orders]);

  // Handler para atualizar o status do pedido
  const handleUpdateStatus = async (
    orderId: string,
    status: KitchenOrder['status']
  ) => {
    setIsUpdating(orderId);
    try {
      const docRef = doc(db, 'kitchenOrders', orderId);
      await updateDoc(docRef, {
        status: status,
        updatedAt: serverTimestamp(), // Agora funciona!
      });
      toast.success(`Pedido movido para "${status}"!`);
    } catch (err) {
      toast.error('Falha ao atualizar o pedido.');
    } finally {
      setIsUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-brand-primary" />
        <span className="ml-4 text-xl text-brand-mid-green">
          Conectando à cozinha...
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Elemento de Áudio (requer o arquivo em public/sounds/notification.mp3) */}
      <audio
        ref={notificationSoundRef}
        src="/sounds/notification.mp3"
        preload="auto"
      />

      <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
        {/* Coluna 1: Pendente */}
        <div className="flex flex-col rounded-lg bg-gray-100 p-4">
          <h2 className="mb-4 text-xl font-bold text-red-600 flex items-center">
            <Clock className="mr-2 h-6 w-6" />
            PENDENTE ({pendingOrders.length})
          </h2>
          <ScrollArea className="flex-grow">
            {pendingOrders.length === 0 ? (
              <div className="flex h-full items-center justify-center text-brand-mid-green">
                Nenhum pedido aguardando.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isUpdating={isUpdating === order.id}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Coluna 2: Em Preparo */}
        <div className="flex flex-col rounded-lg bg-gray-100 p-4">
          <h2 className="mb-4 text-xl font-bold text-yellow-600 flex items-center">
            <Utensils className="mr-2 h-6 w-6" />
            EM PREPARO ({preparingOrders.length})
          </h2>
          <ScrollArea className="flex-grow">
            <div className="space-y-4">
              {preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isUpdating={isUpdating === order.id}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Coluna 3: Pronto */}
        <div className="flex flex-col rounded-lg bg-gray-100 p-4">
          <h2 className="mb-4 text-xl font-bold text-green-600 flex items-center">
            <CheckCircle className="mr-2 h-6 w-6" />
            PRONTO ({readyOrders.length})
          </h2>
          <ScrollArea className="flex-grow">
            <div className="space-y-4">
              {readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isUpdating={isUpdating === order.id}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}