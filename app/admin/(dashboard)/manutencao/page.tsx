// ARQUIVO: app/admin/(dashboard)/manutencao/page.tsx
// (Note: Adicionando o novo ViewTaskModal)

import React from 'react';
import { getMaintenanceStaff } from '@/app/actions/get-maintenance-staff';
import { DelegateTaskDialog } from '@/components/admin/maintenance/DelegateTaskDialog';
import { MaintenanceKanbanClient } from '@/components/admin/maintenance/MaintenanceKanbanClient';
import { MaintenanceTaskDialog } from '@/components/admin/maintenance/MaintenanceTaskDialog';

// 1. IMPORTAR O NOVO MODAL DE VISUALIZAÇÃO
import { ViewTaskModal } from '@/components/admin/maintenance/ViewTaskModal';

export default async function ManutencaoPage() {
  const staff = await getMaintenanceStaff();

  return (
    <div className="flex flex-col h-full">
      {/* Modais que escutam o useModalStore */}
      <DelegateTaskDialog staff={staff} />
      <MaintenanceTaskDialog />

      {/* 2. RENDERIZAR O NOVO MODAL */}
      <ViewTaskModal />

      {/* Componente principal do Kanban */}
      <MaintenanceKanbanClient staff={staff} />
    </div>
  );
}