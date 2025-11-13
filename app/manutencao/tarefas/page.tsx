// ARQUIVO: app/manutencao/tarefas/page.tsx
// (Note: Fornecendo o código completo do arquivo, com a adição do modal)

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { MaintenanceTask } from '@/types/maintenance';
import { MaintenanceAuthGuard } from '@/app/manutencao/components/MaintenanceAuthGuard';
import { TaskCardMobile } from '@/app/manutencao/components/TaskCardMobile';
import { Loader2, Wrench } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// 1. IMPORTAR O NOVO MODAL
import { CompleteTaskModal } from '@/app/manutencao/components/CompleteTaskModal';

function TarefasPageContent() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. OUVINTE DO FIRESTORE EM TEMPO REAL
  useEffect(() => {
    if (!user || !user.email) return;

    // Função async interna para lidar com 'await'
    const setupListener = async () => {
      try {
        const db = await getFirebaseDb(); // Correção do 'await'

        const q = query(
          collection(db, 'maintenance_tasks'),
          where('assignedTo', 'array-contains', user.email),
          // MODIFICAÇÃO: Não mostrar 'awaiting_review' para o funcionário
          where('status', 'in', ['pending', 'in_progress', 'completed']),
          orderBy('status', 'asc'),
          orderBy('priority', 'desc'),
          orderBy('createdAt', 'asc'),
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const tasksData = snapshot.docs.map(
              (doc) =>
                ({
                  id: doc.id,
                  ...doc.data(),
                }) as MaintenanceTask,
            );
            setTasks(tasksData);
            setLoading(false);
          },
          (error) => {
            console.error('Erro ao buscar tarefas:', error);
            setLoading(false);
          },
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Erro ao conectar ao DB:', error);
        setLoading(false);
      }
    };

    setupListener();
  }, [user]);

  // 2. FILTRA AS TAREFAS NAS ABAS
  const [pendingTasks, inProgressTasks, completedTasks] = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending');
    const inProgress = tasks.filter((t) => t.status === 'in_progress');
    const completed = tasks.filter((t) => t.status === 'completed');
    return [pending, inProgress, completed];
  }, [tasks]);

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
      router.push('/manutencao/login');
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      {/* 2. RENDERIZAR O MODAL (ele fica oculto até ser chamado) */}
      <CompleteTaskModal />

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Minhas Tarefas</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Sair
          </Button>
        </header>

        <main className="p-4">
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pendentes ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                Em Andamento ({inProgressTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Concluídas ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            {/* TAREFAS PENDENTES */}
            <TabsContent value="pending" className="space-y-4 mt-4">
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task) => (
                  <TaskCardMobile key={task.id} task={task} />
                ))
              ) : (
                <p className="text-center text-gray-500 pt-10">
                  Nenhuma tarefa pendente.
                </p>
              )}
            </TabsContent>

            {/* TAREFAS EM ANDAMENTO */}
            <TabsContent value="in_progress" className="space-y-4 mt-4">
              {inProgressTasks.length > 0 ? (
                inProgressTasks.map((task) => (
                  <TaskCardMobile key={task.id} task={task} />
                ))
              ) : (
                <p className="text-center text-gray-500 pt-10">
                  Nenhuma tarefa em andamento.
                </p>
              )}
            </TabsContent>

            {/* TAREFAS CONCLUÍDAS */}
            <TabsContent value="completed" className="space-y-4 mt-4">
              {completedTasks.length > 0 ? (
                completedTasks.map((task) => (
                  <TaskCardMobile key={task.id} task={task} />
                ))
              ) : (
                <p className="text-center text-gray-500 pt-10">
                  Nenhuma tarefa concluída recentemente.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}

// Envolve a página com o guarda de autenticação
export default function TarefasPage() {
  return (
    <MaintenanceAuthGuard>
      <TarefasPageContent />
    </MaintenanceAuthGuard>
  );
}