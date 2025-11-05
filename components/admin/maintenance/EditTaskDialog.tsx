// components/admin/maintenance/EditTaskDialog.tsx

"use client";

import React, { useEffect, useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// Schema de validação do formulário (espelhado da API)
const formSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  description: z.string().optional(),
  location: z.string().min(3, "A localização é obrigatória."),
  priority: z.enum(['low', 'medium', 'high']),
});

type TaskFormValues = z.infer<typeof formSchema>;

export function EditTaskDialog() {
  const { isOpen, type, data, onClose } = useModalStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isModalOpen = isOpen && type === 'editMaintenanceTask';
  const { task } = data; // Pega a tarefa dos dados do modal

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
  });

  // Preenche o formulário quando o modal abre com uma tarefa
  useEffect(() => {
    if (task && isModalOpen) {
      form.reset({
        title: task.title,
        description: task.description || '',
        location: task.location,
        priority: task.priority,
      });
    }
  }, [task, isModalOpen, form]);

  const handleClose = () => {
    form.reset();
    setIsSaving(false);
    setIsDeleting(false);
    onClose();
  };

  // Função para Salvar (PUT)
  const onSubmit = async (values: TaskFormValues) => {
    if (!task) return;
    setIsSaving(true);
    const toastId = toast.loading("Salvando alterações...");
    
    try {
      const response = await fetch(`/api/admin/maintenance/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Tarefa atualizada com sucesso!", { id: toastId });
        handleClose();
      } else {
        toast.error(data.message || "Falha ao salvar.", { id: toastId });
      }
    } catch (error) {
      toast.error("Erro de conexão.", { id: toastId });
    }
    setIsSaving(false);
  };

  // Função para Excluir (DELETE)
  const handleDelete = async () => {
    if (!task) return;
    setIsDeleting(true);
    const toastId = toast.loading("Excluindo tarefa...");

    try {
      const response = await fetch(`/api/admin/maintenance/${task.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Tarefa excluída com sucesso!", { id: toastId });
        handleClose();
      } else {
        toast.error(data.message || "Falha ao excluir.", { id: toastId });
      }
    } catch (error) {
      toast.error("Erro de conexão.", { id: toastId });
    }
    setIsDeleting(false);
  };
  
  if (!isModalOpen || !task) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
          <DialogDescription>
            Ajuste os detalhes da tarefa ou exclua-a.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea id="description" {...form.register('description')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Localização</Label>
            <Input id="location" {...form.register('location')} />
             {form.formState.errors.location && (
              <p className="text-xs text-red-500">{form.formState.errors.location.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {/* TODO: Adicionar campos para editar 'assignedTo' e 'dependsOn' */}
        </form>
        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Tarefa
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é permanente e não pode ser desfeita. A tarefa
                  "{task?.title}" será excluída.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sim, excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}