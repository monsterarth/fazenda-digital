// app/admin/layout.tsx

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import "@/app/globals.css";

/**
 * Layout raiz para TODA a seção /admin (incluindo login).
 * Ele só deve prover contextos que a tela de login também precise.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O layout raiz 'app/layout.tsx' já renderiza <html> e <body>
  // Este layout aninhado não deve renderizá-los novamente.
  // Ele também não deve duplicar o AuthProvider se 'app/layout.tsx' já o tiver.
  
  // Assumindo que 'app/layout.tsx' já tem AuthProvider, este arquivo
  // pode ser apenas um "pass-through".
  
  // MAS, para garantir que o /admin seja 100% independente do portal
  // principal, vamos manter o AuthProvider aqui e remover
  // <html> e <body> que causavam o erro de hidratação.
  
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}