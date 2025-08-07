"use client";

import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, MessageSquareHeart, Star, BookOpenCheck } from 'lucide-react';
import Link from 'next/link';
import { ActionCard } from '@/components/portal/ActionCard';
import { BookingCard } from '@/components/portal/BookingCard';
import { WifiCard } from '@/components/portal/WifiCard';
import { BreakfastCard } from '@/components/portal/BreakfastCard';
import { Cabin, BreakfastOrder } from '@/types'; 
import { Structure } from '@/types/scheduling'; 
import { getFirebaseDb, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addDays } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function GuestDashboardPage() {
    const { stay, isLoading: isGuestLoading } = useGuest();
    const { property, loading: isPropertyLoading } = useProperty();
    const router = useRouter();

    const [structures, setStructures] = useState<Structure[]>([]);
    const [cabin, setCabin] = useState<Cabin | null>(null);
    const [todaysBreakfastOrder, setTodaysBreakfastOrder] = useState<BreakfastOrder | undefined>(undefined);
    const [loadingAncillaryData, setLoadingAncillaryData] = useState(true);

    useEffect(() => {
        if (!isGuestLoading && !stay) {
            router.push('/portal');
        }
    }, [stay, isGuestLoading, router]);

    useEffect(() => {
        const fetchAncillaryData = async () => {
            if (!stay) return;
            try {
                const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

                const [structuresSnap, cabinSnap, breakfastOrderSnap] = await Promise.all([
                    getDocs(query(collection(db, 'structures'))),
                    getDoc(doc(db, 'cabins', stay.cabinId)),
                    getDocs(query(
                        collection(db, 'breakfastOrders'),
                        where("stayId", "==", stay.id),
                        where("deliveryDate", "==", tomorrowStr)
                    ))
                ]);

                setStructures(structuresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Structure)));
                if (cabinSnap.exists()) setCabin(cabinSnap.data() as Cabin);
                if (!breakfastOrderSnap.empty) setTodaysBreakfastOrder(breakfastOrderSnap.docs[0].data() as BreakfastOrder);

            } catch (error) {
                console.error("Failed to fetch ancillary data:", error);
            } finally {
                setLoadingAncillaryData(false);
            }
        };
        fetchAncillaryData();
    }, [stay]);

    const upcomingBookings = useMemo(() => {
        if (!stay?.bookings) return [];
        // ## INÍCIO DA CORREÇÃO: O filtro agora aceita os status dos dois sistemas ##
        const relevantStatuses = ['confirmado', 'solicitado', 'pendente'];
        return stay.bookings
            .filter(b => relevantStatuses.includes(b.status))
            .sort((a, b) => (a.startTime || a.timeSlotLabel || '00:00').localeCompare(b.startTime || b.timeSlotLabel || '00:00'));
        // ## FIM DA CORREÇÃO ##
    }, [stay]);

    if (isGuestLoading || isPropertyLoading || loadingAncillaryData || !stay || !property) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-foreground">Olá, {stay.guestName.split(' ')[0]}!</h1>
                <p className="text-lg text-muted-foreground">Bem-vindo(a) à sua central do hóspede na Cabana {stay.cabinName}.</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Seus Agendamentos de Hoje</CardTitle>
                            <CardDescription>Fique por dentro das suas próximas experiências.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {upcomingBookings.length > 0 ? (
                                upcomingBookings.map(booking => {
                                    const structure = structures.find(s => s.id === (booking.structureId || booking.serviceId));
                                    // ## INÍCIO DA CORREÇÃO: Passamos o booking como 'any' para satisfazer o TypeScript ##
                                    // A lógica de compatibilidade agora está dentro do BookingCard.
                                    return <BookingCard key={booking.id} booking={booking as any} structure={structure} />;
                                    // ## FIM DA CORREÇÃO ##
                                })
                            ) : (
                                <div className="text-center text-muted-foreground p-8">
                                    <p>Você ainda não tem agendamentos para hoje.</p>
                                    <Button asChild variant="link" className="mt-2">
                                        <Link href="/portal/agendamentos">Agendar uma experiência</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <WifiCard ssid={cabin?.wifiSsid} password={cabin?.wifiPassword} />
                    <BreakfastCard property={property} todaysOrder={todaysBreakfastOrder} />
                    <Card>
                        <CardHeader><CardTitle>Mais Ações</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                             <ActionCard href="/portal/agendamentos" icon={<Calendar size={20} />} title="Agendar Experiências" description="Reserve seu horário para atividades." />
                             <ActionCard href="/portal/pesquisas" icon={<Star size={20} />} title="Avalie a Estadia" description="Sua opinião é muito importante." />
                             <ActionCard href="/portal/termos" icon={<BookOpenCheck size={20} />} title="Políticas e Guias" description="Consulte as regras da pousada." />
                        </CardContent>
                    </Card>
                    <Card className="bg-secondary">
                         <CardHeader><CardTitle className="text-base">Precisa de Ajuda?</CardTitle></CardHeader>
                        <CardContent>
                            <Button className="w-full" asChild>
                                <a href={`https://wa.me/${property.contact?.whatsapp || '5531991096590'}`} target="_blank" rel="noopener noreferrer">
                                    <MessageSquareHeart className="mr-2 h-4 w-4" /> Falar com a Recepção
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}