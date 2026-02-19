'use client'

import { useState, useTransition, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  WeddingFormValues,
  weddingFormSchema,
} from '@/lib/schemas/wedding-schema'
import { createWedding } from '@/app/actions/manage-wedding'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
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
// ++ REMOVIDO: Popover e Calendar não são mais necessários aqui
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover'
// import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Loader2, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
// ++ ATUALIZADO: parseISO é necessário para ler a data do input
import { format, addDays, parseISO } from 'date-fns' 
import { ptBR } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

export function WeddingFormDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<WeddingFormValues>({
    resolver: zodResolver(weddingFormSchema),
    defaultValues: {
      coupleName: '',
      location: undefined,
      guestCount: 100,
      totalValue: 25000,
      internalObservations: '',
      coupleCity: '',
      plannerName: '',
      soundSupplierName: '',
      buffetSupplierName: '',
      hasLodgeExclusivity: false,
    },
  })

  const { watch, setValue } = form
  const watchedWeddingDate = watch('weddingDate')

  useEffect(() => {
    if (watchedWeddingDate) {
      try {
        const checkIn = addDays(watchedWeddingDate, -1)
        const checkOut = addDays(watchedWeddingDate, 1)

        setValue('checkInDate', checkIn, { shouldValidate: true })
        setValue('checkOutDate', checkOut, { shouldValidate: true })
      } catch (error) {
        console.error("Erro ao definir datas de hospedagem:", error)
      }
    }
  }, [watchedWeddingDate, setValue]) 

  const onSubmit = (values: WeddingFormValues) => {
    startTransition(async () => {
      const result = await createWedding(values)
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Casamento
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[750px]"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Adicionar Novo Casamento</DialogTitle>
          <DialogDescription>
            Preencha os dados principais do contrato. Outros detalhes poderão
            ser editados após a criação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pr-1"
          >
            <div className="max-h-[70vh] overflow-y-auto pr-5 space-y-4">
              {/* (Campos de Nome e Cidade inalterados) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="coupleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Casal (Ex: Milene & Pedro)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome & Nome"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="coupleCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade dos Noivos</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Florianópolis - SC"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-4" />
              <p className="text-sm font-medium text-foreground">Fornecedores Iniciais</p>

              {/* (Campos de Fornecedores inalterados) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plannerName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Cerimonialista Escolhida</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome da cerimonialista ou empresa"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="soundSupplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor de Som</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Léo Mix (Exclusivo)"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buffetSupplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor do Buffet</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Altamari (Exclusivo)"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-4" />
              <p className="text-sm font-medium text-foreground">
                Detalhes do Evento e Contrato
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* ++ INÍCIO DA ATUALIZAÇÃO (Data do Evento) ++ */}
                <FormField
                  control={form.control}
                  name="weddingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data do Evento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          // Formata o objeto Date do formulário para "yyyy-MM-dd"
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            // Converte a string "yyyy-MM-dd" de volta para um objeto Date
                            if (e.target.value) {
                              field.onChange(parseISO(e.target.value));
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* ++ FIM DA ATUALIZAÇÃO ++ */}

                {/* ++ INÍCIO DA ATUALIZAÇÃO (Início Hospedagem) ++ */}
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Início Hospedagem</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              field.onChange(parseISO(e.target.value));
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* ++ FIM DA ATUALIZAÇÃO ++ */}
                
                {/* ++ INÍCIO DA ATUALIZAÇÃO (Fim Hospedagem) ++ */}
                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fim Hospedagem</FormLabel>
                       <FormControl>
                        <Input
                          type="date"
                          value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              field.onChange(parseISO(e.target.value));
                            } else {
                              field.onChange(undefined);
                            }
                          }}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* ++ FIM DA ATUALIZAÇÃO ++ */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o local" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Maram">Maram</SelectItem>
                          <SelectItem value="Mayam">Mayam</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº de Convidados</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total (Contrato)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* (Checkbox e Observações inalterados) */}
              <FormField
                control={form.control}
                name="hasLodgeExclusivity"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Exclusividade de Hospedagem?</FormLabel>
                      <FormDescription>
                        Marque se o contrato inclui a exclusividade de toda a pousada.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="internalObservations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes do contrato, pedidos especiais, etc."
                        className="resize-none"
                        {...field}
                        disabled={isPending}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Salvar Casamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}