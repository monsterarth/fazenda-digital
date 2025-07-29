"use client";

import { useGuest } from '@/context/GuestProvider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarClock, Coffee, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';
import Link from 'next/link';

export default function GuestDashboardPage() {
    const { stay, isAuthenticated, isLoading } = useGuest();
    const router = useRouter();

    // Efeito para proteger a rota: se não estiver autenticado e o carregamento inicial terminar, redireciona
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/portal');
        }
    }, [isAuthenticated, isLoading, router]);

    // Não renderiza nada até que a verificação de autenticação seja concluída para evitar piscar a tela
    if (isLoading || !isAuthenticated || !stay) {
        return null; // O loader principal já é exibido no GuestProvider
    }

    // Função para formatar as datas de forma segura
    const formatDate = (date: any) => {
        // O `stay` vindo do sessionStorage terá datas como strings ISO
        const dateObj = typeof date === 'string' ? new Date(date) : date.toDate();
        return format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Cabeçalho de Boas-Vindas */}
                <header>
                    <h1 className="text-3xl font-bold text-gray-800">Olá, {stay.guestName.split(' ')[0]}!</h1>
                    <p className="text-md text-gray-600">Seja bem-vindo(a) à sua estadia na {stay.cabinName}.</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Sua reserva é de {formatDate(stay.checkInDate)} a {formatDate(stay.checkOutDate)}.
                    </p>
                </header>

                {/* Grid de Ações Rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Coffee /> Café da Manhã</CardTitle>
                            <CardDescription>Monte a sua cesta de café da manhã com nossos itens artesanais.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full" disabled>
                                <Link href="/portal/cafe">
                                    Pedir Café da Manhã <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CalendarClock /> Agendar Serviços</CardTitle>
                            <CardDescription>Reserve seu horário para o ofurô, massagem e outras experiências.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Button asChild className="w-full" disabled>
                                <Link href="/portal/agendamentos">
                                    Ver Serviços <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                     <Card className="hover:shadow-lg transition-shadow md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Utensils /> Cardápio Digital</CardTitle>
                            <CardDescription>Explore nosso cardápio de pratos, porções e bebidas para pedir diretamente na sua cabana.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Button asChild className="w-full" disabled>
                                <Link href="/portal/cardapio">
                                    Acessar Cardápio <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}