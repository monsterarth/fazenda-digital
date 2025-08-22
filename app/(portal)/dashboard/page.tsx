// /app/(portal)/dashboard/page.tsx

"use client";

import { useGuest } from "@/context/GuestProvider";
import { Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/guest/dashboard/DashboardHeader";
import { ActionGrid } from "@/components/guest/dashboard/ActionGrid";
import { RecentActivity } from "@/components/guest/dashboard/RecentActivity"; // <-- Importação do novo componente
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DashboardPage() {
  const { isLoading } = useGuest();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    // Removido o min-h-screen para um ajuste mais natural do conteúdo
    <div className="bg-gray-50 dark:bg-gray-900 pb-4">
      <DashboardHeader />
      
      <main>
        <ActionGrid />

        {/* Espaço para cards de status, agora com o novo componente */}
        <div className="p-4 space-y-4">
          <RecentActivity />
          
          {/* Você pode adicionar outros cards informativos aqui se desejar */}
          {/* Exemplo:
          <Card>
              <CardHeader>
                  <CardTitle>Eventos de Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">Nenhum evento programado para hoje.</p>
              </CardContent>
          </Card>
          */}
        </div>
      </main>
    </div>
  );
}