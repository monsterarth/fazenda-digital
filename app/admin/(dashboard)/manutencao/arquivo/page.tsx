// app/admin/(dashboard)/manutencao/arquivo/page.tsx

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Inbox, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { getFirebaseDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { MaintenanceTask } from '@/types/maintenance';
import { TaskCard } from '@/components/admin/maintenance/TaskCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Componente de placeholder para "Vazio" ou "Loading"
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-12 text-center h-64">
    <Inbox className="h-12 w-12 text-gray-400" />
    <h3 className="mt-4 text-lg font-semibold text-gray-700">{message}</h3>
  </div>
);

// Componente de Skeleton
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <Skeleton className="h-72" />
    <Skeleton className="h-72" />
    <Skeleton className="h-72" />
  </div>
);

/**
 * Página de Arquivo de Tarefas de Manutenção
 */
export default function ManutencaoArquivoPage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Lógica de Fetch em tempo real
  useEffect(() => {
    const fetchArchivedTasks = async () => {
      setLoading(true);
      const db = await getFirebaseDb();
      
      const q = query(
        collection(db, 'maintenance_tasks'), 
        where('status', '==', 'archived'), 
        orderBy('reviewedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const tasksData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as MaintenanceTask));
        setTasks(tasksData);
        setLoading(false);
      }, (error) => {
        console.error("Erro ao buscar tarefas arquivadas:", error);
        toast.error("Não foi possível carregar o arquivo.", { description: "Pode ser necessário criar um índice no Firestore. Verifique o console." });
        setLoading(false);
      });

      return () => unsubscribe();
    };

    fetchArchivedTasks();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Arquivo de Manutenção</h1>
          <p className="text-muted-foreground">
            Visualize todas as tarefas que já foram concluídas e revisadas.
          </p>
        </div>
        
        <Link href="/admin/manutencao">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Kanban
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tarefas Arquivadas ({loading ? '...' : tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton />
          ) : tasks.length === 0 ? (
            <EmptyState message="Nenhuma tarefa foi arquivada ainda." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* ++ CORREÇÃO: Erro TS2741 resolvido pois 'onDelegateClick' é opcional ++ */}
              {tasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}