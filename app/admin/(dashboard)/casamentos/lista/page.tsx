import { getWeddings, WeddingData } from '@/app/actions/get-weddings'
import { WeddingListClient } from '@/components/admin/weddings/WeddingListClient'

// Esta é uma Server Component (async)
export default async function CasamentosListaPage() {
  const weddings = await getWeddings()

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Gerencie todos os eventos confirmados. Clique em "Ações" para editar
        o dossiê completo de cada casamento.
      </p>
      
      {/* Passamos os dados (WeddingData[]) para o componente cliente 
        que irá renderizar a tabela interativa.
      */}
      <WeddingListClient data={weddings} />
    </div>
  )
}