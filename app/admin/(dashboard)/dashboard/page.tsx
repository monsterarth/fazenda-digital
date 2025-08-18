"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Property, BreakfastOrder, Booking, PreCheckIn } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Utensils, CalendarCheck, UserPlus, Info, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ++ INÍCIO DA CORREÇÃO: Nomes dos campos atualizados para corresponder ao tipo `Property` ++
const breakfastSettingsSchema = z.object({
    type: z.enum(['on-site', 'delivery']),
    orderingStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (HH:MM)"),
    orderingEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (HH:MM)"),
});
type BreakfastSettingsFormValues = z.infer<typeof breakfastSettingsSchema>;
// ++ FIM DA CORREÇÃO ++

type ActivityItem = {
    id: string;
    type: 'cafe' | 'agendamento' | 'check-in';
    icon: React.ReactNode;
    title: string;
    description: string;
    timestamp: Date;
    link: string;
};

const BreakfastSettingsModal = ({ isOpen, onClose, propertyInfo }: { isOpen: boolean, onClose: () => void, propertyInfo: Property | null }) => {
    if (!propertyInfo?.breakfast) return null;

    const form = useForm<BreakfastSettingsFormValues>({
        resolver: zodResolver(breakfastSettingsSchema),
        // ++ INÍCIO DA CORREÇÃO: Usar `orderingStartTime` e `orderingEndTime` como defaultValues ++
        defaultValues: {
            type: propertyInfo.breakfast.type,
            orderingStartTime: propertyInfo.breakfast.orderingStartTime,
            orderingEndTime: propertyInfo.breakfast.orderingEndTime,
        },
        // ++ FIM DA CORREÇÃO ++
    });

    const handleSaveChanges: SubmitHandler<BreakfastSettingsFormValues> = async (data) => {
        const toastId = toast.loading("Salvando alterações...");
        try {
            const propDocRef = doc(db, 'properties', 'default');
            // ++ INÍCIO DA CORREÇÃO: Atualizar os campos corretos no Firestore ++
            await updateDoc(propDocRef, {
                'breakfast.type': data.type,
                'breakfast.orderingStartTime': data.orderingStartTime,
                'breakfast.orderingEndTime': data.orderingEndTime,
            });
            // ++ FIM DA CORREÇÃO ++
            toast.success("Configurações salvas!", { id: toastId });
            onClose();
        } catch (error: any) {
            toast.error("Falha ao salvar.", { id: toastId, description: error.message });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configurações do Café da Manhã</DialogTitle>
                    <DialogDescription>Altere rapidamente a modalidade e horários para novos pedidos.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem><FormLabel>Modalidade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="on-site">Servido no Salão</SelectItem><SelectItem value="delivery">Entrega de Cestas</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                             {/* ++ INÍCIO DA CORREÇÃO: Corrigir os nomes dos campos no formulário ++ */}
                            <FormField control={form.control} name="orderingStartTime" render={({ field }) => (
                                <FormItem><FormLabel>Início dos Pedidos</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="orderingEndTime" render={({ field }) => (
                                <FormItem><FormLabel>Horário Limite</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             {/* ++ FIM DA CORREÇÃO ++ */}
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

const DashboardStatCard = ({ title, value, icon, link, description }: { title: string, value: number, icon: React.ReactNode, link: string, description: string }) => (
    <Link href={link} className="block">
        <Card className="hover:border-primary transition-colors h-full">
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
    const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBreakfastModalOpen, setIsBreakfastModalOpen] = useState(false);

    useEffect(() => {
        const qOrders = query(collection(db, "breakfastOrders"), where("status", "==", "pending"));
        const qBookings = query(collection(db, "bookings"), where("status", "==", "solicitado"));
        const qCheckIns = query(collection(db, "preCheckIns"), where("status", "==", "pendente"));
        
        const unsubOrdersStats = onSnapshot(qOrders, (snapshot) => setStats(prev => ({ ...prev, pendingOrders: snapshot.size })));
        const unsubBookingsStats = onSnapshot(qBookings, (snapshot) => setStats(prev => ({ ...prev, pendingBookings: snapshot.size })));
        const unsubCheckInsStats = onSnapshot(qCheckIns, (snapshot) => setStats(prev => ({ ...prev, pendingCheckIns: snapshot.size })));

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const qFeedOrders = query(collection(db, "breakfastOrders"), where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)));
        const qFeedBookings = query(collection(db, "bookings"), where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)));
        const qFeedCheckIns = query(collection(db, "preCheckIns"), where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)));

        const processSnapshot = (snapshot: any, type: ActivityItem['type']) => {
            const items: ActivityItem[] = snapshot.docs.map((doc: any) => {
                const data = doc.data();
                const timestamp = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                switch (type) {
                    case 'cafe':
                        return { id: doc.id, type, icon: <Utensils className="h-5 w-5" />, title: `Novo pedido de café`, description: `de ${data.guestName}`, timestamp, link: '/admin/pedidos/cafe' };
                    case 'agendamento':
                        return { id: doc.id, type, icon: <CalendarCheck className="h-5 w-5" />, title: `Novo agendamento`, description: `${data.serviceName} por ${data.guestName}`, timestamp, link: '/admin/agendamentos' };
                    case 'check-in':
                        return { id: doc.id, type, icon: <UserPlus className="h-5 w-5" />, title: `Novo Pré-Check-in`, description: `de ${data.leadGuestName}`, timestamp, link: '/admin/stays' };
                    default: return null;
                }
            }).filter(Boolean);
            
            setActivityFeed(prev => {
                const newItems = items.filter(item => !prev.some(p => p.id === item.id && p.type === item.type));
                return [...newItems, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            });
        };

        const unsubFeedOrders = onSnapshot(qFeedOrders, (snap) => processSnapshot(snap, 'cafe'));
        const unsubFeedBookings = onSnapshot(qFeedBookings, (snap) => processSnapshot(snap, 'agendamento'));
        const unsubFeedCheckIns = onSnapshot(qFeedCheckIns, (snap) => processSnapshot(snap, 'check-in'));
        
        const fetchProperty = async () => {
            const propDoc = await getDoc(doc(db, 'properties', 'default'));
            if (propDoc.exists()) {
                setPropertyInfo(propDoc.data() as Property);
            }
            setLoading(false);
        };
        const unsubProp = onSnapshot(doc(db, 'properties', 'default'), (doc) => {
            if (doc.exists()) setPropertyInfo(doc.data() as Property);
        });
        
        fetchProperty();

        return () => {
            unsubOrdersStats(); unsubBookingsStats(); unsubCheckInsStats();
            unsubFeedOrders(); unsubFeedBookings(); unsubFeedCheckIns();
            unsubProp();
        };
    }, []);

    const memoizedActivityFeed = useMemo(() => activityFeed.slice(0, 15), [activityFeed]);
    
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin"/></div>
    }

    const breakfastMode = propertyInfo?.breakfast?.type === 'on-site' ? 'Servido no Salão' : 'Entrega de Cestas';

    return (
        <>
            <Toaster richColors position="top-center" />
            <BreakfastSettingsModal isOpen={isBreakfastModalOpen} onClose={() => setIsBreakfastModalOpen(false)} propertyInfo={propertyInfo} />
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <DashboardStatCard title="Novos Pedidos de Café" value={stats.pendingOrders} icon={<Utensils className="h-4 w-4 text-muted-foreground" />} link="/admin/pedidos/cafe" description="Pedidos pendentes de impressão" />
                    <DashboardStatCard title="Novos Agendamentos" value={stats.pendingBookings} icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />} link="/admin/agendamentos" description="Serviços solicitados pelos hóspedes" />
                    <DashboardStatCard title="Pré-Check-ins Pendentes" value={stats.pendingCheckIns} icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} link="/admin/stays" description="Aguardando validação" />
                </div>
                
                <div className="grid gap-6 lg:grid-cols-3 items-start">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Info /> Status do Café da Manhã</span>
                                    <Button variant="outline" size="sm" onClick={() => setIsBreakfastModalOpen(true)}>
                                        <Settings className="mr-2 h-4 w-4"/> Alterar
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p><strong>Modalidade:</strong> <span className="font-semibold text-primary">{breakfastMode}</span></p>
                                {/* ++ INÍCIO DA CORREÇÃO: Exibir os valores corretos ++ */}
                                <p><strong>Horário de Abertura:</strong> <span className="font-semibold">{propertyInfo?.breakfast?.orderingStartTime}</span></p>
                                <p><strong>Horário Limite Pedidos:</strong> <span className="font-semibold">{propertyInfo?.breakfast?.orderingEndTime}</span></p>
                                {/* ++ FIM DA CORREÇÃO ++ */}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Atividade Recente</CardTitle>
                                <CardDescription>Últimas ações realizadas pelos hóspedes na plataforma.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {memoizedActivityFeed.length > 0 ? (
                                    <div className="space-y-4">
                                        {memoizedActivityFeed.map(item => (
                                            <Link href={item.link} key={`${item.id}-${item.type}`} className="flex items-center p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                    {item.icon}
                                                </div>
                                                <div className="ml-4 space-y-1">
                                                    <p className="text-sm font-medium leading-none">{item.title}</p>
                                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                                </div>
                                                <div className="ml-auto text-xs text-muted-foreground">
                                                    {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: ptBR })}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground py-8">Nenhuma atividade recente para exibir.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}