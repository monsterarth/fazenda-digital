"use client";

import { useGuest } from '@/context/GuestProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast, Toaster } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';

export default function GuestLoginPage() {
    const [token, setToken] = useState('');
    const { login, isAuthenticated, stay } = useGuest();
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const success = await login(token);
        if (success) {
            toast.success('Bem-vindo(a)!');
            router.push('/portal/dashboard'); // Redireciona para o dashboard do hóspede
        } else {
            toast.error('Token inválido. Verifique o código e tente novamente.');
        }
        setIsLoading(false);
    };
    
    // Se o hóspede já estiver logado (sessão recuperada), redireciona imediatamente
    if(isAuthenticated && stay) {
        router.push('/portal/dashboard');
        return null; // Evita renderizar o formulário de login desnecessariamente
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Toaster richColors position="top-center" />
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Portal do Hóspede</CardTitle>
                    <CardDescription>Insira seu código de acesso para continuar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Input 
                                id="token"
                                placeholder="Ex: ABC-123"
                                value={token}
                                onChange={(e) => setToken(e.target.value.toUpperCase())}
                                className="text-center text-lg tracking-widest"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || !token}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                            Entrar
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}