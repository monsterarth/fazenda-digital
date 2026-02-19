import { getWeddings, WeddingData } from '@/app/actions/get-weddings'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CalendarCheck, CalendarPlus } from 'lucide-react'
import { WeddingFormDialog } from '@/components/admin/weddings/WeddingFormDialog'

// Esta é uma Server Component (async)
export default async function CasamentosDashboardPage() {
  const weddings = await getWeddings()

  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1
  const yearAfterNext = currentYear + 2

  // Função para contar casamentos por ano
  const countWeddingsByYear = (data: WeddingData[], year: number) => {
    return data.filter(
      (w) => new Date(w.weddingDate).getUTCFullYear() === year,
    ).length
  }

  const countCurrentYear = countWeddingsByYear(weddings, currentYear)
  const countNextYear = countWeddingsByYear(weddings, nextYear)
  const countYearAfterNext = countWeddingsByYear(weddings, yearAfterNext)
  const totalConfirmed = weddings.length

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          CRM de Casamentos
        </h2>
        <div className="flex items-center space-x-2">
          {/* O WeddingFormDialog é um Client Component que contém o Trigger */}
          <WeddingFormDialog />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight">Dashboard</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Confirmados
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalConfirmed}</div>
              <p className="text-xs text-muted-foreground">
                Total de eventos futuros
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Casamentos em {currentYear}
              </CardTitle>
              <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countCurrentYear}</div>
              <p className="text-xs text-muted-foreground">Eventos neste ano</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Casamentos em {nextYear}
              </CardTitle>
              <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countNextYear}</div>
              <p className="text-xs text-muted-foreground">Eventos programados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Casamentos em {yearAfterNext}
              </CardTitle>
              <CalendarPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countYearAfterNext}</div>
              <p className="text-xs text-muted-foreground">Eventos programados</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* TODO: Aqui entra a Visão de Lista e a Visão de Calendário.
            Minha sugestão é criarmos páginas separadas para elas 
            (ex: /casamentos/calendario e /casamentos/lista)
            e mantermos este Dashboard limpo apenas com os KPIs.
          */}
        </div>
      </div>
    </div>
  )
}