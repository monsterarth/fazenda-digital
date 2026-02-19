// app/admin/(dashboard)/cozinha/layout.tsx
import React from 'react';

/**
 * Layout personalizado para a página da Cozinha (KDS).
 *
 * Este layout remove o padding padrão do <main> do dashboard
 * e garante que o conteúdo (a página KDS) possa se
 * expandir para a altura total disponível, o que é essencial
 * para um sistema de KDS.
 */
export default function CozinhaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Container que "anula" o padding do <main> pai e define a altura
    // h-[calc(100vh-65px)] é a altura da tela menos o header do admin
    <div className="-m-4 md:-m-6 h-[calc(100vh-65px)]">
      {children}
    </div>
  );
}