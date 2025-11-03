// components/admin/maintenance/TaskCard.tsx

"use client";

import React from 'react';
import { MaintenanceTask } from '@/types/maintenance';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// ++ ÍCONES ATUALIZADOS ++
import { Award, Clock, MapPin, Tag, UserCheck, Hand, CheckSquare, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: MaintenanceTask;
  // Adicionaremos as ações (onDelegate, onUpdateStatus) nos próximos passos
}

export function TaskCard({ task }: TaskCardProps) {
  
  const getPriorityProps = (priority: 'low' | 'medium' | 'high'): { 
    variant: "destructive" | "secondary" | "outline", 
    text: string 
  } => {
    switch (priority) {
      case 'high':
        return { variant: 'destructive', text: 'Alta' };
      case 'medium':
        return { variant: 'secondary', text: 'Média' };
      case 'low':
      default:
        return { variant: 'outline', text: 'Baixa' };
    }
  };

  const priorityProps = getPriorityProps(task.priority);
  
  const timeAgo = formatDistanceToNow(task.createdAt.toDate(), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          {/* Título */}
          <CardTitle className="text-lg">{task.title}</CardTitle>
          
          {/* Prioridade */}
          <Badge
            variant={priorityProps.variant} // Agora está 100% tipado
            className={cn(priorityProps.variant === 'destructive' ? 'bg-destructive' : '')}
          >
            {priorityProps.text}
          </Badge>
        </div>
        
        {/* Localização */}
        <CardDescription className="flex items-center gap-2 pt-2">
          <MapPin className="h-4 w-4" />
          {task.location}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow space-y-3">
        {/* Pontos */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="h-4 w-4" />
          <span>Vale {task.weight} pontos</span>
        </div>
        
        {/* Criado Por */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserCheck className="h-4 w-4" />
          <span>Criado por {task.createdBy}</span>
        </div>
        
        {/* Tempo */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{timeAgo}</span>
        </div>

        {/* Delegado Para (se existir) */}
        {task.assignedToName && (
           <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Tag className="h-4 w-4" />
            <span>Delegado para: {task.assignedToName}</span>
          </div>
        )}
      </CardContent>
      
      {/* ++ ESTA É A ALTERAÇÃO: Lógica do Footer atualizada para 4 status ++ */}
      <CardFooter>
        {task.status === 'backlog' && (
          <Button variant="outline" className="w-full" disabled>
            <Hand className="mr-2 h-4 w-4" />
            Delegar (em breve)
          </Button>
        )}
        {task.status === 'in_progress' && (
          <span className="text-sm text-blue-600 font-medium w-full text-center">
            Em andamento...
          </span>
        )}
        {task.status === 'awaiting_review' && (
          <Button variant="default" className="w-full" disabled>
            <CheckSquare className="mr-2 h-4 w-4" />
            Revisar e Arquivar
          </Button>
        )}
        {task.status === 'archived' && (
          <span className="flex items-center justify-center text-sm text-green-600 font-medium w-full text-center">
            <Archive className="mr-2 h-4 w-4" />
            Arquivada
          </span>
        )}
      </CardFooter>
    </Card>
  );
}