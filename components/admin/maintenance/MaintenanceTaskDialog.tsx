// components/admin/maintenance/MaintenanceTaskDialog.tsx

"use client";

import React, { useEffect, useState } from 'react';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModalStore } from '@/hooks/use-modal-store';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaintenanceTask, StaffMember } from '@/types/maintenance';
// ++ ATUALIZADO: Importa todas as actions necessárias ++
import { 
  createMaintenanceTask, 
  updateMaintenanceTask, 
  deleteMaintenanceTask 
} from '@/app/actions/manage-maintenance-task';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card'; 
import { Separator } from '@/components/ui/separator';
import { Timestamp } from 'firebase/firestore'; // Importa o tipo Timestamp

// Schema "plano" (flat)
const taskFormSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  priority: z.enum(["low", "medium", "high"]),
  location: z.string().min(1, "A localização é obrigatória."),
  description: z.string().optional(),
  dependsOn: z.array(z.string()).optional(), // Array de IDs
  
  isRecurring: z.boolean().default(false), 
  recurrenceFrequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.coerce.number().min(1).optional(),
  isIndefinite: z.boolean().default(true), 
  recurrenceEndDate: z.string().optional(),
})
.refine(data => {
    if (data.isRecurring && !data.recurrenceFrequency) {
        return false;
    }
    return true;
}, {
    message: "A frequência é obrigatória.",
    path: ["recurrenceFrequency"],
})
.refine(data => {
    if (data.isRecurring && !data.isIndefinite && !data.recurrenceEndDate) {
        return false;
    }
    return true;
}, {
    message: "A data final é obrigatória (ou marque 'repetir indefinidamente').",
    path: ["recurrenceEndDate"],
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// Helper para formatar Timestamp (do Firestore) para string (do input date)
const formatTimestampForInput = (timestamp: any) => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    // É um Timestamp do Firestore
    return timestamp.toDate().toISOString().split('T')[0];
  }
  if (timestamp && typeof timestamp === 'string') {
    // Já pode ser uma string ISO
    return timestamp.split('T')[0];
  }
  return '';
};

