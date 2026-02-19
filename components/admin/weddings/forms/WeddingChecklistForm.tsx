'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  WeddingChecklistFormValues,
  weddingChecklistFormSchema,
} from '@/lib/schemas/wedding-schema'
import { WeddingData } from '@/app/actions/get-weddings'
import { updateWeddingChecklist } from '@/app/actions/manage-wedding'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Pencil, PlusCircle, Trash2, CalendarIcon, User, Home } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface WeddingChecklistFormProps {
  wedding: WeddingData
}

export function WeddingChecklistForm({ wedding }: WeddingChecklistFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<WeddingChecklistFormValues>({
    resolver: zodResolver(weddingChecklistFormSchema),
    defaultValues: {
      checklist: wedding.checklist.map(task => ({
        ...task,
        // Converte a string de data (ou null) de volta para Date (ou undefined)
        deadline: task.deadline ? parseISO(task.deadline) : undefined
      })) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'checklist',
  })

  const { reset } = form

  const onSubmit = (values: WeddingChecklistFormValues) => {
    startTransition(async () => {
      const result = await updateWeddingChecklist(wedding.id, values)
      if (result.success) {
        toast.success(result.message)
        setIsEditing(false)
        reset(values)
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleCancel = () => {
    reset()
    setIsEditing(false)
  }

  const addTask = (responsible: 'Contratada' | 'Contratante') => {
    append({
      id: `new-${Math.random().toString(36).substring(2, 9)}`,
      description: '',
      isDone: false,
      responsible: responsible,
      deadline: undefined,
    })
  }
  
  // Separa as tarefas por responsável para a "Ficha"
  const tasksContratada = form.getValues('checklist').filter(t => t.responsible === 'Contratada')
  const tasksContratante = form.getValues('checklist').filter(t => t.responsible === 'Contratante')

  // MODO "FICHA" (READ-ONLY)
  if (!isEditing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Checklist do Evento</CardTitle>
          <Button
            variant="outline"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna da Contratada (Equipe Interna) */}
          <div>
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <Home className="mr-2 h-5 w-5" />
              Tarefas Internas (Contratada)
            </h3>
            <div className="space-y-4">
              {tasksContratada.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa interna.</p>}
              {tasksContratada.map(task => (
                <div key={task.id} className="flex items-center space-x-3">
                  <Checkbox checked={task.isDone} disabled />
                  <div className="flex flex-col">
                    <span className={cn('font-medium', task.isDone && 'line-through text-muted-foreground')}>
                      {task.description}
                    </span>
                    {task.deadline && (
                       <span className={cn('text-xs text-muted-foreground', task.isDone && 'line-through')}>
                         {/* ++ CORREÇÃO: Removido o 3º argumento (options) ++ */}
                         Prazo: {format(task.deadline, 'P')}
                       </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Coluna do Contratante (Cliente) */}
          <div>
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <User className="mr-2 h-5 w-5" />
              Tarefas do Cliente (Contratante)
            </h3>
             <div className="space-y-4">
               {tasksContratante.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa do cliente.</p>}
              {tasksContratante.map(task => (
                <div key={task.id} className="flex items-center space-x-3">
                  <Checkbox checked={task.isDone} disabled />
                  <div className="flex flex-col">
                    <span className={cn('font-medium', task.isDone && 'line-through text-muted-foreground')}>
                      {task.description}
                    </span>
                    {task.deadline && (
                       <span className={cn('text-xs text-muted-foreground', task.isDone && 'line-through')}>
                         {/* ++ CORREÇÃO: Removido o 3º argumento (options) ++ */}
                         Prazo: {format(task.deadline, 'P')}
                       </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // MODO "EDIÇÃO" (O FORMULÁRIO)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Editando Checklist do Evento</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-4">
              {fields.map((item, index) => (
                <div key={item.id} className="flex items-start space-x-3 p-4 border rounded-md">
                  <FormField
                    control={form.control}
                    name={`checklist.${index}.isDone`}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                        className="mt-1"
                      />
                    )}
                  />
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`checklist.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-3">
                          <FormLabel>Descrição da Tarefa</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isPending} placeholder="Ex: Enviar lista de convidados" />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name={`checklist.${index}.responsible`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isPending}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Contratada">Equipe (Contratada)</SelectItem>
                              <SelectItem value="Contratante">Cliente (Contratante)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`checklist.${index}.deadline`}
                      render={({ field }) => (
                         <FormItem className="flex flex-col">
                           <FormLabel>Prazo (Opcional)</FormLabel>
                           <Popover>
                             <PopoverTrigger asChild>
                               <FormControl>
                                 <Button
                                   variant={'outline'}
                                   className={cn(
                                     'w-full pl-3 text-left font-normal',
                                     !field.value && 'text-muted-foreground',
                                   )}
                                   disabled={isPending}
                                 >
                                   {field.value ? (
                                     // (Mantido aqui, pois 'ptBR' é necessário para a UI)
                                     format(field.value, 'P', { locale: ptBR })
                                   ) : (
                                     <span>Definir prazo</span>
                                   )}
                                   <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                 </Button>
                               </FormControl>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0" align="start">
                               <Calendar
                                 mode="single"
                                 selected={field.value}
                                 onSelect={field.onChange}
                                 initialFocus
                               />
                             </PopoverContent>
                           </Popover>
                         </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={isPending}
                    className="mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTask('Contratada')}
                disabled={isPending}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Tarefa Interna
              </Button>
               <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTask('Contratante')}
                disabled={isPending}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Tarefa do Cliente
              </Button>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Salvar Checklist
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}