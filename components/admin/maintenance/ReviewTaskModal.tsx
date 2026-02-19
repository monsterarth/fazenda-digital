// ARQUIVO: components/admin/maintenance/ReviewTaskModal.tsx
// (Note: Este é um NOVO ARQUIVO)

'use client';

import { useState } from 'react';
import { useModalStore } from '@/hooks/use-modal-store';
import { MaintenanceTask } from '@/types/maintenance';
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
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { updateTaskStatus } from '@/app/actions/manage-maintenance-task'; // Reusamos a Server Action
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

export function ReviewTaskModal() {
  const { user } = useAuth();
  const { isOpen, onClose, type, data } = useModalStore();
  const { task } = data as { task: MaintenanceTask };

  const isModalOpen = isOpen && type === 'reviewMaintenanceTask';

  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleAction = async (newStatus: 'completed' | 'pending') => {
    if (!task || !user?.email) {
      toast.error('Erro: Tarefa ou usuário não encontrados.');
      return;
    }

    setAction(newStatus === 'completed' ? 'approve' : 'reject');
    setIsLoading(true);

    const toastId = toast.loading(
      newStatus === 'completed' ? 'Aprovando tarefa...' : 'Rejeitando tarefa...',
    );

    // Usamos a mesma Server Action que já existe e funciona
    const response = await updateTaskStatus(task.id, newStatus, user.email);

    if (response.success) {
      toast.success(
        `Tarefa ${newStatus === 'completed' ? 'aprovada' : 'devolvida'}.`,
        { id: toastId },
      );
      handleClose();
    } else {
      toast.error(`Erro: ${response.message}`, { id: toastId });
    }

    setIsLoading(false);
    setAction(null);
  };

  if (!isModalOpen || !task) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Revisar Tarefa: {task.title}</DialogTitle>
          <DialogDescription>
            Analise o feedback e a imagem enviada pela equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* 1. Notas da Equipe */}
          {task.completionNotes && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Notas da Equipe:
              </Label>
              <div className="p-3 bg-muted rounded-md border">
                <p className="text-sm whitespace-pre-wrap">
                  {task.completionNotes}
                </p>
              </div>
            </div>
          )}

          {/* 2. Foto Anexada */}
          {task.completionImageUrl && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Foto Anexada:</Label>
              <div className="relative w-full h-64 rounded-md border overflow-hidden">
                <Image
                  src={task.completionImageUrl}
                  alt="Foto da conclusão da tarefa"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-md"
                />
              </div>
            </div>
          )}

          {!task.completionNotes && !task.completionImageUrl && (
            <p className="text-sm text-center text-muted-foreground py-8">
              Nenhuma nota ou foto foi anexada para esta tarefa.
            </p>
          )}
        </div>

        <Separator />

        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button
            variant="destructive"
            onClick={() => handleAction('pending')}
            disabled={isLoading}
          >
            {isLoading && action === 'reject' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ThumbsDown className="mr-2 h-4 w-4" />
            )}
            Rejeitar (Devolver)
          </Button>
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleAction('completed')}
            disabled={isLoading}
          >
            {isLoading && action === 'approve' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ThumbsUp className="mr-2 h-4 w-4" />
            )}
            Aprovar e Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}