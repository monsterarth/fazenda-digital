import React from 'react';

// Este layout agora é um componente de servidor simples e limpo.
// Ele apenas renderiza o conteúdo da página (seja a de login ou o layout protegido).
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}