// /components/guest/dashboard/RecentActivity.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Request } from '@/app/admin/(dashboard)/solicitacoes/page'; // Reutilizando o tipo
import { Booking } from '@/types/scheduling';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Package, Sparkles, Construction, Calendar, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ActivityItem = {
    id: string;
    type: 'request' | 'booking';
    date: Date;
    title: string;
    status: string;
    statusVariant: "default" | "secondary" | "outline" | "destructive";
    icon: React.ElementType;
};

// --- INÍCIO DA CORREÇÃO 1: Removido 'cancelled' ---
const statusMap: Record<Request['status'], { label: string, variant: ActivityItem['statusVariant'] }> = {
    pending: { label: 'Solicitado', variant: 'outline' },
    in_progress: { label: 'Em Preparo', variant: 'secondary' },
    completed: { label: 'Finalizado', variant: 'default' },
};
// --- FIM DA CORREÇÃO 1 ---

export function RecentActivity() {
    const { stay, bookings } = useGuest();
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            if (stay?.id) {
                // --- INÍCIO DA CORREÇÃO 2: Adicionado 'await' ---
                const db = await getFirebaseDb();
                // --- FIM DA CORREÇÃO 2 ---
                const q = firestore.query(
                    firestore.collection(db, 'requests'),
                    firestore.where('stayId', '==', stay.id),
                    firestore.orderBy('createdAt', 'desc')
                );
                const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
                    setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request)));
                    setLoading(false);
                }, (error) => {
                    console.error("Erro ao buscar solicitações:", error);
                    setLoading(false);
                });
                return () => unsubscribe();
            } else {
                setLoading(false);
            }
        }
        fetchRequests();
    }, [stay?.id]);
    
    const combinedActivities = useMemo<ActivityItem[]>(() => {
        const mappedRequests: ActivityItem[] = requests.map(req => {
            let title = "Solicitação";
            if (req.type === 'item') title = `${req.details.quantity}x ${req.details.itemName}`;
            if (req.type === 'cleaning') title = "Solicitação de Limpeza";
            if (req.type === 'maintenance') title = "Relato de Manutenção";

            const typeInfo = { item: Package, cleaning: Sparkles, maintenance: Construction };
            
            return {
                id: req.id,
                type: 'request',
                date: req.createdAt.toDate(),
                title,
                status: statusMap[req.status]?.label || 'Desconhecido',
                statusVariant: statusMap[req.status]?.variant || 'outline',
                icon: typeInfo[req.type] || Package,
            };
        });

        const mappedBookings: ActivityItem[] = (bookings || []).map(book => ({
            id: book.id,
            type: 'booking',
            date: (book.startTime as any).toDate(),
            title: book.serviceName || 'Serviço Agendado',
            status: 'Agendado',
            statusVariant: 'secondary',
            icon: Calendar,
        }));
        
        return [...mappedRequests, ...mappedBookings].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [requests, bookings]);

    if (loading && bookings.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Últimas Atividades</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center p-8">
                    <Loader2 className="animate-spin" />
                </CardContent>
            </Card>
        );
    }
    
    if (combinedActivities.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Últimas Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-center text-muted-foreground py-4">Nenhuma solicitação ou agendamento encontrado.</p>
                </CardContent>
            </Card>
        );
    }

    const latestActivity = combinedActivities[0];

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Card className="cursor-pointer hover:bg-accent transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Últimas Atividades</span>
                            <Bell className="w-5 h-5 text-primary" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <latestActivity.icon className="w-8 h-8 text-muted-foreground" />
                            <div className="flex-1">
                                <p className="font-semibold">{latestActivity.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(latestActivity.date, "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                            <Badge variant={latestActivity.statusVariant}>{latestActivity.status}</Badge>
                        </div>
                        {combinedActivities.length > 1 && 
                            <p className="text-center text-sm text-primary font-semibold mt-4">
                                Ver todas as {combinedActivities.length} atividades
                            </p>
                        }
                    </CardContent>
                </Card>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Suas Atividades Recentes</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                    {combinedActivities.map(activity => (
                        <div key={activity.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <activity.icon className="w-5 h-5 mt-1 text-primary"/>
                                    <div>
                                        <p className="font-semibold">{activity.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(activity.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant={activity.statusVariant} className="whitespace-nowrap">{activity.status}</Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}