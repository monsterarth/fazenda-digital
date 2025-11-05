// app/admin/(dashboard)/layout.tsx

import PrivateRoute from "@/components/admin/private-route";
import { Sidebar } from "@/components/admin/Sidebar";
import { PropertyProvider } from "@/context/PropertyContext";
import { NotificationProvider } from "@/context/NotificationContext";

// ## INÍCIO DA CORREÇÃO ##
// Alterado de '{ TabNotifier }' para 'TabNotifier' (importação padrão)
import TabNotifier from "@/components/admin/TabNotifier";
// ## FIM DA CORREÇÃO ##

import { CreateStayDialog } from "@/components/admin/stays/create-stay-dialog";
import { getCabins } from "@/app/actions/get-cabins";
import { EditStayDialog } from "@/components/admin/stays/edit-stay-dialog";
import { getProperty } from "@/app/actions/get-property";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cabins = await getCabins();
  const property = await getProperty();

  return (
    <PrivateRoute>
      <PropertyProvider>
        <NotificationProvider>
          {/* Este componente ativa o hook de notificação */}
          <TabNotifier /> 
        
          <CreateStayDialog cabins={cabins} />
          <EditStayDialog cabins={cabins} property={property} />
          
          <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>

        </NotificationProvider> 
      </PropertyProvider>
    </PrivateRoute>
  );
}