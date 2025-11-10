'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/ui/data-table'
import { WeddingData } from '@/app/actions/get-weddings'
import { columns } from './WeddingListColumns'
import { useAuth } from '@/context/AuthContext'
import { usePathname } from 'next/navigation'

interface WeddingListClientProps {
  data: WeddingData[]
}

export function WeddingListClient({ data }: WeddingListClientProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  
  // Estado do React para controlar o filtro global
  const [globalFilter, setGlobalFilter] = React.useState('')

  if (loading) {
    return <div>Carregando...</div>
  }

  // Ocultamos o botão de "Adicionar" se não estivermos na página principal
  const showAddButton = pathname === '/admin/casamentos'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filtrar por nome do casal..."
          // O Input agora controla o estado do React
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        {/* {showAddButton && <WeddingFormDialog />} */}
      </div>
      
      {/* Passamos o estado e o handler para o DataTable */}
      <DataTable
        columns={columns}
        data={data}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </div>
  )
}