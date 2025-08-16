// app/(portal)/layout.tsx

"use client";

import { useGuest } from "@/context/GuestProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, LogOut } from "lucide-react";
import Image from "next/image";
import { useProperty } from "@/context/PropertyContext";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, logout, stay } = useGuest();
  const { property } = useProperty();
  const router = useRouter();

  useEffect(() => {
    // Se o carregamento terminou e o usuário NÃO está autenticado, redireciona para a raiz.
    if (!isLoading && !isAuthenticated) {
      router.replace("/"); // AJUSTADO: Redireciona para a nova página de login na raiz.
    }
  }, [isLoading, isAuthenticated, router]);

  // Mostra um loader enquanto o estado de autenticação está sendo verificado.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se o usuário está autenticado, renderiza o layout do portal.
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground antialiased">
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {property?.logoUrl && (
                <Image
                  src={property.logoUrl}
                  alt={`Logo de ${property.name}`}
                  width={40}
                  height={40}
                  className="rounded-md object-cover"
                />
              )}
              <h1 className="text-xl font-bold text-foreground">{property?.name}</h1>
            </div>
            {stay && (
              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    );
  }

  // Se não estiver carregando e não estiver autenticado, retorna nulo enquanto o redirect acontece.
  return null;
}