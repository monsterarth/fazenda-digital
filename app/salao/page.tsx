// app/salao/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
// ATUALIZADO: Importa o SalaoAuthGuard
// CORREÇÃO 1: Usando o caminho de alias absoluto correto
import { SalaoAuthGuard } from '@/app/salao/components/SalaoAuthGuard'; 
import { useAuth, UserRole } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Users, ClipboardList, LogOut, Loader2 } from 'lucide-react';
import { db, auth } from '@/lib/firebase'; // Importa 'auth'
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';

/**
 * Roles permitidas para acessar o /salao
 */
const ALLOWED_ROLES: UserRole[] = ['cafe', 'super_admin'];

function SalaoDashboard() {
  const { user } = useAuth();
  
  const [cabanasOcupadas, setCabanasOcupadas] = useState(0);
  const [hospedesEsperados, setHospedesEsperados] = useState(0);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    async function fetchDailyMetrics() {
      if (!db) return;
      const todayStr = new Intl.DateTimeFormat('fr-CA', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date());

      try {
        const checkInsRef = collection(db, 'breakfastCheckIns');
        // CORREÇÃO 2: 'checkInsC' -> 'checkInsRef'
        const q = query(checkInsRef, where('date', '==', todayStr));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setCabanasOcupadas(0);
          setHospedesEsperados(0);
        } else {
          let totalGuests = 0;
          querySnapshot.forEach((doc) => {
            totalGuests += doc.data().numberOfGuests || 0;
          });
          setCabanasOcupadas(querySnapshot.size);
          setHospedesEsperados(totalGuests);
        }
      // CORREÇÃO 3: (error) -> (error: any)
      } catch (error: any) { 
        console.error("Erro ao buscar métricas do café:", error);
      } finally {
        setLoadingMetrics(false);
      }
    }
    fetchDailyMetrics();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) { // Adicionado 'any' aqui também
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao sair.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-white shadow-lg">
      
      <header className="pb-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-dark-green">
              Olá, {user?.displayName?.split(' ')[0] || user?.email}!
            </h1>
            <p className="text-brand-mid-green">Bem-vindo ao módulo de salão.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 my-6">
        <div className="bg-brand-light-green p-4 rounded-lg text-center h-28 flex flex-col justify-center items-center">
          {loadingMetrics ? (
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          ) : (
            <h2 className="text-4xl font-bold text-brand-primary">{cabanasOcupadas}</h2>
          )}
          <p className="text-sm font-medium text-brand-dark-green">Cabanas Ocupadas</p>
        </div>
        <div className="bg-brand-light-green p-4 rounded-lg text-center h-28 flex flex-col justify-center items-center">
          {loadingMetrics ? (
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          ) : (
            <h2 className="text-4xl font-bold text-brand-primary">{hospedesEsperados}</h2>
          )}
          <p className="text-sm font-medium text-brand-dark-green">Hóspedes Esperados</p>
        </div>
      </div>

      {/* Botões de Ação */}
      <main className="flex-grow flex flex-col gap-4">
        {/* ATUALIZADO: Links apontam para /salao/... */}
        <Link href="/salao/checkin" passHref legacyBehavior>
          <a className="flex items-center justify-start p-6 bg-brand-dark-green text-white rounded-lg h-32 shadow-lg transition-transform hover:scale-[1.02]">
            <Users className="h-10 w-10 mr-4" />
            <span className="text-2xl font-semibold">Lista de Hóspedes</span>
          </a>
        </Link>
        
        <Link href="/salao/mesas" passHref legacyBehavior>
          <a className="flex items-center justify-start p-6 bg-brand-primary text-white rounded-lg h-32 shadow-lg transition-transform hover:scale-[1.02]">
            <ClipboardList className="h-10 w-10 mr-4" />
            <span className="text-2xl font-semibold">Pedidos (Mesas)</span>
          </a>
        </Link>
      </main>

    </div>
  );
}

export default function SalaoPageWrapper() {
  return (
    // ATUALIZADO: Usa o SalaoAuthGuard
    <SalaoAuthGuard allowedRoles={ALLOWED_ROLES}>
      <SalaoDashboard />
    </SalaoAuthGuard>
  );
}