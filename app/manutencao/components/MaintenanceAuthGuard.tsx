// components/manutencao/MaintenanceAuthGuard.tsx

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Guarda de rota para o portal de manutenção.
 * Verifica se o usuário está logado E se tem a role 'manutencao' ou 'super_admin'.
 */
export const MaintenanceAuthGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, userRole, loading } = useAuth();
    const router = useRouter();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            </div>
        );
    }

    // Se não está logado, redireciona para o login da manutenção
    if (!user) {
        router.replace('/manutencao/login');
        return null;
    }

    // Se está logado, mas não tem a role correta
    const isAuthorized = userRole === 'manutencao' || userRole === 'super_admin';

    if (!isAuthorized) {
        toast.error("Acesso Negado", {
            description: "Você não tem permissão para acessar este portal.",
        });
        // Desloga o usuário (opcional) ou apenas redireciona
        // auth.signOut(); 
        router.replace('/manutencao/login');
        return null;
    }

    // Autorizado!
    return <>{children}</>;
};