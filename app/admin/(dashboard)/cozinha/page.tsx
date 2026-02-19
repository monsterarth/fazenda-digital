// app/admin/(dashboard)/cozinha/page.tsx
'use client';

import React from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Bell, Package, ChefHat } from 'lucide-react';
import { SalaoKDS } from './components/SalaoKDS';
import { CestasPrepList } from './components/CestasPrepList';
import { Toaster } from 'sonner';

/**
 * Página principal da Cozinha, funcionando como um Hub.
 * Ela usa Abas para separar os dois fluxos de trabalho distintos:
 * 1. KDS em Tempo Real: Para pedidos do salão (kitchenOrders).
 * 2. Preparo Antecipado: Para as cestas do dia seguinte (breakfastOrders).
 */
export default function CozinhaPage() {
  return (
    // h-full funciona graças ao layout.tsx
    <div className="flex flex-col h-full bg-gray-50">
      <Toaster richColors position="top-right" />

      {/* Cabeçalho da Página */}
      <div className="p-4 md:p-6 border-b bg-white">
        <h1 className="text-2xl font-bold text-brand-dark-green flex items-center">
          <ChefHat className="h-6 w-6 mr-3 text-brand-primary" />
          Central da Cozinha
        </h1>
        <p className="text-sm text-brand-mid-green">
          Acompanhe os pedidos do salão e o preparo das cestas.
        </p>
      </div>

      {/* Conteúdo com Abas */}
      <div className="flex-grow p-4 md:p-6 min-h-0">
        <Tabs defaultValue="salao" className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 lg:max-w-md">
            <TabsTrigger value="salao">
              <Bell className="h-4 w-4 mr-2" />
              Pedidos do Salão (KDS)
            </TabsTrigger>
            <TabsTrigger value="cestas">
              <Package className="h-4 w-4 mr-2" />
              Preparo das Cestas
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: KDS em Tempo Real */}
          <TabsContent
            value="salao"
            className="flex-grow min-h-0 mt-4" // flex-grow e min-h-0 são essenciais
          >
            <SalaoKDS />
          </TabsContent>

          {/* Aba 2: Preparo Antecipado */}
          <TabsContent
            value="cestas"
            className="flex-grow min-h-0 mt-4"
          >
            <CestasPrepList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}