"use client";

// Este layout se aplica a TODAS as páginas dentro do grupo (dashboard)

import PrivateRoute from "@/components/admin/private-route";
import { Sidebar } from "@/components/admin/Sidebar";
import { OrderProvider } from "@/context/OrderContext";
import { PropertyProvider } from "@/context/PropertyContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. A rota privada verifica a autenticação primeiro
    <PrivateRoute>
      {/* 2. Se o usuário estiver logado, os provedores de dados são carregados */}
      <PropertyProvider>
        <OrderProvider>
          {/* 3. Finalmente, o layout visual com a Sidebar é renderizado */}
          <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </OrderProvider>
      </PropertyProvider>
    </PrivateRoute>
  );
}