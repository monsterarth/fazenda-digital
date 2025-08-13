"use client";

import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, MessageSquareHeart, Star, BookOpenCheck, Coffee, Wifi, Sparkles, LogOut, HeartHandshake } from 'lucide-react';
import Link from 'next/link';
import { ActionCard } from '@/components/portal/ActionCard';
import { SimpleBookingItem } from '@/components/portal/SimpleBookingItem';
import { Cabin } from '@/types';
import { getFirebaseDb, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { deleteCookie } from 'cookies-next';

export default function GuestDashboardPage() {
    const { stay, isLoading: isGuestLoading } = useGuest();
    const { property, loading: isPropertyLoading } = useProperty();
    const router = useRouter();

    const [cabin, setCabin] = useState<Cabin | null>(null);
    const [loadingAncillaryData, setLoadingAncillaryData] = useState(true);

    useEffect(() => {
        if (!isGuestLoading && !stay) {
            router.push('/portal');
        }
    }, [stay, isGuestLoading, router]);

    useEffect(() => {
        const fetchCabinData = async () => {
            if (!stay) return;
            try {
                const cabinSnap = await getDoc(doc(db, 'cabins', stay.cabinId));
                if (cabinSnap.exists()) setCabin(cabinSnap.data() as Cabin);
            } catch (error) {
                console.error("Failed to fetch cabin data:", error);
            } finally {
                setLoadingAncillaryData(false);
            }
        };
        fetchCabinData();
    }, [stay]);

    const upcomingBookings = useMemo(() => {
        if (!stay?.bookings) return [];
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const relevantStatuses = ['confirmado', 'solicitado', 'pendente', 'em_andamento'];
        return stay.bookings
            .filter(b => b.date === todayStr && relevantStatuses.includes(b.status))
            .sort((a, b) => (a.startTime || a.timeSlotLabel || '00:00').localeCompare(b.startTime || b.timeSlotLabel || '00:00'));
    }, [stay]);

    const handleLogout = () => {
        deleteCookie('guest-token');
        router.push('/portal');
    };

    if (isGuestLoading || isPropertyLoading || loadingAncillaryData || !stay || !property) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-brand-light-green">
                <Loader2 className="h-10 w-10 text-brand-dark-green animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light-green text-brand-dark-green">
            <header className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden">
                <Image
                    src="/images/dashboard-header.jpg"
                    alt="Paisagem da Fazenda do Rosa"
                    layout="fill"
                    objectFit="cover"
                    quality={85}
                    className="z-0"
                />
                <div className="absolute inset-0 bg-brand-dark-green/60 z-10"></div>
                
                <div className="relative z-20 flex flex-col justify-end h-full p-6 text-white">
                    <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Olá, {stay.guestName.split(' ')[0]}!</h1>
                    <p className="text-sm sm:text-base text-white/90">Bem-vindo(a) à sua central do hóspede na {property.name}.</p>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
                <Card className="bg-white/80 backdrop-blur-sm border-2 border-brand-primary shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-brand-dark-green">
                            <Calendar className="h-5 w-5" />
                            Resumo do Dia
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-b pb-4">
                            <h3 className="text-md font-semibold mb-2">Seus Agendamentos para Hoje</h3>
                            {upcomingBookings.length > 0 ? (
                                <div className="space-y-2">
                                    {upcomingBookings.map(booking => (
                                        <SimpleBookingItem key={booking.id} booking={booking as any} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-brand-mid-green p-4 bg-gray-100 rounded-lg">
                                    <p>Nenhum agendamento para hoje.</p>
                                </div>
                            )}
                        </div>
                        {cabin?.wifiSsid && (
                            <div className="pt-4">
                                <h3 className="text-md font-semibold mb-2">Wi-Fi da Cabana</h3>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-brand-light-green rounded-lg">
                                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                        <Wifi className="h-5 w-5 text-brand-primary" />
                                        <div>
                                            <p className="text-xs text-brand-mid-green">Rede</p>
                                            <p className="font-semibold">{cabin.wifiSsid}</p>
                                        </div>
                                    </div>
                                    {cabin.wifiPassword && (
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs text-brand-mid-green">Senha</p>
                                            <p className="font-semibold">{cabin.wifiPassword}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-brand-dark-green">O que deseja fazer?</h2>
                    <div className="grid grid-cols-1 gap-4"> 
                        <ActionCard
                            href="/portal/agendamentos"
                            icon={<Sparkles size={24} className="text-brand-primary" />}
                            title="Agendamentos"
                            description="Agende seu horário."
                        />
                        <ActionCard
                            href="/portal/cafe"
                            icon={<Coffee size={24} className="text-brand-primary" />}
                            title="Café da Manhã"
                            description="Monte sua cesta."
                        />
                        <ActionCard
                            href="/portal/pesquisas"
                            icon={<Star size={24} className="text-brand-primary" />}
                            title="Avaliações"
                            description="Nos conte como foi."
                        />
                        <ActionCard
                            href="/portal/termos"
                            icon={<BookOpenCheck size={24} className="text-brand-primary" />}
                            title="Políticas"
                            description="Consulte as regras."
                        />
                        <ActionCard
                            href={`https://wa.me/${property.contact?.whatsapp || '5531991096590'}`}
                            icon={<MessageSquareHeart size={24} className="text-brand-primary" />}
                            title="Recepção"
                            description="Fale conosco."
                        />
                        <ActionCard
                            href="/portal/cultura"
                            icon={<HeartHandshake size={24} className="text-brand-primary" />}
                            title="Nossa Cultura"
                            description="Valores da Fazenda."
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}