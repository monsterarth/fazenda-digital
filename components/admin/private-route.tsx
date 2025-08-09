"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Este efeito lida apenas com o caso final: se após o carregamento,
        // o usuário não for um admin autenticado, ele é redirecionado.
        if (!loading && (!user || !isAdmin)) {
            router.push('/admin/login');
        }
    }, [user, isAdmin, loading, router]);

    // **A LÓGICA SIMPLIFICADA:**
    // 1. Se a verificação ainda está em andamento, mostramos o loader.
    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    // 2. Se a verificação terminou e o usuário é um admin, mostramos o conteúdo protegido.
    if (user && isAdmin) {
        return <>{children}</>;
    }

    // 3. Em todos os outros casos (ex: usuário não-admin aguardando o redirecionamento),
    // continuamos a mostrar o loader para evitar qualquer "flash" de conteúdo inválido.
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}