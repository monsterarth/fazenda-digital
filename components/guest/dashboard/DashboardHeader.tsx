// /components/guest/dashboard/DashboardHeader.tsx

"use client";

import { useGuest } from "@/context/GuestProvider";
import { format } from "date-fns";
import { BedDouble, Calendar } from "lucide-react";
import { WeatherComponent } from "./WeatherComponent";
// A importação do 'usePropertyTheme' foi REMOVIDA

export function DashboardHeader() {
  const { stay } = useGuest();
  // A chamada ao hook 'usePropertyTheme' foi REMOVIDA

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = stay?.guestName.split(" ")[0];
  const startDate = stay?.checkInDate
    ? format(new Date(stay.checkInDate), "dd/MM")
    : "N/A";
  const endDate = stay?.checkOutDate
    ? format(new Date(stay.checkOutDate), "dd/MM")
    : "N/A";

  return (
    // CORREÇÃO: Agora usa a variável CSS '--primary' diretamente com a sintaxe do Tailwind.
    // O seu `PropertyThemeProvider` define '--primary' no formato HSL, então usamos 'hsl(var(...))'.
    <header 
      className="bg-[hsl(var(--primary))] text-white p-4 rounded-b-3xl shadow-lg sticky top-0 z-20"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {firstName}!
          </h1>
        </div>
        <WeatherComponent />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-200">
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Estadia: {startDate} - {endDate}</span>
        </div>
        <div className="flex items-center">
          <BedDouble className="h-4 w-4 mr-2" />
          <span>Cabana: {stay?.cabin?.name || "N/A"}</span>
        </div>
      </div>
    </header>
  );
}