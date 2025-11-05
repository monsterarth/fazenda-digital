// app/admin/(dashboard)/layout.tsx

import PrivateRoute from "@/components/admin/private-route";
import { Sidebar } from "@/components/admin/Sidebar";
import { PropertyProvider } from "@/context/PropertyContext";
import { CreateStayDialog } from "@/components/admin/stays/create-stay-dialog";
import { getCabins } from "@/app/actions/get-cabins";
import { EditStayDialog } from "@/components/admin/stays/edit-stay-dialog"; // ++ ADICIONADO ++
import { getProperty } from "@/app/actions/get-property"; // ++ ADICIONADO ++

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cabins = await getCabins();
  const property = await getProperty(); // ++ ADICIONADO ++

  return (
    <PrivateRoute>
      <PropertyProvider>
          <CreateStayDialog cabins={cabins} />
          {/* ++ INÍCIO DA CORREÇÃO ++ */}
          {/* Corrigimos o type error convertendo 'null' (vindo de getProperty) 
            para 'undefined' (esperado pelo EditStayDialog) 
          */}
          <EditStayDialog cabins={cabins} property={property || undefined} />
          {/* ++ FIM DA CORREÇÃO ++ */}
          
          <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
      </PropertyProvider>
    </PrivateRoute>
  );
}