// app/salao/components/SalaoAuthGuard.tsx
'use client';

// ++ ADICIONADO: useState e useEffect
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface SalaoAuthGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const AuthLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
  </div>
);

export function SalaoAuthGuard({ children, allowedRoles }: SalaoAuthGuardProps) {
  const { user, loading, userRole } = useAuth();
  const router = useRouter();
  
  // ++ CORREÇÃO: "Mounted" State para evitar Hydration Mismatch ++
  // Este state é 'false' no servidor, e 'false' na primeira renderização do cliente.
  // Ele só se torna 'true' APÓS a hidratação.
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []); // Roda uma vez no cliente, após a primeira renderização

  // 1. Se o auth está carregando OU se o componente ainda não "montou" no cliente...
  // Servidor: (!isMounted = true), (loading = true) -> Renderiza AuthLoader
  // Cliente (Hidratação): (!isMounted = true) -> Renderiza AuthLoader. **MATCH!**
  if (loading || !isMounted) {
    return <AuthLoader />;
  }

  // 2. A partir daqui, estamos no cliente (isMounted = true) e auth carregado (loading = false)
  // Agora podemos verificar a autenticação com segurança.

  // Se não estiver logado
  if (!user) {
    router.replace('/salao/login');
    return <AuthLoader />; // Continua mostrando o loader durante o redirecionamento
  }

  // Se não estiver autorizado
  if (!userRole || !allowedRoles.includes(userRole)) {
    console.warn(`Acesso negado: Usuário ${user.email} com role "${userRole}" tentou acessar /salao.`);
    router.replace('/salao/login');
    return <AuthLoader />; // Continua mostrando o loader
  }

  // 3. Autorizado: O usuário está logado e tem a permissão.
  // O React substitui o <AuthLoader /> pelo {children}
  return <>{children}</>;
}