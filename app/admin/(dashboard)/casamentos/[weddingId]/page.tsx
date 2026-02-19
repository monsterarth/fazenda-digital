import { getWeddingById, WeddingData } from '@/app/actions/get-weddings'
import { WeddingDossierClient } from '@/components/admin/weddings/WeddingDossierClient'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FileWarning } from 'lucide-react'
import { notFound } from 'next/navigation'

interface DossierPageProps {
  params: {
    weddingId: string
  }
}

// Este é um Server Component que busca os dados
export default async function WeddingDossierPage({ params }: DossierPageProps) {
  const { weddingId } = params

  if (!weddingId) {
    return notFound()
  }

  const wedding = await getWeddingById(weddingId)

  // Se o casamento não for encontrado no banco de dados
  if (!wedding) {
    return (
      <div className="p-4 md:p-8 pt-6">
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            O dossiê de casamento com o ID '{weddingId}' não foi encontrado.
            Verifique o ID ou retorne para a lista.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Se encontrado, passamos os dados para o Componente Cliente
  // que cuidará da interatividade (abas, formulários, etc.)
  return <WeddingDossierClient weddingData={wedding} />
}