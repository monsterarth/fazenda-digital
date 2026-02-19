import { getWeddings, WeddingData } from '@/app/actions/get-weddings'
import { WeddingCalendarClient } from '@/components/admin/weddings/WeddingCalendarClient'

export default async function CasamentosCalendarioPage() {
  // 1. Busca todos os casamentos (a action já existe)
  const weddings = await getWeddings()

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Visualize os períodos de hospedagem e dias de evento. As cores
        indicam o local. Clique em um dia de evento para abrir o dossiê.
      </p>
      
      {/* 2. Passa os dados para o componente cliente */}
      <WeddingCalendarClient weddings={weddings} />
    </div>
  )
}