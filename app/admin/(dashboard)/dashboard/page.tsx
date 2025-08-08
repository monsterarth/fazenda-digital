"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Property, BreakfastOrder, Booking, PreCheckIn } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, CalendarCheck, UserPlus, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Componente reutilizável para os cards de estatísticas
const DashboardStatCard = ({ title, value, icon, link, description }: { title: string, value: number, icon: React.ReactNode, link: string, description: string }) => (
    <Link href={link}>
        <Card className="hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    </Link>
);


export default function DashboardPage() {
    const [stats, setStats] = useState({ pendingOrders: 0, pendingBookings: 0, pendingCheckIns: 0 });
    const [propertyInfo, setPropertyInfo] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const qOrders = query(collection(db, "breakfastOrders"), where("status", "==", "pending"));
        const qBookings = query(collection(db, "bookings"), where("status", "==", "solicitado"));
        const qCheckIns = query(collection(db, "preCheckIns"), where("status", "==", "pendente"));
        
        const unsubOrders = onSnapshot(qOrders, (snapshot) => setStats(prev => ({ ...prev, pendingOrders: snapshot.size })));
        const unsubBookings = onSnapshot(qBookings, (snapshot) => setStats(prev => ({ ...prev, pendingBookings: snapshot.size })));
        const unsubCheckIns = onSnapshot(qCheckIns, (snapshot) => setStats(prev => ({ ...prev, pendingCheckIns: snapshot.size })));

        const fetchProperty = async () => {
            const propDoc = await getDoc(doc(db, 'properties', 'default'));
            if (propDoc.exists()) {
                setPropertyInfo(propDoc.data() as Property);
            }
            setLoading(false);
        };
        fetchProperty();

        // Limpa os listeners quando o componente é desmontado
        return () => {
            unsubOrders();
            unsubBookings();
            unsubCheckIns();
        };
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin"/></div>
    }

    const breakfastMode = propertyInfo?.breakfast?.type === 'on-site' ? 'Servido no Salão' : 'Entrega de Cestas';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Info /> Status Atual</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Modo do Café da Manhã: <span className="font-semibold text-primary">{breakfastMode}</span></p>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DashboardStatCard 
                    title="Novos Pedidos de Café"
                    value={stats.pendingOrders}
                    icon={<Utensils className="h-4 w-4 text-muted-foreground" />}
                    link="/admin/pedidos/cafe"
                    description="Pedidos pendentes de impressão"
                />
                 <DashboardStatCard 
                    title="Novos Agendamentos"
                    value={stats.pendingBookings}
                    icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
                    link="/admin/agendamentos"
                    description="Serviços solicitados pelos hóspedes"
                />
                 <DashboardStatCard 
                    title="Pré-Check-ins Pendentes"
                    value={stats.pendingCheckIns}
                    icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
                    link="/admin/stays"
                    description="Check-ins aguardando validação"
                />
            </div>

            {/* Aqui você pode adicionar mais seções, como gráficos ou listas de atividades recentes */}
        </div>
    );
}