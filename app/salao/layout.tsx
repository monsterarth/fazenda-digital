// app/salao/layout.tsx
'use client'; // Os provedores de contexto exigem 'use client' no layout

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { PropertyProvider } from '@/context/PropertyContext';
import { Toaster } from '@/components/ui/sonner';
// As importações de 'Inter' e 'globals.css' NÃO são necessárias aqui,
// pois elas já estão no seu root layout (app/layout.tsx)

// O metadata pode ser movido para a /salao/page.tsx
// ou podemos exportá-lo daqui, mas o layout em si NÃO deve ter <html> e <body>.

export default function SalaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Este layout agora é apenas um "envoltório" (wrapper)
  // que será renderizado DENTRO do <body> do layout raiz.
  return (
    <PropertyProvider>
      <AuthProvider>
        {/* Este div aplica o max-width mobile-first */}
        <div className="mx-auto max-w-lg w-full bg-gray-100 min-h-screen">
          {children}
        </div>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </PropertyProvider>
  );
}