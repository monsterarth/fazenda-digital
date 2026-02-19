// app/admin/(dashboard)/settings/estoque/page.tsx
'use client';

import React from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Package, Truck, Calculator } from 'lucide-react';
import { IngredientsTab } from './components/IngredientsTab';
import { SuppliersTab } from './components/SuppliersTab';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Toaster } from 'sonner';

export default function EstoqueSettingsPage() {
  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />
      
      <div>
        <h1 className="text-3xl font-bold text-brand-dark-green">Estoque & Custos</h1>
        <p className="text-brand-mid-green">
          Gerencie ingredientes e fornecedores para automatizar o cálculo de custos (CMV).
        </p>
      </div>

      <Tabs defaultValue="ingredients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ingredients">
            <Package className="h-4 w-4 mr-2" />
            Ingredientes
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Truck className="h-4 w-4 mr-2" />
            Fornecedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro de Ingredientes</CardTitle>
              <CardDescription>
                Defina as matérias-primas usadas nos pratos e seus custos médios.
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <IngredientsTab />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Fornecedores e Produtos</CardTitle>
              <CardDescription>
                Cadastre fornecedores e vincule os produtos deles aos seus ingredientes para atualizar os custos.
              </CardDescription>
            </CardHeader>
            <div className="p-6 pt-0">
              <SuppliersTab />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}