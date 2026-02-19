'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  WeddingSuppliersFormValues,
  weddingSuppliersFormSchema,
} from '@/lib/schemas/wedding-schema'
import { WeddingData } from '@/app/actions/get-weddings'
import { updateWeddingSuppliers } from '@/app/actions/manage-wedding'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Pencil, PlusCircle, Trash2, User, Hammer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// ++ REMOVIDO: 'crypto' não existe no client-side
// import { randomUUID } from 'crypto' 

interface WeddingSuppliersFormProps {
  wedding: WeddingData
}

export function WeddingSuppliersForm({ wedding }: WeddingSuppliersFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<WeddingSuppliersFormValues>({
    resolver: zodResolver(weddingSuppliersFormSchema),
    defaultValues: {
      suppliers: wedding.suppliers || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'suppliers',
  })

  const { reset } = form

  const onSubmit = (values: WeddingSuppliersFormValues) => {
    startTransition(async () => {
      const result = await updateWeddingSuppliers(wedding.id, values)
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

  const addSupplier = () => {
    append({
      // ++ CORRIGIDO: Usando a mesma lógica client-side do formulário financeiro
      id: `new-${Math.random().toString(36).substring(2, 9)}`,
      name: '',
      service: '',
      category: 'Externo',
      contact: '',
      status: 'Pendente',
    })
  }

  // MODO "FICHA" (READ-ONLY)
  if (!isEditing) {
    const data = form.getValues()

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestão de Fornecedores</CardTitle>
          <Button
            variant="outline"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.suppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Nenhum fornecedor cadastrado.
                    </TableCell>
                  </TableRow>
                )}
                {data.suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>{supplier.service}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          supplier.category === 'Exclusivo'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {supplier.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{supplier.contact || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          supplier.status === 'Pago'
                            ? 'default'
                            : supplier.status === 'Confirmado'
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {supplier.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  // MODO "EDIÇÃO" (O FORMULÁRIO)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Editando Gestão de Fornecedores</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`suppliers.${index}.name`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Ex: Altamari"
                              disabled={isPending}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`suppliers.${index}.service`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Ex: Buffet"
                              disabled={isPending}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`suppliers.${index}.category`}
                          render={({ field }) => (
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
                                <SelectItem value="Exclusivo">
                                  Exclusivo
                                </SelectItem>
                                <SelectItem value="Externo">Externo</SelectItem>
                                <SelectItem value="Sugerido">
                                  Sugerido
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`suppliers.${index}.contact`}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="(48) 9..."
                              disabled={isPending}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`suppliers.${index}.status`}
                          render={({ field }) => (
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
                                <SelectItem value="Pendente">
                                  Pendente
                                </SelectItem>
                                <SelectItem value="Confirmado">
                                  Confirmado
                                </SelectItem>
                                <SelectItem value="Pago">Pago</SelectItem>
                              </SelectContent>
                            </Select>
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
              onClick={addSupplier}
              disabled={isPending}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Fornecedor
            </Button>

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