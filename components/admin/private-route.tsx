"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
// Importe os outros providers que buscam dados
import { PropertyProvider } from '@/context/PropertyContext';
import { OrderProvider } from '@/context/OrderContext';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/admin/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    // CORREÇÃO: Envolvemos o 'children' com os providers de dados.
    // Agora eles só rodam para usuários autenticados.
    return (
        <PropertyProvider>
            <OrderProvider>
                {children}
            </OrderProvider>
        </PropertyProvider>
    );
}