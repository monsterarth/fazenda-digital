// /components/guest/dashboard/ActionGrid.tsx

"use client";

import {
  Wifi,
  DoorOpen,
  Coffee,
  CalendarDays,
  ConciergeBell,
  BookOpen,
  Star,
  Book, // Novo ícone importado
} from "lucide-react";
import Link from "next/link";
import { WifiInfoDialog } from "./WifiInfoDialog";
import { GatesInfoDialog } from "./GatesInfoDialog";

// Componente interno para os ícones de "app", com um estilo mais limpo e moderno.
const AppIconButton = ({
  icon: Icon,
  label,
  href,
  dialogTrigger,
}: {
  icon: React.ElementType;
  label: string;
  href?: string;
  dialogTrigger?: React.ReactNode;
}) => {
  // O conteúdo visual do ícone
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-2 aspect-square transition-transform transform hover:scale-105 active:scale-95">
      <div className="flex items-center justify-center w-14 h-14 mb-2 rounded-2xl bg-background shadow-md border">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
  );

  // Se for um gatilho para um diálogo (modal), envolve o conteúdo com ele.
  if (dialogTrigger) {
    return dialogTrigger;
  }

  // Se for um link de navegação, envolve com o componente Link.
  return href ? (
    <Link href={href} className="focus:outline-none focus:ring-2 focus:ring-ring rounded-lg">
      {content}
    </Link>
  ) : (
    content
  );
};

// A nova grade de ações, agora com mais opções e um layout de 4 colunas.
export function ActionGrid() {
  return (
    <section className="p-4">
      <div className="grid grid-cols-4 gap-3">
        {/* Ícone para Café da Manhã */}
        <AppIconButton
          icon={Coffee}
          label="Café da Manhã"
          href="/cafe"
        />
        {/* Ícone para Agendamentos */}
        <AppIconButton
          icon={CalendarDays}
          label="Agendamentos"
          href="/agendamentos"
        />
        {/* Ícone para Serviços e Solicitações */}
        <AppIconButton
          icon={ConciergeBell}
          label="Serviços"
          href="/servicos"
        />
        {/* Ícone para Guias e Manuais (NOVO) */}
        <AppIconButton
          icon={Book}
          label="Guias"
          href="/guias"
        />
        {/* Ícone para Cultura e Eventos */}
        <AppIconButton
          icon={BookOpen}
          label="Cultura"
          href="/cultura"
        />
        {/* Ícone para Pesquisas de Satisfação */}
        <AppIconButton
          icon={Star}
          label="Avaliações"
          href="/pesquisas"
        />
        {/* Ícone para abrir o modal de Wi-Fi */}
        <AppIconButton
          icon={Wifi}
          label="Wi-Fi"
          dialogTrigger={
            <WifiInfoDialog>
              <div className="flex flex-col items-center justify-center text-center p-2 aspect-square transition-transform transform hover:scale-105 active:scale-95 cursor-pointer">
                <div className="flex items-center justify-center w-14 h-14 mb-2 rounded-2xl bg-background shadow-md border">
                  <Wifi className="h-7 w-7 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">Wi-Fi</span>
              </div>
            </WifiInfoDialog>
          }
        />
        {/* Ícone para abrir o modal de Portões */}
        <AppIconButton
          icon={DoorOpen}
          label="Portões"
          dialogTrigger={
            <GatesInfoDialog>
              <div className="flex flex-col items-center justify-center text-center p-2 aspect-square transition-transform transform hover:scale-105 active:scale-95 cursor-pointer">
                <div className="flex items-center justify-center w-14 h-14 mb-2 rounded-2xl bg-background shadow-md border">
                  <DoorOpen className="h-7 w-7 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">Portões</span>
              </div>
            </GatesInfoDialog>
          }
        />
      </div>
    </section>
  );
}
