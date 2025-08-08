"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // A lógica de redirecionamento permanece a mesma.
        // Se o carregamento terminou e não há usuário, redireciona para o login.
        if (!loading && !user) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    // ++ CORREÇÃO: A lógica de UI agora vive aqui. ++
    // Se a autenticação ainda está em processo de verificação, exibimos um loader.
    // Isso acontece APENAS no lado do cliente, após a hidratação inicial,
    // evitando o conflito com o servidor.
    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    // Se o carregamento terminou E há um usuário, renderizamos o conteúdo protegido.
    if (user) {
        return <>{children}</>;
    }

    // Se o carregamento terminou e não há usuário, renderiza null enquanto o
    // redirecionamento do useEffect acontece. Isso evita um flash de conteúdo.
    return null;
}