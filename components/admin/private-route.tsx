"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Apenas redireciona se o carregamento inicial terminou e não há usuário
        if (!loading && !user) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    // Exibe um loader enquanto a verificação está em andamento
    if (loading || !user) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    // Se o usuário estiver logado, exibe o conteúdo da página
    return <>{children}</>;
}