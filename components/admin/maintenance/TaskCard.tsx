// components/admin/maintenance/TaskCard.tsx

"use client";

import React from 'react';
import { 
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';
import { MaintenanceTask, StaffMember } from '@/types/maintenance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Lock, RefreshCw, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
import { useModalStore } from '@/hooks/use-modal-store';

interface TaskCardProps {
  task: MaintenanceTask;
  index: number;
  allTasks: MaintenanceTask[];
  staff: StaffMember[];
}

const getInitials = (name: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export const TaskCard = ({ task, index, allTasks, staff }: TaskCardProps) => {
  const { onOpen } = useModalStore();

  // ## INÍCIO DA CORREÇÃO ##
  // Adicionamos '|| []' para garantir que, se 'task.dependsOn' for undefined,
  // usaremos um array vazio, o que previne o crash do .map()
  const incompleteDependencies = (task.dependsOn || []).map(depId => {
  // ## FIM DA CORREÇÃO ##
      const depTask = allTasks.find(t => t.id === depId);
      return depTask && depTask.status !== 'completed' ? depTask.title : null;
    }).filter(Boolean);
  
  const isBlocked = incompleteDependencies.length > 0;

  // ## INÍCIO DA CORREÇÃO PROATIVA ##
  // Aplicando a mesma lógica defensiva para 'assignedTo'
  const assignedStaff = staff.filter(s => (task.assignedTo || []).includes(s.email));
  // ## FIM DA CORREÇÃO PROATIVA ##

  const priorityInfo = {
    high: { icon: <ArrowUp className="h-4 w-4 text-red-500" />, label: "Alta" },
    medium: { icon: <ArrowRight className="h-4 w-4 text-yellow-500" />, label: "Média" },
    low: { icon: <ArrowDown className="h-4 w-4 text-green-500" />, label: "Baixa" },
  };

  const openDelegateModal = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onOpen('delegateMaintenanceTask', { task, staff });
  };

  // ++ NOVO: Função para abrir o modal de EDIÇÃO ++
  const openEditModal = () => {
    // Passa todos os dados que o modal possa precisar
    onOpen('editMaintenanceTask', { task, staff, allTasks });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Draggable
        draggableId={task.id}
        index={index}
        isDragDisabled={isBlocked && task.status === 'pending'}
      >
        {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="w-full"
            onClick={openEditModal} // ++ ADICIONADO: onClick no card principal ++
          >
            <Card
              className={cn(
                'hover:shadow-md transition-shadow cursor-pointer',
                snapshot.isDragging ? 'shadow-lg' : '',
                isBlocked ? 'opacity-70 border-dashed border-red-500' : ''
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{task.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  {/* Avatares e Delegação */}
                  <div 
                    className="flex items-center -space-x-2 cursor-pointer hover:opacity-80"
                    onClick={openDelegateModal}
                  >
                    {assignedStaff.length > 0 ? (
                      assignedStaff.map(s => (
                        <Tooltip key={s.uid}>
                          <TooltipTrigger>
                            <Avatar className="h-7 w-7 border-2 border-background">
                              <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>{s.name}</TooltipContent>
                        </Tooltip>
                      ))
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>
                          <Avatar className="h-7 w-7 border-2 border-dashed border-muted-foreground">
                            <AvatarFallback>?</AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>Delegar tarefa</TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Ícones de Status */}
                  <div className="flex items-center gap-2">
                    {isBlocked && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Lock className="h-4 w-4 text-red-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Bloqueado por: {incompleteDependencies.join(', ')}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {task.recurrence && (
                      <Tooltip>
                        <TooltipTrigger>
                          <RefreshCw className="h-4 w-4 text-blue-500" />
                        </TooltipTrigger>
                        <TooltipContent>Tarefa recorrente</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger>
                        {priorityInfo[task.priority].icon}
                      </TooltipTrigger>
                      <TooltipContent>
                        Prioridade: {priorityInfo[task.priority].label}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                <Badge variant="outline">{task.location}</Badge>
              </CardContent>
            </Card>
          </div>
        )}
      </Draggable>
    </TooltipProvider>
  );
};