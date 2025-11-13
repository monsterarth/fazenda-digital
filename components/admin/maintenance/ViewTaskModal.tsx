// ARQUIVO: components/admin/maintenance/ViewTaskModal.tsx
// (Note: Corrigido com as importações faltantes)

'use client';

import { useModalStore } from '@/hooks/use-modal-store';
import { MaintenanceTask, StaffMember } from '@/types/maintenance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Pencil,
  MapPin,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  RefreshCw,
  Tag,
  Users,
  Paperclip,
  // --- 1. INÍCIO DAS CORREÇÕES ---
  CheckSquare, // <-- ADICIONADO
  Archive,     // <-- ADICIONADO
  // --- FIM DAS CORREÇÕES ---
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// --- 2. INÍCIO DAS CORREÇÕES ---
import { cn } from '@/lib/utils'; // <-- ADICIONADO
// --- FIM DAS CORREÇÕES ---

// Mapeamento de status para UI
const statusMap = {
  pending: {
    label: 'Pendente',
    color: 'bg-gray-500',
    icon: <Clock className="h-4 w-4" />,
  },
  in_progress: {
    label: 'Em Andamento',
    color: 'bg-blue-500',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  awaiting_review: {
    label: 'Em Revisão',
    color: 'bg-yellow-500 text-black',
    icon: <CheckSquare className="h-4 w-4" />, // <-- Erro 1 corrigido
  },
  completed: {
    label: 'Concluída',
    color: 'bg-green-600',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  archived: {
    label: 'Arquivada',
    color: 'bg-neutral-600',
    icon: <Archive className="h-4 w-4" />, // <-- Erro 2 corrigido
  },
};

export function ViewTaskModal() {
  const { isOpen, onClose, onOpen, type, data } = useModalStore();
  // Pegamos todos os dados, pois 'Editar' precisará deles
  const { task, staff, allTasks } = data as {
    task: MaintenanceTask;
    staff: StaffMember[];
    allTasks: MaintenanceTask[];
  };

  const isModalOpen = isOpen && type === 'viewMaintenanceTask';

  if (!isModalOpen || !task) {
    return null;
  }

  const handleEdit = () => {
    // Fecha este modal
    onClose();
    // Abre o modal de edição (upsert)
    onOpen('upsertMaintenanceTask', { task, staff, allTasks });
  };

  const currentStatus = statusMap[task.status] || statusMap.pending;

  // Encontra os nomes dos staff delegados
  const assignedStaffNames =
    task.assignedTo
      ?.map((email) => staff.find((s) => s.email === email)?.name)
      .filter(Boolean)
      .join(', ') || 'Ninguém';

  // Encontra os nomes das dependências
  const dependencyNames =
    task.dependsOn
      ?.map((id) => allTasks.find((t) => t.id === id)?.title)
      .filter(Boolean)
      .join(', ') || 'Nenhuma';

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-4 pt-2">
            <Badge
              className={cn('text-white', currentStatus.color)} // <-- Erro 3 corrigido
            >
              {currentStatus.icon}
              {currentStatus.label}
            </Badge>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {task.location}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* --- Seção de Detalhes da Conclusão --- */}
          {(task.completionNotes || task.completionImageUrl) && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <h3 className="text-lg font-semibold flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                Detalhes da Conclusão
              </h3>

              {/* 1. Notas da Equipe */}
              {task.completionNotes && (
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Notas da Equipe:
                  </Label>
                  <div className="p-3 bg-background rounded-md border">
                    <p className="text-sm whitespace-pre-wrap">
                      {task.completionNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Foto Anexada */}
              {task.completionImageUrl && (
                <div className="space-y-2">
                  <Label className="font-semibold flex items-center">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Foto Anexada:
                  </Label>
                  <a
                    href={task.completionImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative w-full h-64 rounded-md border overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={task.completionImageUrl}
                      alt="Foto da conclusão da tarefa"
                      layout="fill"
                      objectFit="cover"
                      className="rounded-md"
                    />
                  </a>
                </div>
              )}
            </div>
          )}
          {/* --- Fim da Seção de Detalhes --- */}

          {/* --- Detalhes da Tarefa --- */}
          <div className="space-y-4">
            {task.description && (
              <div className="space-y-2">
                <Label className="font-semibold">Descrição</Label>
                <p className="text-sm p-3 bg-muted/50 rounded-md border whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold flex items-center">
                  <Tag className="mr-2 h-4 w-4" />
                  Prioridade
                </Label>
                <p className="text-sm">{task.priority.toUpperCase()}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Delegado Para
                </Label>
                <p className="text-sm">{assignedStaffNames}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold flex items-center">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Depende de
                </Label>
                <p className="text-sm">{dependencyNames}</p>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Criada em
                </Label>
                <p className="text-sm">
                  {format(
                    task.createdAt.toDate(),
                    "d 'de' MMM, yyyy 'às' HH:mm",
                    {
                      locale: ptBR,
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="default" onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}