// app/admin/(dashboard)/manutencao/page.tsx

import React from 'react';
import { getMaintenanceStaff } from '@/app/actions/get-maintenance-staff';
import { CreateTaskSheet } from '@/components/admin/maintenance/CreateTaskSheet';
import { DelegateTaskDialog } from '@/components/admin/maintenance/DelegateTaskDialog';
// ## INÍCIO DA CORREÇÃO ##
// Verifique se o arquivo em 'components/admin/maintenance/' 
// se chama EXATAMENTE 'MaintenanceKanbanClient.tsx'
import { MaintenanceKanbanClient } from '@/components/admin/maintenance/MaintenanceKanbanClient';
// ## FIM DA CORREÇÃO ##
import { Wrench, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function ManutencaoPage() {
  
  const staff = await getMaintenanceStaff();

  return (
    <div className="flex flex-col h-full">
      <CreateTaskSheet staff={staff} />
      <DelegateTaskDialog staff={staff} />

      <MaintenanceKanbanClient staff={staff} />
    </div>
  );
}