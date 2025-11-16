// app/salao/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { SalaoAuthGuard } from './components/SalaoAuthGuard';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
// ++ Novos Ícones para o Dashboard
import {
  Users, ClipboardList, LogOut, Loader2,
  UserCheck, // Hóspedes no Salão
  UserX, // Hóspedes Finalizados
  Home, // Cabanas Faltantes
  Package, // Total Esperado
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot, // ++ Usaremos onSnapshot para métricas em tempo real
  orderBy,
  limit,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
// ++ Importando os novos tipos
import { BreakfastAttendee, KitchenOrder } from '@/types/cafe';
import { Timestamp } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Roles permitidas
const ALLOWED_ROLES: UserRole[] = ['cafe', 'super_admin'];

// (Helper de data que criamos anteriormente)
const timestampToMillis = (timestamp: Timestamp | undefined | null): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'object' && 'toMillis' in timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
     return (timestamp as any).seconds * 1000;
  }
  return 0;
};

// ++ NOVO: Componente de Métrica (KPI Card)
interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  loading: boolean;
}
function KpiCard({ title, value, icon, loading }: KpiCardProps) {
  return (
    <div className="bg-brand-light-green p-4 rounded-lg text-center h-28 flex flex-col justify-center items-center">
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      ) : (
        <h2 className="text-4xl font-bold text-brand-primary">{value}</h2>
      )}
      <div className="flex items-center justify-center mt-1">
        <span className="text-brand-dark-green mr-2">{icon}</span>
        <p className="text-sm font-medium text-brand-dark-green">{title}</p>
      </div>
    </div>
  );
}


function SalaoDashboard() {
  const { user } = useAuth();
  
  // ++ CORREÇÃO: Novo estado para os dados do dashboard
  const [allAttendees, setAllAttendees] = useState<BreakfastAttendee[]>([]);
  const [latestOrders, setLatestOrders] = useState<KitchenOrder[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  const todayStr = useMemo(() => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date()), []);

  // ++ CORREÇÃO: Listener 1 - Busca todos os participantes de hoje
  useEffect(() => {
    if (!db) return;
    
    // Ouve a coleção correta: 'breakfastAttendees'
    const attendeesRef = collection(db, 'breakfastAttendees');
    const q = query(attendeesRef, where('date', '==', todayStr));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: BreakfastAttendee[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as BreakfastAttendee);
      });
      setAllAttendees(items);
      setLoadingMetrics(false);
    }, (error) => {
      console.error("Erro ao buscar métricas (attendees):", error);
      toast.error("Erro ao carregar métricas.");
      setLoadingMetrics(false);
    });

    return () => unsubscribe(); // Limpa o listener ao sair
  }, [todayStr]);

  // ++ NOVO: Listener 2 - Busca os últimos 5 pedidos de hoje
  useEffect(() => {
    if (!db) return;

    const startOfDay = new Date(todayStr);
    startOfDay.setHours(0, 0, 0, 0);

    const ordersRef = collection(db, 'kitchenOrders');
    const q = query(
      ordersRef,
      where('createdAt', '>=', startOfDay),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: KitchenOrder[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as KitchenOrder);
      });
      setLatestOrders(items);
      setLoadingOrders(false);
    }, (error) => {
      console.error("Erro ao buscar últimos pedidos:", error);
      toast.error("Erro ao carregar pedidos.");
      setLoadingOrders(false);
    });
    
    return () => unsubscribe();
  }, [todayStr]);

  // ++ NOVO: useMemo para calcular as métricas do dashboard
  const metrics = useMemo(() => {
    // 1. Hóspedes no Salão (Presentes, mas não finalizados)
    const totalAttended = allAttendees.filter(
      a => a.status === 'attended'
    ).length;
    
    // 2. Hóspedes Finalizados
    const totalFinished = allAttendees.filter(
      a => a.status === 'finished'
    ).length;

    // 3. Cabanas Faltantes (Cabanas com 100% de status 'pending')
    const pendingCabins = new Set(
      allAttendees
        .filter(a => a.status === 'pending')
        .map(a => a.cabinName)
    );
    // Remove cabanas que já tenham alguém presente
    allAttendees.forEach(a => {
      if (a.status === 'attended' || a.status === 'finished') {
        pendingCabins.delete(a.cabinName);
      }
    });

    // 4. Total Esperado (Total de documentos de participantes)
    const totalExpected = allAttendees.length;

    return {
      totalAttended,
      totalFinished,
      cabinsPending: pendingCabins.size,
      totalExpected,
    };
  }, [allAttendees]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao sair.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white shadow-lg">
      
      {/* Cabeçalho */}
      <header className="pb-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark-green">
              Olá, {user?.displayName?.split(' ')[0] || user?.email}!
            </h1>
            <p className="text-brand-mid-green">Módulo de Salão</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </header>

      {/* ++ NOVO: Grid de Métricas (4 KPIs) ++ */}
      <div className="grid grid-cols-2 gap-4 my-6">
        <KpiCard
          title="Hóspedes no Salão"
          value={metrics.totalAttended}
          icon={<UserCheck className="h-4 w-4" />}
          loading={loadingMetrics}
        />
        <KpiCard
          title="Cabanas Faltantes"
          value={metrics.cabinsPending}
          icon={<Home className="h-4 w-4" />}
          loading={loadingMetrics}
        />
         <KpiCard
          title="Hóspedes Finalizados"
          value={metrics.totalFinished}
          icon={<UserX className="h-4 w-4" />}
          loading={loadingMetrics}
        />
        <KpiCard
          title="Total Esperado (Pessoas)"
          value={metrics.totalExpected}
          icon={<Package className="h-4 w-4" />}
          loading={loadingMetrics}
        />
      </div>

      {/* Botões de Ação (Links) */}
      <main className="flex-grow flex flex-col gap-4">
        <Link href="/salao/checkin" passHref legacyBehavior>
          <a className="flex items-center justify-start p-6 bg-brand-dark-green text-white rounded-lg h-32 shadow-lg transition-transform hover:scale-[1.02]">
            <Users className="h-10 w-10 mr-4" />
            <span className="text-2xl font-semibold">Check-in / Hóspedes</span>
          </a>
        </Link>
        
        <Link href="/salao/mesas" passHref legacyBehavior>
          <a className="flex items-center justify-start p-6 bg-brand-primary text-white rounded-lg h-32 shadow-lg transition-transform hover:scale-[1.02]">
            <ClipboardList className="h-10 w-10 mr-4" />
            <span className="text-2xl font-semibold">Mesas & Pedidos</span>
          </a>
        </Link>

        {/* ++ NOVO: Seção "Últimos Pedidos" ++ */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Últimos Pedidos para a Cozinha</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              </div>
            ) : latestOrders.length === 0 ? (
              <p className="text-sm text-brand-mid-green text-center">Nenhum pedido enviado hoje.</p>
            ) : (
              <div className="space-y-3">
                {latestOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="font-semibold text-brand-dark-green">{order.table}</span>
                      <p className="text-sm text-brand-mid-green">
                        {order.items.length} item(ns) por {order.createdBy}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={order.status === 'pending' ? 'secondary' : 'default'} className="mb-1">
                        {order.status}
                      </Badge>
                      <p className="text-xs text-gray-400">
                        às {new Date(timestampToMillis(order.createdAt)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

    </div>
  );
}

// Envolve o Dashboard com o Guardião de Autenticação
export default function SalaoPageWrapper() {
  return (
    <SalaoAuthGuard allowedRoles={ALLOWED_ROLES}>
      <SalaoDashboard />
    </SalaoAuthGuard>
  );
}