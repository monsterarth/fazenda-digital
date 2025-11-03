// app/admin/(dashboard)/manutencao/page.tsx

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Inbox, Archive } from 'lucide-react'; // ++ ÍCONE 'Archive' ADICIONADO
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { CreateTaskSheet } from '@/components/admin/maintenance/CreateTaskSheet';
import Link from 'next/link'; // ++ 'Link' ADICIONADO

// ++ NOVOS IMPORTS
import { getFirebaseDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore'; // ++ 'where' ADICIONADO
import { MaintenanceTask } from '@/types/maintenance';
import { TaskCard } from '@/components/admin/maintenance/TaskCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner'; 
// -- FIM NOVOS IMPORTS


/**
 * Componente de Visão do Gestor (Super Admin, Recepção)
 */
const GestorMaintenanceView = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // ++ LÓGICA DE FETCH ATUALIZADA ++
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const db = await getFirebaseDb();
      // ++ ATUALIZADO: Query agora filtra tarefas arquivadas
      const q = query(
        collection(db, 'maintenance_tasks'), 
        where('status', '!=', 'archived'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const tasksData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as MaintenanceTask));
        setTasks(tasksData); // Agora só contém tarefas ativas
        setLoading(false);
      }, (error) => {
        console.error("Erro ao buscar tarefas:", error);
        // Firebase pode reclamar de um índice ausente aqui. 
        // Se o fizer, o erro no console indicará o link para criá-lo.
        toast.error("Não foi possível carregar as tarefas.", { description: error.message });
        setLoading(false);
      });

      // Retorna o 'unsubscribe' para limpar o listener ao desmontar
      return () => unsubscribe();
    };

    fetchTasks();
  }, []);

  // ++ FILTROS ATUALIZADOS: 'archivedTasks' removido
  const backlogTasks = useMemo(() => tasks.filter(t => t.status === 'backlog'), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter(t => t.status === 'in_progress'), [tasks]);
  const reviewTasks = useMemo(() => tasks.filter(t => t.status === 'awaiting_review'), [tasks]);

  // Componente de placeholder para "Vazio" ou "Loading"
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-12 text-center h-64">
      <Inbox className="h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-semibold text-gray-700">{message}</h3>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
    </div>
  );

  return (
    <>
      {/* ++ ATUALIZAÇÃO: Tabs com 3 colunas, 'archived' removido ++ */}
      <Tabs defaultValue="backlog">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backlog">Backlog ({loading ? '...' : backlogTasks.length})</TabsTrigger>
          <TabsTrigger value="in_progress">Em Andamento ({loading ? '...' : inProgressTasks.length})</TabsTrigger>
          <TabsTrigger value="awaiting_review">Para Revisão ({loading ? '...' : reviewTasks.length})</TabsTrigger>
        </TabsList>
        
        {/* Aba Backlog */}
        <TabsContent value="backlog">
          {loading ? (
            <LoadingSkeleton />
          ) : backlogTasks.length === 0 ? (
            <EmptyState message="Nenhuma tarefa no backlog." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {backlogTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </TabsContent>
        
        {/* Aba Em Andamento */}
        <TabsContent value="in_progress">
           {loading ? (
            <LoadingSkeleton />
          ) : inProgressTasks.length === 0 ? (
            <EmptyState message="Nenhuma tarefa em andamento." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </TabsContent>

        {/* Aba Para Revisão */}
        <TabsContent value="awaiting_review">
           {loading ? (
            <LoadingSkeleton />
          ) : reviewTasks.length === 0 ? (
            <EmptyState message="Nenhuma tarefa aguardando revisão." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviewTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </TabsContent>
        
        {/* ++ ABA ARQUIVO REMOVIDA ++ */}
      </Tabs>
    </>
  );
};

/**
 * Componente de Visão do Funcionário (Manutenção)
 */
const FuncionarioMaintenanceView = () => {
  const { user } = useAuth();
  
  // TODO: Implementar lógica de fetch das tarefas (assignedToId === user.uid)
  // TODO: Implementar Ações (Assumir, Finalizar)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas Tarefas</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Olá, {user?.displayName || 'Funcionário'}! Aqui estão suas tarefas pendentes:</p>
        <p>Listagem das suas tarefas (ordenadas por prioridade)...</p>
      </CardContent>
    </Card>
  );
};


/**
 * Página principal do Módulo de Manutenção
 */
export default function ManutencaoPage() {
  const { userRole, loading } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const gestorRoles: UserRole[] = ['super_admin', 'recepcao'];
  
  const isGestor = useMemo(() => {
    if (!userRole) return false;
    return gestorRoles.includes(userRole);
  }, [userRole]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Manutenção</h1>
          <p className="text-muted-foreground">
            {isGestor 
              ? "Acompanhe e delegue todas as ordens de serviço." 
              : "Veja e gerencie suas tarefas atribuídas."}
          </p>
        </div>
        
        {/* ++ BOTÕES DO GESTOR ATUALIZADOS ++ */}
        {isGestor && (
          <div className="flex gap-2">
            <Link href="/admin/manutencao/arquivo">
              <Button variant="outline" size="icon">
                <Archive className="h-4 w-4" />
                <span className="sr-only">Ver Arquivo</span>
              </Button>
            </Link>
            <Button onClick={() => setIsSheetOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Tarefa
              </Button>
          </div>
        )}
      </div>

      {isGestor ? (
        <GestorMaintenanceView />
      ) : (
        <FuncionarioMaintenanceView />
      )}
      
      {isGestor && (
         <CreateTaskSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} />
      )}
    </div>
  );
}