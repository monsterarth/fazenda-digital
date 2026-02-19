'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  WeddingFinancialFormValues,
  weddingFinancialFormSchema,
} from '@/lib/schemas/wedding-schema'
import { WeddingData } from '@/app/actions/get-weddings'
import { updateWeddingFinancial } from '@/app/actions/manage-wedding'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CalendarIcon,
  Loader2,
  Pencil,
  Landmark,
  ShieldCheck,
  PlusCircle,
  Trash2,
  BadgeCent,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

// Helper para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Componente "Ficha de Informação"
const InfoField = ({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ElementType
  label: string
  value?: string | number | null
  children?: React.ReactNode
}) => {
  const Icon = icon
  return (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-muted-foreground mt-1" />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        {value && <p className="text-base font-semibold">{value}</p>}
        {children && <div className="text-base font-semibold">{children}</div>}
      </div>
    </div>
  )
}

interface WeddingFinancialFormProps {
  wedding: WeddingData
}

export function WeddingFinancialForm({ wedding }: WeddingFinancialFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  // ++ CORREÇÃO 1: Mantemos o tipo <WeddingFinancialFormValues>
  const form = useForm<WeddingFinancialFormValues>({
    resolver: zodResolver(weddingFinancialFormSchema),
    defaultValues: {
      totalValue: wedding.totalValue,
      
      // ++ CORREÇÃO 2: Verificamos se 'wedding.deposit' existe.
      // Se não existir (dados antigos), fornecemos um objeto padrão.
      // Isso satisfaz o TypeScript E o Zod.
      deposit: wedding.deposit 
        ? { value: wedding.deposit.value, status: wedding.deposit.status }
        : { value: 10000, status: 'Pendente' },
        
      paymentPlan: wedding.paymentPlan.map((p) => ({
        ...p,
        dueDate: parseISO(p.dueDate),
      })),
    },
  })

  // Hook para gerenciar a lista de parcelas
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'paymentPlan',
  })

  const { reset } = form

  const onSubmit = (values: WeddingFinancialFormValues) => {
    startTransition(async () => {
      const result = await updateWeddingFinancial(wedding.id, values)
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
  
  // Adiciona uma nova parcela vazia ao formulário
  const addInstallment = () => {
    append({
      id: `new-${Math.random().toString(36).substring(2, 9)}`, 
      description: '',
      value: 0,
      dueDate: new Date(),
      isPaid: false,
    })
  }

  // MODO "FICHA" (READ-ONLY)
  if (!isEditing) {
    const data = form.getValues()
    const totalPaid = data.paymentPlan
      .filter((p) => p.isPaid)
      .reduce((acc, p) => acc + p.value, 0)
    const totalPending = data.totalValue - totalPaid

    // ++ CORREÇÃO 3: Lógica de segurança para ler os dados do depósito
    const depositValue = data.deposit?.value || 0
    const depositStatus = data.deposit?.status || 'Pendente'

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestão Financeira</CardTitle>
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
            <InfoField
              icon={Landmark}
              label="Valor Total (Contrato)"
              value={formatCurrency(data.totalValue)}
            />
            <InfoField
              icon={BadgeCent}
              label="Total Recebido"
              value={formatCurrency(totalPaid)}
            />
            <InfoField
              icon={BadgeCent}
              label="Valor Pendente"
              value={formatCurrency(totalPending)}
            />
            <InfoField icon={ShieldCheck} label="Caução">
              <Badge
                variant={
                  depositStatus === 'Pendente'
                    ? 'destructive'
                    : 'default'
                }
              >
                {formatCurrency(depositValue)} ({depositStatus})
              </Badge>
            </InfoField>
          </div>

          <Separator />

          <div>
            <span className="text-sm font-medium text-muted-foreground">
              Plano de Pagamento
            </span>
            <div className="rounded-md border mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.paymentPlan.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        Nenhuma parcela cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.paymentPlan.map((installment) => (
                    <TableRow key={installment.id}>
                      <TableCell>
                        <Badge
                          variant={installment.isPaid ? 'default' : 'outline'}
                        >
                          {installment.isPaid ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>{installment.description}</TableCell>
                      <TableCell>
                        {format(installment.dueDate, 'PPP', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(installment.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
        <CardTitle>Editando Gestão Financeira</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Seção de Valores Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <FormField
                control={form.control}
                // ++ CORREÇÃO 4: Os nomes dos campos usam '?'
                // para que o TypeScript saiba que o objeto pai é opcional
                name="deposit.value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Caução</FormLabel>
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
              <FormField
                control={form.control}
                name="deposit.status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status do Caução</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Recebido">Recebido</SelectItem>
                        <SelectItem value="Devolvido">Devolvido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Seção de Plano de Pagamento Dinâmico */}
            <div>
              <h3 className="text-lg font-medium mb-4">Plano de Pagamento</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Pago?</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`paymentPlan.${index}.description`}
                            render={({ field }) => (
                              <Input {...field} disabled={isPending} />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`paymentPlan.${index}.dueDate`}
                            render={({ field }) => (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-[180px]"
                                      disabled={isPending}
                                    >
                                      {field.value ? (
                                        format(field.value, 'P', {
                                          locale: ptBR,
                                        })
                                      ) : (
                                        'Selecione'
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`paymentPlan.${index}.value`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                disabled={isPending}
                                className="w-[120px]"
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`paymentPlan.${index}.isPaid`}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isPending}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={addInstallment}
                disabled={isPending}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Parcela
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
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}