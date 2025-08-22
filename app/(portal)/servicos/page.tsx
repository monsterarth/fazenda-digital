"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgendamentosTab } from '@/components/guest/servicos/AgendamentosTab';
import { SolicitacoesTab } from '@/components/guest/servicos/SolicitacoesTab';
import { AcompanhamentoTab } from '@/components/guest/servicos/AcompanhamentoTab';

export default function ServicosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Serviços e Solicitações</h1>
        <p className="text-muted-foreground">Agende experiências, peça itens e acompanhe seus pedidos.</p>
      </div>
      <Tabs defaultValue="acompanhamento">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="agendar" className="text-xs sm:text-sm">Agendar</TabsTrigger>
          <TabsTrigger value="solicitar" className="text-xs sm:text-sm">Solicitar</TabsTrigger>
          <TabsTrigger value="acompanhamento" className="text-xs sm:text-sm">Acompanhar</TabsTrigger>
        </TabsList>
        <TabsContent value="agendar" className="mt-6">
          <AgendamentosTab />
        </TabsContent>
        <TabsContent value="solicitar" className="mt-6">
          <SolicitacoesTab />
        </TabsContent>
        <TabsContent value="acompanhamento" className="mt-6">
          <AcompanhamentoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}