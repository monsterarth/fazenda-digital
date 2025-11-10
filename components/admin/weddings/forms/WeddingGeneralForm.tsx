'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  WeddingGeneralFormValues,
  weddingGeneralFormSchema,
} from '@/lib/schemas/wedding-schema'
import { WeddingData } from '@/app/actions/get-weddings'
import { updateWeddingGeneral } from '@/app/actions/manage-wedding'
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
import { Textarea } from '@/components/ui/textarea'
import { CalendarIcon, Loader2, Pencil, Landmark, Users2, MapPin, Hash, Building } from 'lucide-react' // ++ Ícones
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface WeddingGeneralFormProps {
  wedding: WeddingData
}

// ++ INÍCIO DA ADIÇÃO ++
// Helper para formatar moeda (para a Ficha)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Componente "Ficha de Informação" (para o modo Read-Only)
const InfoField = ({
  icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number | null | undefined
}) => {
  const Icon = icon
  return (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-1" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <p className="text-base font-semibold">
          {value || '—'}
        </p>
      </div>
    </div>
  )
}
// ++ FIM DA ADIÇÃO ++

export function WeddingGeneralForm({ wedding }: WeddingGeneralFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<WeddingGeneralFormValues>({
    resolver: zodResolver(weddingGeneralFormSchema),
    defaultValues: {
      coupleName: wedding.coupleName,
      coupleCity: wedding.coupleCity || '',
      weddingDate: parseISO(wedding.weddingDate),
      checkInDate: parseISO(wedding.checkInDate),
      checkOutDate: parseISO(wedding.checkOutDate),
      location: wedding.location,
      guestCount: wedding.guestCount,
      totalValue: wedding.totalValue,
      internalObservations: wedding.internalObservations || '',
    },
  })

  // Hook 'reset' para ser usado no Cancelar
  const { reset } = form

  const onSubmit = (values: WeddingGeneralFormValues) => {
    startTransition(async () => {
      const result = await updateWeddingGeneral(wedding.id, values)
      if (result.success) {
        toast.success(result.message)
        setIsEditing(false)
        // Atualiza os 'defaultValues' do formulário para o novo estado
        reset(values) 
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleCancel = () => {
    reset() // Reseta o formulário para os 'defaultValues' originais
    setIsEditing(false)
  }

  // ++ INÍCIO DA ADIÇÃO: MODO "FICHA" (READ-ONLY) ++
  if (!isEditing) {
    // Rebuscamos os valores do formulário (que podem ter sido resetados pós-salvar)
    const data = form.getValues()

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Informações Gerais e Contrato</CardTitle>
          <Button
            variant="outline"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bloco de Datas */}
            <InfoField
              icon={CalendarIcon}
              label="Data do Evento"
              value={format(data.weddingDate, 'PPP', { locale: ptBR })}
            />
            <InfoField
              icon={CalendarIcon}
              label="Início Hospedagem"
              value={format(data.checkInDate, 'PPP', { locale: ptBR })}
            />
            <InfoField
              icon={CalendarIcon}
              label="Fim Hospedagem"
              value={format(data.checkOutDate, 'PPP', { locale: ptBR })}
            />
            {/* Bloco de Detalhes */}
            <InfoField
              icon={MapPin}
              label="Local"
              value={data.location}
            />
            <InfoField
              icon={Building}
              label="Cidade dos Noivos"
              value={data.coupleCity}
            />
            <InfoField
              icon={Users2}
              label="Nº de Convidados"
              value={data.guestCount}
            />
            {/* Bloco Financeiro */}
             <InfoField
              icon={Landmark} // Ou DollarSign
              label="Valor Total (Contrato)"
              value={formatCurrency(data.totalValue)}
            />
          </div>

          <Separator />

          {/* Observações */}
          <div>
            <span className="text-sm font-medium text-muted-foreground">
              Observações Internas
            </span>
            <p className="text-base whitespace-pre-wrap font-mono border bg-muted rounded-md p-4 mt-2">
              {data.internalObservations || 'Nenhuma observação.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  // ++ FIM DA ADIÇÃO: MODO "FICHA" ++

  // ++ INÍCIO: MODO "EDIÇÃO" (O FORMULÁRIO QUE JÁ TÍNHAMOS) ++
  return (
    <Card>
      <CardHeader>
        {/* Título muda para indicar a edição */}
        <CardTitle>Editando Informações Gerais</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Campos do formulário (exatamente como antes) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="coupleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Casal</FormLabel>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="weddingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Evento</FormLabel>
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
                              format(field.value, 'PPP', { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkInDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Início Hospedagem</FormLabel>
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
                              format(field.value, 'PPP', { locale: ptBR })
                            ) : (
                              <span>Data de Check-in</span>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkOutDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fim Hospedagem</FormLabel>
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
                              format(field.value, 'PPP', { locale: ptBR })
                            ) : (
                              <span>Data de Check-out</span>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      rows={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}