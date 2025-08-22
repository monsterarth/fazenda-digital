"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgendamentosTab } from '@/components/guest/servicos/AgendamentosTab';
import { SolicitacoesTab } from '@/components/guest/servicos/SolicitacoesTab';
import { AcompanhamentoTab } from '@/components/guest/servicos/AcompanhamentoTab';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ServicosPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Serviços e Solicitações</CardTitle>
          <CardDescription>
            Agende experiências, peça itens e acompanhe seus pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}