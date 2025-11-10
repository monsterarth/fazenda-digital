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
// ++ INÍCIO DA ADIÇÃO ++
import { WeddingGeneralForm } from './forms/WeddingGeneralForm'
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
      {/* CABEÇALHO DO DOSSIÊ */}
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
          {/* Removemos o botão "Salvar" genérico daqui,
            pois cada aba terá seu próprio botão "Salvar".
          */}
        </div>
      </div>

      {/* ABAS DE GERENCIAMENTO */}
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

        {/* Conteúdo da Aba 1: Geral (ATUALIZADO) */}
        <TabsContent value="geral" className="mt-4">
          {/* Substituímos o <p> pelo formulário real */}
          <WeddingGeneralForm wedding={weddingData} />
        </TabsContent>

        {/* Conteúdo da Aba 2: Financeiro */}
        <TabsContent value="financeiro" className="mt-4">
          <h3 className="text-xl font-semibold mb-4">Gestão Financeira</h3>
          <p>
            (Aqui vamos construir o módulo de gestão do Valor Total,
            Parcelamento e Caução.)
          </p>
        </TabsContent>

        {/* Conteúdo da Aba 3: Fornecedores */}
        <TabsContent value="fornecedores" className="mt-4">
          <h3 className="text-xl font-semibold mb-4">
            Gestão de Fornecedores
          </h3>
          <p>
            (Aqui vamos construir uma tabela (CRUD) para adicionar, editar e
            remover fornecedores da lista 'suppliers'.)
          </p>
        </TabsContent>

        {/* Conteúdo da Aba 4: Checklist */}
        <TabsContent value="checklist" className="mt-4">
          <h3 className="text-xl font-semibold mb-4">Checklist do Evento</h3>
          <p>
            (Aqui vamos construir um checklist interativo (CRUD) para as
            tarefas do cliente e da equipe interna.)
          </p>
        </TabsContent>

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