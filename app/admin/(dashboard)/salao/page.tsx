// app/admin/(dashboard)/salao/page.tsx
'use client';

import React, { useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SalaoManagementPanel } from './components/SalaoManagementPanel';
import { SalaoOrderPanel } from './components/SalaoOrderPanel';
import { Toaster } from 'sonner';
import { Coffee } from 'lucide-react';

/**
 * Página principal do Gerenciador do Salão (Versão Admin/Desktop).
 * Esta página combina os fluxos de Gerenciamento de Mesas e
 * Tomada de Pedidos em uma única interface Master-Detail.
 * O fluxo de Check-in foi movido para um Sheet.
 */
export default function SalaoAdminPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  /**
   * Chamado pelo painel de gerenciamento quando uma mesa é fechada,
   * para que o painel de pedidos possa ser limpo.
   */
  const handleTableClosure = () => {
    setSelectedTable(null);
  };

  return (
    // h-full é crucial e funciona graças ao nosso novo layout.tsx
    <div className="flex flex-col h-full bg-gray-50">
      <Toaster richColors position="top-right" />

      {/* Este cabeçalho agora está DENTRO da página, 
        permitindo que a Sidebar do admin fique visível.
      */}
      <div className="p-4 md:p-6 border-b bg-white">
        <h1 className="text-2xl font-bold text-brand-dark-green flex items-center">
          <Coffee className="h-6 w-6 mr-3 text-brand-primary" />
          Gerenciamento do Salão
        </h1>
        <p className="text-sm text-brand-mid-green">
          Gerencie mesas, aloque hóspedes e envie pedidos para a cozinha.
        </p>
      </div>

      {/* Layout Principal Redimensionável */}
      <div className="flex-grow p-4 md:p-6 min-h-0">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full w-full rounded-lg border bg-white shadow-sm"
        >
          {/* Painel da Esquerda: Gerenciamento de Mesas */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <SalaoManagementPanel
              onSelectTable={setSelectedTable}
              selectedTableId={selectedTable}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Painel da Direita: Tomada de Pedidos (Comanda) */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <SalaoOrderPanel
              tableId={selectedTable}
              onTableClosed={handleTableClosure}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}