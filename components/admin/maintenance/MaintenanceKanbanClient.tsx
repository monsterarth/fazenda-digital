// components/admin/maintenance/MaintenanceKanbanClient.tsx

"use client";

import React, { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  DropResult,
  DroppableProvided,
  DroppableStateSnapshot,
} from '@hello-pangea/dnd';
import { MaintenanceTask, StaffMember, TaskStatus } from '@/types/maintenance';
import { TaskCard } from '@/components/admin/maintenance/TaskCard';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore'; 
// ++ ATUALIZADO: Importa 'Archive' ++
import { Loader2, Wrench, PlusCircle, Archive } from 'lucide-react';
import { useModalStore } from '@/hooks/use-modal-store';
import { updateTaskStatus, archiveMaintenanceTask } from '@/app/actions/manage-maintenance-task';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Link from 'next/link'; // ++ ADICIONADO: Importa o Link ++

const columns: { id: TaskStatus; title: string }[] = [
  { id: 'pending', title: 'Pendentes' },
  { id: 'in_progress', title: 'Em Andamento' },
  { id: 'completed', title: 'Concluídas' },
];
type TaskColumns = {
  [key in TaskStatus]: MaintenanceTask[];
};

export function MaintenanceKanbanClient({ staff }: { staff: StaffMember[] }) {
  const { user } = useAuth();
  const onOpen = useModalStore((state) => state.onOpen);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. OUVINTE DO FIRESTORE
  useEffect(() => {
    const q = query(
      collection(db, "maintenance_tasks"),
      where("status", "!=", "archived"), 
      orderBy("status", "asc"),
      orderBy("priority", "desc"), 
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt as Timestamp, 
        } as MaintenanceTask;
      });
      setTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar tarefas:", error);
      toast.error("Falha ao carregar tarefas.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. AGRUPA TAREFAS NAS COLUNAS
  const taskColumns = React.useMemo(() => {
    const grouped: TaskColumns = {
      pending: [],
      in_progress: [],
      completed: [],
      archived: [], 
    };
    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // 3. LÓGICA DE DRAG-AND-DROP
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return; 
    }

    if (!user?.email) {
      toast.error("Você precisa estar logado para mover tarefas.");
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;
    const task = tasks.find(t => t.id === draggableId);
    if (!task) return;

    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === draggableId ? { ...t, status: newStatus } : t
      )
    );
    
    const response = await updateTaskStatus(draggableId, newStatus, user.email);

    if (!response.success) {
      toast.error(`Falha ao mover: ${response.message}`, { duration: 5000 });
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === draggableId ? { ...t, status: source.droppableId as TaskStatus } : t
        )
      );
    } else {
      toast.success("Status atualizado!");
    }
  };

  // 4. Handler para o clique no botão de arquivar
  const handleArchiveClick = async (taskId: string) => {
    if (!user?.email) {
      toast.error("Você precisa estar logado para arquivar tarefas.");
      return;
    }

    setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
    
    const toastId = toast.loading("Arquivando tarefa...");
    const response = await archiveMaintenanceTask(taskId, user.email);

    if (response.success) {
      toast.success("Tarefa arquivada!", { id: toastId });
    } else {
      toast.error(`Falha: ${response.message}`, { id: toastId });
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-full">
        {/* ++ CABEÇALHO ATUALIZADO ++ */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-2xl font-bold flex items-center">
            <Wrench className="mr-3" />
            Quadro de Manutenção
          </h1>
          
          <div className="flex gap-2">
            {/* ++ BOTÃO DE ARQUIVO ADICIONADO ++ */}
            <Button asChild variant="outline" size="icon">
              <Link href="/admin/manutencao/arquivo">
                <Archive className="h-4 w-4" />
                <span className="sr-only">Ver Arquivo</span>
              </Link>
            </Button>
            
            {/* Botão Nova Tarefa (existente) */}
            <Button onClick={() => onOpen('upsertMaintenanceTask', { allTasks: tasks, staff })}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>
        {/* ++ FIM DA ATUALIZAÇÃO DO CABEÇALHO ++ */}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-4 overflow-x-auto">
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`bg-muted/50 rounded-lg p-4 transition-colors ${
                    snapshot.isDraggingOver ? 'bg-muted' : ''
                  }`}
                  style={{ minHeight: '300px' }}
                >
                  <h2 className="text-lg font-semibold mb-4">
                    {column.title} ({taskColumns[column.id].length})
                  </h2>
                  <div className="space-y-4">
                    {taskColumns[column.id].map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        allTasks={tasks}
                        staff={staff}
                        onArchiveClick={column.id === 'completed' ? handleArchiveClick : undefined}
                      />
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}