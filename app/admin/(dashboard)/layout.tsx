// app/admin/(dashboard)/layout.tsx

import React from "react"; // Importar React
import PrivateRoute from "@/components/admin/private-route";
import { Sidebar } from "@/components/admin/Sidebar";
import { PropertyProvider } from "@/context/PropertyContext";
// ## INÍCIO DOS ITENS PRESERVADOS ##
import { NotificationProvider } from "@/context/NotificationContext";
import TabNotifier from "@/components/admin/TabNotifier"; 
// ## FIM DOS ITENS PRESERVADOS ##
import { CreateStayDialog } from "@/components/admin/stays/create-stay-dialog";
import { getCabins } from "@/app/actions/get-cabins";
import { EditStayDialog } from "@/components/admin/stays/edit-stay-dialog";
import { getProperty } from "@/app/actions/get-property";
import { Header } from "@/components/admin/Header"; // ++ ADICIONADO: Importa o Header Mobile

/**
 * Layout para as páginas do dashboard (aquelas COM sidebar).
 * É aqui que os provedores específicos do dashboard devem estar.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Busca dados no servidor
  const cabins = await getCabins();
  const property = await getProperty();

  return (
    <PrivateRoute>
      {/* Provedores de Contexto */}
      <PropertyProvider>
        {/* O NotificationProvider DEVE envolver TUDO que usa
            o hook useNotification() (Sidebar, Header, TabNotifier, e children).
        */}
        <NotificationProvider>
          
          {/* Este componente ativa o hook e deve estar dentro do provider */}
          <TabNotifier /> 
          
          {/* Modais */}
          <CreateStayDialog cabins={cabins} />
          {/* Corrigindo a prop 'property' conforme seu código original */}
          <EditStayDialog cabins={cabins} property={property ?? undefined} />
          
          {/* ++ INÍCIO DA ESTRUTURA DE LAYOUT RESPONSIVO ++ */}
          <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            
            {/* Sidebar do Desktop (USA o hook, por isso está dentro do Provider) */}
            <Sidebar /> 
            
            {/* Wrapper para Header Mobile + Conteúdo Principal */}
            <div className="flex flex-1 flex-col">
              
              {/* Header Mobile (Também usa hooks e deve estar no Provider) */}
              <Header />
              
              {/* Conteúdo Principal (children (ex: /solicitacoes) USA o hook) */}
              <main className="flex-1 p-4 sm:p-6 lg:p-8">
                {children} 
              </main>
            </div>
          </div>
          {/* ++ FIM DA ESTRUTURA DE LAYOUT RESPONSIVO ++ */}

        </NotificationProvider> 
      </PropertyProvider>
    </PrivateRoute>
  );
}