// components/admin/maintenance/TaskCard.tsx

"use client";

import React from 'react';
import { 
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';
import { MaintenanceTask, StaffMember } from '@/types/maintenance';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'; // ++ Adicionado CardFooter ++
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
// ++ ATUALIZADO: Importa 'Archive' ++
import { Lock, RefreshCw, ArrowUp, ArrowRight, ArrowDown, Archive } from 'lucide-react';
import { useModalStore } from '@/hooks/use-modal-store';
import { Button } from '@/components/ui/button'; // ++ Adicionado Button ++

interface TaskCardProps {
  task: MaintenanceTask;
  index: number;
  allTasks: MaintenanceTask[];
  staff: StaffMember[];
  onArchiveClick?: (taskId: string) => void; // ++ ADICIONADO: Prop para arquivar ++
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

export const TaskCard = ({ task, index, allTasks, staff, onArchiveClick }: TaskCardProps) => {
  const { onOpen } = useModalStore();

  const incompleteDependencies = (task.dependsOn || []).map(depId => {
      const depTask = allTasks.find(t => t.id === depId);
      return depTask && depTask.status !== 'completed' ? depTask.title : null;
    }).filter(Boolean);
  
  const isBlocked = incompleteDependencies.length > 0;
  const assignedStaff = staff.filter(s => (task.assignedTo || []).includes(s.email));

  const priorityInfo = {
    high: { icon: <ArrowUp className="h-4 w-4 text-red-500" />, label: "Alta" },
    medium: { icon: <ArrowRight className="h-4 w-4 text-yellow-500" />, label: "Média" },
    low: { icon: <ArrowDown className="h-4 w-4 text-green-500" />, label: "Baixa" },
  };

  const openDelegateModal = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onOpen('delegateMaintenanceTask', { task, staff });
  };

  const openEditModal = () => {
    onOpen('upsertMaintenanceTask', { task, staff, allTasks });
  };

  // ++ NOVO: Handler para o botão de arquivar ++
  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o modal de edição abra
    if (onArchiveClick) {
      onArchiveClick(task.id);
    }
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
            onClick={openEditModal} 
          >
            <Card
              className={cn(
                'hover:shadow-md transition-shadow cursor-pointer flex flex-col', // ++ Adicionado flex flex-col ++
                snapshot.isDragging ? 'shadow-lg' : '',
                isBlocked ? 'opacity-70 border-dashed border-red-500' : ''
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{task.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow"> {/* ++ Adicionado flex-grow ++ */}
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
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

              {/* ++ NOVO: CardFooter com o botão de Arquivar ++ */}
              {task.status === 'completed' && (
                <CardFooter className="pt-2 pb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleArchiveClick}
                    disabled={!onArchiveClick}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Arquivar Tarefa
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        )}
      </Draggable>
    </TooltipProvider>
  );
};