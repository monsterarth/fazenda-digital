"use client";

import { useGuest } from "@/context/GuestProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useGuest();
  const router = useRouter();

  useEffect(() => {
    // Se não está carregando e não está autenticado, redireciona para o login
    if (!isLoading && !isAuthenticated) {
      router.replace("/portal");
    }
  }, [isLoading, isAuthenticated, router]);

  // Enquanto carrega, mostra uma tela de loading
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se estiver autenticado, mostra o conteúdo da página protegida
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Se não estiver autenticado (e esperando o redirect), não mostra nada
  return null;
}