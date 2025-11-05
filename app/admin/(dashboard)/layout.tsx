// app/admin/(dashboard)/layout.tsx

import React from "react"; // Importar React
import PrivateRoute from "@/components/admin/private-route";
import { Sidebar } from "@/components/admin/Sidebar";
import { PropertyProvider } from "@/context/PropertyContext";
// ## INÍCIO DA CORREÇÃO ##
// Importa os provedores e componentes de notificação
import { NotificationProvider } from "@/context/NotificationContext";
import TabNotifier from "@/components/admin/TabNotifier"; 
// ## FIM DA CORREÇÃO ##
import { CreateStayDialog } from "@/components/admin/stays/create-stay-dialog";
import { getCabins } from "@/app/actions/get-cabins";
import { EditStayDialog } from "@/components/admin/stays/edit-stay-dialog";
import { getProperty } from "@/app/actions/get-property";

/**
 * Layout para as páginas do dashboard (aquelas COM sidebar).
 * É aqui que os provedores específicos do dashboard devem estar.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Busca dados no servidor (corrigido em etapas anteriores)
  const cabins = await getCabins();
  const property = await getProperty();

  return (
    <PrivateRoute>
      {/* O AuthProvider já foi fornecido pelo 'app/admin/layout.tsx'.
        Agora fornecemos os contextos específicos do dashboard.
      */}
      <PropertyProvider>
        {/* O NotificationProvider DEVE envolver TUDO que usa
          o hook useNotification() (Sidebar, TabNotifier, e as páginas
          renderizadas em 'children').
        */}
        <NotificationProvider>
          
          {/* Este componente ativa o hook e deve estar dentro do provider */}
          <TabNotifier /> 
          
          {/* Estes modais são renderizados aqui e não usam o hook,
            o que está correto.
          */}
          <CreateStayDialog cabins={cabins} />
          <EditStayDialog cabins={cabins} property={property ?? undefined} />
          
          <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar USA o hook, por isso deve estar dentro do Provider */}
            <Sidebar /> 
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              {/* children (ex: /solicitacoes) USA o hook */}
              {children} 
            </main>
          </div>

        </NotificationProvider> 
      </PropertyProvider>
    </PrivateRoute>
  );
}