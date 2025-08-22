"use client";

import { useGuest } from "@/context/GuestProvider";
import { WeatherCard } from "@/components/guest/dashboard/WeatherCard";
// Futuramente importaremos outros cards:
// import { MyRequestsCard } from "@/components/guest/dashboard/MyRequestsCard";
// import { TodaysAgendaCard } from "@/components/guest/dashboard/TodaysAgendaCard";

export default function GuestDashboard() {
  const { user: guest, stay } = useGuest();

  if (!guest || !stay) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho de Boas-Vindas */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {guest.displayName?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo do que você precisa saber hoje.
        </p>
      </div>

      {/* Feed de Cards Dinâmicos */}
      <div className="space-y-6">
        <WeatherCard />
        
        {/*
          // ESPAÇO RESERVADO PARA OS PRÓXIMOS CARDS
          <MyRequestsCard />
          <TodaysAgendaCard /> 
        */}

      </div>
    </div>
  );
}