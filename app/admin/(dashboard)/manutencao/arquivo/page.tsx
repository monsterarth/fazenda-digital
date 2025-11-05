// app/admin/(dashboard)/manutencao/arquivo/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { MaintenanceTask } from '@/types/maintenance';
import { TaskCard } from '@/components/admin/maintenance/TaskCard';
import { Loader2, Archive, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ArquivoManutencaoPage() {
  const [archivedTasks, setArchivedTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "maintenance_tasks"),
      where("status", "==", "archived"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as MaintenanceTask));
      setArchivedTasks(tasksData);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar tarefas arquivadas:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/manutencao">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Kanban
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center">
          <Archive className="mr-3" />
          Tarefas Arquivadas
        </h1>
        <div /> {/* Espaçador */}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
        </div>
      ) : archivedTasks.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Nenhuma tarefa foi arquivada ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {archivedTasks.map((task, index) => (
            // ## INÍCIO DA CORREÇÃO ##
            // Passa os props obrigatórios (vazios) que o TaskCard agora espera.
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              allTasks={[]} // Não é necessário checar dependências no arquivo
              staff={[]} // Não é necessário mostrar avatares no arquivo
            />
            // ## FIM DA CORREÇÃO ##
          ))}
        </div>
      )}
    </div>
  );
}