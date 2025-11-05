// components/manutencao/TaskCardMobile.tsx

"use client";

import React, { useState } from 'react';
import { MaintenanceTask, TaskStatus } from '@/types/maintenance';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Play, CheckCircle } from 'lucide-react';
import { updateTaskStatus } from '@/app/actions/manage-maintenance-task';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface TaskCardMobileProps {
  task: MaintenanceTask;
}

export const TaskCardMobile = ({ task }: TaskCardMobileProps) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const priorityInfo = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    if (!user?.email) {
      toast.error("Erro de autenticação.");
      return;
    }

    setIsUpdating(true);
    const toastId = toast.loading("Atualizando status...");

    // Chama a Server Action que já existe
    const response = await updateTaskStatus(task.id, newStatus, user.email);

    if (response.success) {
      toast.success("Status atualizado!", { id: toastId });
    } else {
      // A validação de dependência (se houver) será mostrada aqui
      toast.error(`Falha: ${response.message}`, { id: toastId });
    }
    setIsUpdating(false);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <Badge
            className={`flex-shrink-0 ${priorityInfo[task.priority]} text-white`}
          >
            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
          </Badge>
        </div>
        <CardDescription>
          <span className="font-semibold">Local:</span> {task.location}
        </CardDescription>
      </CardHeader>

      {task.description && (
        <CardContent>
          <p className="text-sm text-gray-700">{task.description}</p>
        </CardContent>
      )}

      <CardFooter className="bg-gray-50 p-4">
        {task.status === 'pending' && (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => handleUpdateStatus('in_progress')}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Iniciar Tarefa
          </Button>
        )}

        {task.status === 'in_progress' && (
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => handleUpdateStatus('completed')}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Concluir Tarefa
          </Button>
        )}

        {task.status === 'completed' && (
          <p className="text-sm text-green-700 font-medium w-full text-center">
            Tarefa concluída!
          </p>
        )}
      </CardFooter>
    </Card>
  );
};