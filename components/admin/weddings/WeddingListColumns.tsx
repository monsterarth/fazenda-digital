'use client'

import { ColumnDef, Column, Row } from '@tanstack/table-core'
import { WeddingData } from '@/app/actions/get-weddings'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, ArrowUpDown, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteWedding } from '@/app/actions/manage-wedding'
import { toast } from 'sonner'

// (As funções helper formatCurrency e getPaymentStatus 
// permanecem as mesmas que criamos antes)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const getPaymentStatus = (
  installments: WeddingData['paymentPlan'],
): { status: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' } => {
  if (!installments || installments.length === 0) {
    return { status: 'N/A', variant: 'secondary' }
  }
  const allPaid = installments.every((p) => p.isPaid)
  if (allPaid) {
    return { status: 'Pago', variant: 'default' }
  }
  const somePaid = installments.some((p) => p.isPaid)
  if (somePaid) {
    return { status: 'Parcial', variant: 'outline' }
  }
  return { status: 'Pendente', variant: 'destructive' }
}

// ++ ATUALIZAÇÃO 1: Célula de Ações (Removendo "Abrir Dossiê") ++
// Componente da célula de Ações agora tem apenas Excluir
const CellActions = ({ row }: { row: Row<WeddingData> }) => {
  const [isPending, startTransition] = useTransition()
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const wedding = row.original

  // Ação de exclusão real
  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteWedding(wedding.id)
      if (result.success) {
        toast.success(result.message)
        setIsAlertOpen(false) 
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          {/* Item "Abrir Dossiê" e Separador REMOVIDOS */}
          
          {/* O AlertDialogTrigger abre o diálogo de confirmação */}
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-red-600"
              onSelect={(e) => e.preventDefault()} 
            >
              Excluir Casamento
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Conteúdo do Diálogo de Confirmação de Exclusão */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente o
            dossiê do casamento de <strong>{wedding.coupleName}</strong> do
            banco de dados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sim, excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
// ++ FIM DA ATUALIZAÇÃO 1 ++

// ++ INÍCIO DA ADIÇÃO 2: Célula de Nome Clicável ++
const CoupleNameCell = ({ row }: { row: Row<WeddingData> }) => {
  const router = useRouter()
  const wedding = row.original

  const goToDossier = () => {
    router.push(`/admin/casamentos/${wedding.id}`)
  }

  return (
    // Usamos um botão com variant="link" para
    // manter a semântica de "ação" e o estilo
    <Button
      variant="link"
      // Resetamos o padding e a altura para parecer texto normal
      className="font-medium p-0 h-auto text-left" 
      onClick={goToDossier}
    >
      {wedding.coupleName}
    </Button>
  )
}
// ++ FIM DA ADIÇÃO 2 ++

export const columns: ColumnDef<WeddingData>[] = [
  // Coluna Casal (ATUALIZADA)
  {
    accessorKey: 'coupleName',
    header: ({ column }: { column: Column<WeddingData, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Casal
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    // Usamos o novo componente de célula clicável
    cell: CoupleNameCell, 
  },
  
  // (Colunas restantes inalteradas)
  {
    accessorKey: 'weddingDate',
    header: ({ column }: { column: Column<WeddingData, unknown> }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Data do Evento
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }: { row: Row<WeddingData> }) => {
      const date = parseISO(row.getValue('weddingDate'))
      const formattedDate = format(date, 'PPP', { locale: ptBR })
      return <div>{formattedDate}</div>
    },
  },

  {
    accessorKey: 'location',
    header: 'Local',
  },

  {
    accessorKey: 'paymentPlan',
    header: 'Status Pgto.',
    cell: ({ row }: { row: Row<WeddingData> }) => { 
      const { status, variant } = getPaymentStatus(row.getValue('paymentPlan'))
      return <Badge variant={variant}>{status}</Badge>
    },
  },

  {
    accessorKey: 'totalValue',
    header: () => <div className="text-right">Valor Contrato</div>,
    cell: ({ row }: { row: Row<WeddingData> }) => {
      return (
        <div className="text-right font-mono">
          {formatCurrency(row.getValue('totalValue'))}
        </div>
      )
    },
  },
  
  // Coluna Ações (ATUALIZADA)
  {
    id: 'actions',
    cell: CellActions, // O componente CellActions agora está atualizado
  },
]