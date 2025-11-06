// app/admin/(dashboard)/manutencao/page.tsx

import React from 'react';
import { getMaintenanceStaff } from '@/app/actions/get-maintenance-staff';
// ++ REMOVIDO: CreateTaskSheet (não existe mais) ++
// import { CreateTaskSheet } from '@/components/admin/maintenance/CreateTaskSheet';
import { DelegateTaskDialog } from '@/components/admin/maintenance/DelegateTaskDialog';
import { MaintenanceKanbanClient } from '@/components/admin/maintenance/MaintenanceKanbanClient';
// ++ REMOVIDO: EditTaskDialog (não existe mais) ++
// import { EditTaskDialog } from '@/components/admin/maintenance/EditTaskDialog';
import { MaintenanceTaskDialog } from '@/components/admin/maintenance/MaintenanceTaskDialog'; // ++ ADICIONADO: O novo modal unificado

export default async function ManutencaoPage() {
  
  const staff = await getMaintenanceStaff();

  return (
    <div className="flex flex-col h-full">
      {/* Modais que escutam o useModalStore */}
      <DelegateTaskDialog staff={staff} />
      
      {/* ++ ATUALIZADO: Renderiza o novo modal unificado ++ */}
      <MaintenanceTaskDialog /> 

      {/* Componente principal do Kanban */}
      <MaintenanceKanbanClient staff={staff} />
    </div>
  );
}