"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();

    // Este useEffect agora age como uma segunda camada de segurança e lida
    // com casos como um usuário tentando acessar a URL diretamente.
    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.push('/admin/login');
        }
    }, [user, isAdmin, loading, router]);

    // A lógica de renderização é simples:
    // 1. Se ainda estamos carregando, mostre um loader.
    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    // 2. Se o carregamento terminou e o usuário é um admin, mostre o conteúdo.
    // O 'user' já está implícito na verificação do 'isAdmin'.
    if (isAdmin) {
        return <>{children}</>;
    }

    // 3. Se não estiver carregando e não for admin, o useEffect acima cuidará do
    // redirecionamento. Retornamos o loader para evitar qualquer "pisca".
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}