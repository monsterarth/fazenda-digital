'use client'

import { WeddingData } from '@/app/actions/get-weddings'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Camera,
  CheckSquare,
  FileText,
  DollarSign,
  Users,
  Info,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { WeddingGeneralForm } from './forms/WeddingGeneralForm'
import { WeddingFinancialForm } from './forms/WeddingFinancialForm'
import { WeddingSuppliersForm } from './forms/WeddingSuppliersForm'
// ++ INÍCIO DA ADIÇÃO ++
import { WeddingChecklistForm } from './forms/WeddingChecklistForm'
// ++ FIM DA ADIÇÃO ++

interface DossierClientProps {
  weddingData: WeddingData
}

export function WeddingDossierClient({ weddingData }: DossierClientProps) {
  const weddingDate = parseISO(weddingData.weddingDate)
  const formattedDate = format(weddingDate, "eeee, dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  })

  return (
    <div className="space-y-6">
      {/* (Cabeçalho do Dossiê inalterado) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border">
            <AvatarImage src={weddingData.couplePhotoUrl || ''} />
            <AvatarFallback>
              <Camera className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {weddingData.coupleName}
            </h1>
            <p className="text-lg text-muted-foreground">
              {formattedDate} | {weddingData.location}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Camera className="mr-2 h-4 w-4" />
            Alterar Foto
          </Button>
        </div>
      </div>

      {/* (Abas de Gerenciamento inalteradas) */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="geral">
            <Info className="mr-2 h-4 w-4" /> Geral
          </TabsTrigger>
          <TabsTrigger value="financeiro">
            <DollarSign className="mr-2 h-4 w-4" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="fornecedores">
            <Users className="mr-2 h-4 w-4" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <CheckSquare className="mr-2 h-4 w-4" /> Checklist
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <FileText className="mr-2 h-4 w-4" /> Documentos
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo da Aba 1: Geral (Inalterado) */}
        <TabsContent value="geral" className="mt-4">
          <WeddingGeneralForm wedding={weddingData} />
        </TabsContent>

        {/* Conteúdo da Aba 2: Financeiro (Inalterado) */}
        <TabsContent value="financeiro" className="mt-4">
          <WeddingFinancialForm wedding={weddingData} />
        </TabsContent>

        {/* Conteúdo da Aba 3: Fornecedores (Inalterado) */}
        <TabsContent value="fornecedores" className="mt-4">
          <WeddingSuppliersForm wedding={weddingData} />
        </TabsContent>

        {/* ++ INÍCIO DA ATUALIZAÇÃO ++ */}
        {/* Conteúdo da Aba 4: Checklist */}
        <TabsContent value="checklist" className="mt-4">
          <WeddingChecklistForm wedding={weddingData} />
        </TabsContent>
        {/* ++ FIM DA ATUALIZAÇÃO ++ */}

        {/* Conteúdo da Aba 5: Documentos */}
        <TabsContent value="documentos" className="mt-4">
          <h3 className="text-xl font-semibold mb-4">Documentos</h3>
          <p>
            (Aqui vamos construir o módulo de upload de arquivos para o
            contrato e outros documentos.)
          </p> 
        </TabsContent>
      </Tabs>
    </div>
  )
}