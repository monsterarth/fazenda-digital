// components/admin/maintenance/CreateTaskSheet.tsx

"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
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
import { createMaintenanceTask } from '@/app/actions/manage-maintenance-task';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Esquema Zod para o formulário (do lado do cliente)
const taskFormSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  priority: z.enum(["low", "medium", "high"]),
  location: z.string().min(1, "A localização é obrigatória."),
  description: z.string().optional(),
  dependsOn: z.array(z.string()).optional(), // Array de IDs
  recurrence: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
      interval: z.coerce.number().min(1),
      endDate: z.string().optional(),
    })
    .optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export const CreateTaskSheet = ({ staff }: { staff: StaffMember[] }) => {
  const { isOpen, onClose, type, data } = useModalStore();
  const { user } = useAuth();
  const { allTasks } = data; // Pega as tarefas do store para o 'dependsOn'

  const isModalOpen = isOpen && type === 'createMaintenanceTask';

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      priority: 'medium',
      location: '',
      description: '',
      dependsOn: [],
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: TaskFormValues) => {
    if (!user?.email) {
      toast.error("Autenticação não encontrada.");
      return;
    }

    const response = await createMaintenanceTask(values, user.email);

    if (response.success) {
      toast.success("Tarefa criada com sucesso!");
      handleClose();
    } else {
      toast.error(`Erro: ${response.message}`);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  // Filtra tarefas que podem ser dependências (não concluídas)
  const availableDependencies = allTasks?.filter(t => t.status !== 'completed') || [];

  return (
    <Sheet open={isModalOpen} onOpenChange={handleClose}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Criar Nova Tarefa</SheetTitle>
          <SheetDescription>
            Preencha os detalhes da nova tarefa de manutenção.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="flex-1 flex flex-col justify-between space-y-4"
          >
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                {/* Campo de Dependência (Multi-Select) */}
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
                                "justify-between",
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
                
                {/* (Opcional: Adicionar campos de Recorrência aqui) */}
              </div>
            </ScrollArea>
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Tarefa
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};