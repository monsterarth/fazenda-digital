// /app/(portal)/dashboard/page.tsx

"use client";

import { useGuest } from "@/context/GuestProvider";
import { Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/guest/dashboard/DashboardHeader";
import { ActionGrid } from "@/components/guest/dashboard/ActionGrid";
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
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <DashboardHeader />
      
      <main>
        <ActionGrid />

        {/* Espaço para cards de status, como "Próximo Agendamento" ou "Status do Café" */}
        <div className="p-4 space-y-4">
            <h2 className="px-2 text-lg font-semibold tracking-tight">Atualizações Importantes</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Status do Café da Manhã</CardTitle>
                    <CardDescription>
                        Seu pedido para amanhã ainda não foi feito.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Conteúdo dinâmico aqui */}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}