export const MaintenanceTaskDialog = () => {
  const { isOpen, onClose, type, data } = useModalStore();
  const { user } = useAuth();
  
  const isModalOpen = isOpen && type === 'upsertMaintenanceTask';
  const { task, allTasks, staff } = data;

  const isEditMode = !!task; // Se 'task' existe, estamos em modo de edição

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      priority: 'medium',
      location: '',
      description: '',
      dependsOn: [],
      isRecurring: false, 
      recurrenceFrequency: 'weekly',
      recurrenceInterval: 1,
      isIndefinite: true, 
      recurrenceEndDate: '',
    },
  });

  // Preenche o formulário quando o modal abre (seja para editar ou criar)
  useEffect(() => {
    if (isModalOpen) {
      if (isEditMode && task) {
        // MODO EDIÇÃO: Preenche com dados da tarefa
        const recurrence = task.recurrence;
        // Verifica se a data final é a data "100 anos no futuro"
        const endDateString = formatTimestampForInput(recurrence?.endDate);
        const isEffectivelyIndefinite = !endDateString || new Date(endDateString).getFullYear() > 2100;

        form.reset({
          title: task.title,
          priority: task.priority,
          location: task.location,
          description: task.description || '',
          dependsOn: task.dependsOn || [],
          isRecurring: !!recurrence,
          recurrenceFrequency: recurrence?.frequency || 'weekly',
          recurrenceInterval: recurrence?.interval || 1,
          isIndefinite: isEffectivelyIndefinite,
          recurrenceEndDate: isEffectivelyIndefinite ? '' : endDateString,
        });
      } else {
        // MODO CRIAÇÃO: Reseta para os padrões
        form.reset({
          title: '',
          priority: 'medium',
          location: '',
          description: '',
          dependsOn: [],
          isRecurring: false, 
          recurrenceFrequency: 'weekly',
          recurrenceInterval: 1,
          isIndefinite: true, 
          recurrenceEndDate: '',
        });
      }
    }
  }, [isModalOpen, isEditMode, task, form]);


  // Observa os valores para controlar a UI
  const isRecurring = form.watch('isRecurring');
  const isIndefinite = form.watch('isIndefinite');

  const { isSubmitting } = form.formState;

  // ++ ATUALIZADO: onSubmit agora lida com CRIAR e EDITAR ++
  const onSubmit = async (values: TaskFormValues) => {
    if (!user?.email) {
      toast.error("Autenticação não encontrada.");
      return;
    }

    // 1. Desestrutura os valores do formulário
    const { 
      isRecurring, 
      recurrenceFrequency, 
      recurrenceInterval, 
      isIndefinite, 
      recurrenceEndDate, 
      ...restOfTask
    } = values;

    // 2. Cria o objeto base para a server action
    const dataToSubmit: any = { ...restOfTask };

    // 3. Constrói o objeto 'recurrence' SÓ SE 'isRecurring' for true
    if (isRecurring) {
      const recurrenceObject: any = {
        frequency: recurrenceFrequency,
        interval: recurrenceInterval || 1,
      };

      // 4. Lógica da data (100 anos no futuro)
      if (isIndefinite) {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 100);
        recurrenceObject.endDate = futureDate.toISOString().split('T')[0];
      } else {
        recurrenceObject.endDate = recurrenceEndDate;
      }
        
      dataToSubmit.recurrence = recurrenceObject;
    }
    
    // 5. Decide qual Action chamar
    let response;
    if (isEditMode && task) {
      // MODO EDIÇÃO
      response = await updateMaintenanceTask(task.id, dataToSubmit, user.email);
    } else {
      // MODO CRIAÇÃO
      response = await createMaintenanceTask(dataToSubmit, user.email);
    }

    if (response.success) {
      toast.success(isEditMode ? "Tarefa atualizada!" : "Tarefa criada!");
      handleClose();
    } else {
      toast.error(`Erro: ${response.message}`);
    }
  };

  // ++ NOVO: Handler para Excluir (chama a Server Action) ++
  const handleDelete = async () => {
    if (!isEditMode || !task || !user?.email) return;

    const response = await deleteMaintenanceTask(task.id, task.title, user.email);

    if (response.success) {
      toast.success("Tarefa excluída com sucesso!");
      handleClose();
    } else {
      toast.error(`Erro: ${response.message}`);
    }
  };

  const handleClose = () => {
    form.reset(); // Limpa o formulário ao fechar
    onClose();
  };

  const availableDependencies = allTasks?.filter(t => t.status !== 'completed' && t.id !== task?.id) || [];

  if (!isModalOpen) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Tarefa" : "Criar Nova Tarefa"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Ajuste os detalhes da tarefa." : "Preencha os detalhes da nova tarefa de manutenção."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="flex-1 flex flex-col justify-between"
          >
            {/* O ScrollArea agora envolve apenas o conteúdo do formulário */}
            <ScrollArea className="max-h-[70vh] pr-6"> 
              <div className="space-y-4 py-4">
                {/* --- Campos Principais --- */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Tarefa</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Consertar goteira Cabana 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detalhes adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Definir prioridade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="low">Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localização</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Piscina" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* --- Dependências --- */}
                <FormField
                  control={form.control}
                  name="dependsOn"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Depende de (Opcional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "justify-between w-full",
                                !field.value || field.value.length === 0
                                  ? "text-muted-foreground"
                                  : ""
                              )}
                            >
                              {field.value && field.value.length > 0
                                ? `${field.value.length} tarefa(s) selecionada(s)`
                                : "Selecionar tarefas..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar tarefas..." />
                            <CommandEmpty>Nenhuma tarefa encontrada.</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                <ScrollArea className="h-48">
                                  {availableDependencies.map((task) => (
                                    <CommandItem
                                      value={task.title}
                                      key={task.id}
                                      onSelect={() => {
                                        const selected = field.value || [];
                                        const newValue = selected.includes(task.id)
                                          ? selected.filter((id) => id !== task.id)
                                          : [...selected, task.id];
                                        field.onChange(newValue);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value?.includes(task.id)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {task.title}
                                    </CommandItem>
                                  ))}
                                </ScrollArea>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Seção de Recorrência Unificada */}
                <Card>
                  <CardContent className="pt-6">
                    <FormField
                      control={form.control}
                      name="isRecurring"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-base font-semibold">
                              Tarefa Recorrente
                            </FormLabel>
                            <FormDescription>
                              Esta tarefa será recriada automaticamente.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    {isRecurring && (
                      <div className="space-y-4">
                        <Separator className="mt-4" />
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <FormField
                            control={form.control}
                            name="recurrenceFrequency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequência</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="daily">Diária</SelectItem>
                                    <SelectItem value="weekly">Semanal</SelectItem>
                                    <SelectItem value="monthly">Mensal</SelectItem>
                                    <SelectItem value="yearly">Anual</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="recurrenceInterval"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Intervalo</FormLabel>
                                <FormControl>
                                  <Input type="number" min={1} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="isIndefinite"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      form.setValue('recurrenceEndDate', '');
                                      form.clearErrors('recurrenceEndDate');
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Repetir indefinidamente</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="recurrenceEndDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data Final</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                  disabled={isIndefinite} 
                                  className={cn(isIndefinite && "disabled:opacity-50")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
            
            {/* Botões do Footer */}
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between pt-4">
              {/* Botão de Excluir (só aparece no modo de edição) */}
              {isEditMode ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="w-full sm:w-auto" disabled={isSubmitting}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir Tarefa
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação é permanente. A tarefa "{task?.title}" será excluída.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sim, excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div></div> // Espaçador para manter o layout
              )}
              
              {/* Botões de Salvar/Cancelar */}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? "Salvar Alterações" : "Criar Tarefa"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};