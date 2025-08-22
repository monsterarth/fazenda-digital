// /components/guest/dashboard/ActionGrid.tsx

"use client";

import { Wifi, DoorOpen, UtensilsCrossed, Bell, Coffee, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { WifiInfoDialog } from "./WifiInfoDialog";
import { GatesInfoDialog } from "./GatesInfoDialog";
import Link from "next/link";

const ActionButton = ({ icon: Icon, label, href, dialog }: { icon: React.ElementType, label: string, href?: string, dialog?: React.ReactNode }) => {
  const content = (
    <Card className="flex flex-col items-center justify-center p-4 aspect-square hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
      <Icon className="h-8 w-8 mb-2 text-[#164A41]" />
      <span className="text-center text-sm font-medium">{label}</span>
    </Card>
  );

  if (dialog) {
    return dialog;
  }

  return href ? <Link href={href}>{content}</Link> : content;
};

export function ActionGrid() {
  return (
    <section className="p-4">
      <div className="grid grid-cols-3 gap-3">
        <ActionButton 
          icon={Coffee}
          label="Café da Manhã"
          href="/cafe"
        />
        <ActionButton 
          icon={CalendarDays}
          label="Agendamentos"
          href="/agendamentos"
        />
         <WifiInfoDialog>
            <div className="flex flex-col items-center justify-center p-4 aspect-square hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer rounded-lg border">
                <Wifi className="h-8 w-8 mb-2 text-[#164A41]" />
                <span className="text-center text-sm font-medium">Wi-Fi</span>
            </div>
        </WifiInfoDialog>
        <GatesInfoDialog>
            <div className="flex flex-col items-center justify-center p-4 aspect-square hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer rounded-lg border">
                <DoorOpen className="h-8 w-8 mb-2 text-[#164A41]" />
                <span className="text-center text-sm font-medium">Portões</span>
            </div>
        </GatesInfoDialog>
        <ActionButton 
          icon={UtensilsCrossed}
          label="Cardápios"
          href="/cardapios" // Exemplo de link
        />
        <ActionButton 
          icon={Bell}
          label="Solicitações"
          href="/solicitar"
        />
      </div>
    </section>
  );
}