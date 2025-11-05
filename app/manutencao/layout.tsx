// app/manutencao/layout.tsx

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css"; // Reutiliza seu CSS global

/**
 * Layout raiz para o portal de manutenção.
 * Este layout é separado do /admin e do /portal.
 * Sua única função é prover o AuthContext.
 */
export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ## INÍCIO DA CORREÇÃO ##
  // Removemos as tags <html> e <body> daqui.
  // O AuthProvider e o <main> são renderizados DENTRO
  // do <body> principal do app/layout.tsx.
  return (
    <AuthProvider>
      <Toaster richColors position="top-center" />
      <main>{children}</main>
    </AuthProvider>
  );
  // ## FIM DA CORREÇÃO ##
}