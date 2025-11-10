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
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
// ++ INÍCIO DA ADIÇÃO ++
import { useRouter } from 'next/navigation'
// ++ FIM DA ADIÇÃO ++

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

// ++ INÍCIO DA ATUALIZAÇÃO ++
// Criamos um componente interno para a célula de Ações
// para que possamos usar o hook useRouter()
const CellActions = ({ row }: { row: Row<WeddingData> }) => {
  const router = useRouter()
  const wedding = row.original

  const goToDossier = () => {
    router.push(`/admin/casamentos/${wedding.id}`)
  }

  const deleteWedding = () => {
    // TODO: Implementar action 'deleteWedding(wedding.id)'
    alert('Excluir: ' + wedding.coupleName)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={goToDossier}>
          Abrir Dossiê (Editar)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={deleteWedding} className="text-red-600">
          Excluir Casamento
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
// ++ FIM DA ATUALIZAÇÃO ++

export const columns: ColumnDef<WeddingData>[] = [
  // Coluna Casal
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
    cell: ({ row }: { row: Row<WeddingData> }) => (
      <div className="font-medium">{row.getValue('coupleName')}</div>
    ),
  },
  
  // Coluna Data do Evento
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
      // Usamos parseISO porque a data é uma string YYYY-MM-DD
      const date = parseISO(row.getValue('weddingDate'))
      const formattedDate = format(date, 'PPP', { locale: ptBR }) // 'P' é mais curto 'dd/MM/yyyy'
      return <div>{formattedDate}</div>
    },
  },

  // Coluna Local
  {
    accessorKey: 'location',
    header: 'Local',
  },

  // Coluna Status Pgto.
  {
    accessorKey: 'paymentPlan',
    header: 'Status Pgto.',
    cell: ({ row }: { row: Row<WeddingData> }) => { 
      const { status, variant } = getPaymentStatus(row.getValue('paymentPlan'))
      return <Badge variant={variant}>{status}</Badge>
    },
  },

  // Coluna Valor Contrato
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
    cell: CellActions, // Usamos nosso novo componente aqui
  },
]