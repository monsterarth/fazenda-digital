"use client";

// Este layout se aplica a TODAS as páginas dentro do grupo (dashboard)

import PrivateRoute from "@/components/admin/private-route";
import { Sidebar } from "@/components/admin/Sidebar";
// O OrderProvider foi removido daqui, pois ele depende do contexto do Hóspede
import { PropertyProvider } from "@/context/PropertyContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. A rota privada verifica a autenticação primeiro
    <PrivateRoute>
      {/* 2. O PropertyProvider carrega dados gerais da propriedade para a Sidebar, etc. */}
      <PropertyProvider>
          {/* 3. O OrderProvider foi removido para evitar o erro.
              As páginas de admin que precisam de dados de pedidos irão buscá-los diretamente. */}
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