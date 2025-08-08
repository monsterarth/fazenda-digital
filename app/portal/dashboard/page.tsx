"use client";

import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, MessageSquareHeart, Star, BookOpenCheck, Coffee, Wifi, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ActionCard } from '@/components/portal/ActionCard';
import { SimpleBookingItem } from '@/components/portal/SimpleBookingItem';
import { Cabin } from '@/types'; 
import { getFirebaseDb, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns'; // Importa a função format

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
        
        // ## INÍCIO DA CORREÇÃO: Filtra agendamentos apenas para o dia de HOJE ##
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const relevantStatuses = ['confirmado', 'solicitado', 'pendente', 'em_andamento'];
        
        return stay.bookings
            .filter(b => b.date === todayStr && relevantStatuses.includes(b.status))
            .sort((a, b) => (a.startTime || a.timeSlotLabel || '00:00').localeCompare(b.startTime || b.timeSlotLabel || '00:00'));
        // ## FIM DA CORREÇÃO ##
    }, [stay]);

    if (isGuestLoading || isPropertyLoading || loadingAncillaryData || !stay || !property) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-foreground">Olá, {stay.guestName.split(' ')[0]}!</h1>
                <p className="text-lg text-muted-foreground">Bem-vindo(a) à sua central do hóspede.</p>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Resumo do Dia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-md font-semibold mb-2">Seus Agendamentos</h3>
                        {upcomingBookings.length > 0 ? (
                            <div className="space-y-2">
                                {upcomingBookings.map(booking => (
                                    <SimpleBookingItem key={booking.id} booking={booking as any} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                                <p>Nenhum agendamento para hoje.</p>
                            </div>
                        )}
                    </div>

                    {cabin?.wifiSsid && (
                        <div className="pt-4 border-t">
                             <h3 className="text-md font-semibold mb-2">Wi-Fi da Cabana</h3>
                             <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Wifi className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Rede</p>
                                        <p className="font-semibold">{cabin.wifiSsid}</p>
                                    </div>
                                </div>
                                {cabin.wifiPassword && (
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Senha</p>
                                        <p className="font-semibold">{cabin.wifiPassword}</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div>
                 <h2 className="text-xl font-bold text-foreground mb-4">O que deseja fazer?</h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <ActionCard 
                        href="/portal/agendamentos"
                        icon={<Sparkles size={24} />}
                        title="Experiências"
                        description="Agende seu horário."
                    />
                    <ActionCard 
                        href="/portal/cafe"
                        icon={<Coffee size={24} />}
                        title="Café da Manhã"
                        description="Monte sua cesta."
                    />
                     <ActionCard 
                        href="/portal/pesquisas"
                        icon={<Star size={24} />}
                        title="Avaliações"
                        description="Nos conte como foi."
                    />
                     <ActionCard 
                        href="/portal/termos"
                        icon={<BookOpenCheck size={24} />}
                        title="Políticas"
                        description="Consulte as regras."
                    />
                     <ActionCard 
                        href={`https://wa.me/${property.contact?.whatsapp || '5531991096590'}`}
                        icon={<MessageSquareHeart size={24} />}
                        title="Recepção"
                        description="Fale conosco."
                    />
                 </div>
            </div>
        </div>
    );
}