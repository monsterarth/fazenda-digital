// app/admin/(dashboard)/salao/layout.tsx
import React from 'react';

/**
 * Layout personalizado para a página do Salão.
 *
 * O 'SalaoAdminPage' (page.tsx) usa um layout de painel redimensionável
 * que precisa de altura total (h-full).
 *
 * O layout padrão do admin (dashboard/layout.tsx) adiciona um <main>
 * com padding (p-4 md:p-6).
 *
 * Este layout "embala" o children (nossa página) em um container
 * que remove o padding do pai e garante a altura total,
 * permitindo que a sidebar e o conteúdo da página funcionem
 * perfeitamente juntos.
 */
export default function SalaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Container que "anula" o padding do <main> pai e define a altura
    <div className="-m-4 md:-m-6 h-[calc(100vh-65px)]">
      {/* A altura h-[calc(100vh-65px)] é uma aproximação da altura 
        disponível menos o header do dashboard. 
        Isso garante que os painéis redimensionáveis tenham um 
        limite de altura para funcionar.
      */}
      {children}
    </div>
  );
}