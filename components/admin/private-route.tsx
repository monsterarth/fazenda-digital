"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
    // ++ CORREÇÃO: Agora pegamos o 'isAdmin' do contexto também.
    const { user, isAdmin, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // A lógica de redirecionamento continua a mesma.
        if (!loading && !user) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    // **A MUDANÇA CRÍTICA:**
    // O loader agora é exibido se a autenticação geral está carregando (`loading`)
    // OU se já temos um usuário mas ainda não confirmamos se ele é um admin (`!isAdmin`).
    // Isso força a aplicação a esperar pela verificação do custom claim.
    if (loading || !user) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    // Apenas se o usuário existir E for um administrador, renderizamos o conteúdo protegido.
    if (user && isAdmin) {
        return <>{children}</>;
    }

    // Se o usuário existe mas não é um admin, ou enquanto a verificação de admin ocorre,
    // continuamos exibindo o loader para evitar um loop de redirecionamento.
    // O useEffect cuidará do redirecionamento se o usuário final não for válido.
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}