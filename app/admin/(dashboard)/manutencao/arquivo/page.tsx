// app/admin/(dashboard)/manutencao/arquivo/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MaintenanceTask } from '@/types/maintenance';
import { getArchivedTasks } from '@/app/actions/get-archived-tasks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Archive, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ++ CORRIGIDO: Tipo de retorno mais específico para o Badge ++
type PriorityVariant = "destructive" | "secondary" | "outline";

export default function ManutencaoArquivoPage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchivedTasks = async () => {
      setLoading(true);
      const response = await getArchivedTasks();
      if (response.success) {
        setTasks(response.data);
      } else {
        console.error(response.message);
      }
      setLoading(false);
    };

    fetchArchivedTasks();
  }, []);

  // ++ CORRIGIDO: Função agora retorna o tipo 'PriorityVariant' ++
  const getPriorityProps = (priority: 'low' | 'medium' | 'high'): { 
    variant: PriorityVariant, 
    text: string 
  } => {
    switch (priority) {
      case 'high':
        return { variant: 'destructive', text: 'Alta' };
      case 'medium':
        return { variant: 'secondary', text: 'Média' };
      default:
        return { variant: 'outline', text: 'Baixa' };
    }
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) return 'N/A';
    const date = new Date(dateInput.seconds ? dateInput.toDate() : dateInput);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin/manutencao">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Arquivo de Manutenção
            </h1>
            <p className="text-muted-foreground">
              Visualize todas as tarefas que já foram concluídas e arquivadas.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Tarefas Arquivadas
          </CardTitle>
          <CardDescription>
            Lista de tarefas movidas para o arquivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 p-12 text-center h-64">
              <Inbox className="h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-700">
                Nenhuma tarefa arquivada
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Tarefas com status 'archived' aparecerão aqui.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Delegado Para</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const priority = getPriorityProps(task.priority);
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.location}</TableCell>
                      <TableCell>
                        {/* A 'variant' agora tem o tipo correto */}
                        <Badge variant={priority.variant}>{priority.text}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(task.createdAt)}</TableCell>
                      <TableCell>
                        {task.assignedTo && task.assignedTo.length > 0
                          ? task.assignedTo.join(', ')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}