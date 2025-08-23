// /app/(portal)/dashboard/page.tsx

"use client";

import { useGuest } from "@/context/GuestProvider";
import { Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/guest/dashboard/DashboardHeader";
import { ActionGrid } from "@/components/guest/dashboard/ActionGrid";
import { TodaysAgendaCard } from "@/components/guest/dashboard/TodaysAgendaCard";
import { MyRequestsCard } from "@/components/guest/dashboard/MyRequestsCard";

export default function DashboardPage() {
  const { isLoading } = useGuest();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background pb-4">
      <DashboardHeader />
      
      <main className="space-y-6">
        {/* Seção de Aplicativos/Funcionalidades agora no topo */}
        <section className="pt-6">
          <h2 className="text-lg font-semibold mb-2 px-4 text-foreground">Serviços e Informações</h2>
          <ActionGrid />
        </section>
        
        {/* Seção de Atividades e Agenda agora sem Accordion */}
        <section className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Sua Estadia</h2>
            <TodaysAgendaCard />
            <MyRequestsCard />
        </section>
      </main>
    </div>
  );
}
