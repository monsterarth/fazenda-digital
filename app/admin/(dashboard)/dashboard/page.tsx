// app/admin/(dashboard)/dashboard/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react'; 
import { db } from '@/lib/firebase';
// ## INÍCIO DA CORREÇÃO ##
// Removido 'subHours', Adicionado 'format' de date-fns
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, Timestamp, orderBy, limit } from 'firebase/firestore'; 
import { format } from 'date-fns'; // <-- ADICIONADO
// ## FIM DA CORREÇÃO ##
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Property } from '@/types'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'; 
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
// ++ ATUALIZADO: Importa 'Filter' e 'Wrench' (Manutenção) ++
import { 
    Utensils, CalendarCheck, UserPlus, Info, Loader2, Settings, ShieldX, 
    UserCheck, Star, Trash2, CalendarX, KeyRound, LogOut, Send, XCircle,
    CheckCircle, Clock, TriangleAlert, Filter, Wrench
} from 'lucide-react';
// ++ ATUALIZADO: Importa DropdownMenu para o filtro ++
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ... (schema 'breakfastSettingsSchema' não muda) ...
const breakfastSettingsSchema = z.object({
    type: z.enum(['on-site', 'delivery']),
    orderingStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (HH:MM)"),
    orderingEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato inválido (HH:MM)"),
});
type BreakfastSettingsFormValues = z.infer<typeof breakfastSettingsSchema>;

// ++ ATUALIZADO: Tipo ActivityLog agora inclui 'maintenance_task_deleted' ++
type ActivityLog = {
    id: string;
    timestamp: Timestamp;
    type: 
      | 'cafe_ordered' 
      | 'booking_requested' 
      | 'checkin_submitted' 
      | 'checkin_validated' 
      | 'checkin_rejected' 
      | 'booking_confirmed' 
      | 'booking_declined' 
      | 'booking_created_by_admin' 
      | 'booking_cancelled_by_admin' 
      | 'booking_cancelled_by_guest' 
      | 'survey_submitted' 
      | 'stay_created_manually'
      | 'stay_ended'
      | 'stay_token_updated'
      | 'request_created'       
      | 'request_cancelled'
      | 'request_in_progress' 
      | 'request_completed'   
      | 'request_deleted'
      | 'maintenance_task_created'
      | 'maintenance_task_assigned'
      | 'maintenance_task_status_changed'
      | 'maintenance_task_completed'
      | 'maintenance_task_archived'
      | 'maintenance_task_deleted'; // <-- ADIÇÃO DA ÚLTIMA RESPOSTA
    actor: { type: 'guest' | 'admin'; identifier: string; };
    details: string;
    link: string;
};

// ... (Componente 'BreakfastSettingsModal' não muda) ...
const BreakfastSettingsModal = ({ isOpen, onClose, propertyInfo }: { isOpen: boolean, onClose: () => void, propertyInfo: Property | null }) => {
    if (!propertyInfo?.breakfast) return null;
    const form = useForm<BreakfastSettingsFormValues>({
        resolver: zodResolver(breakfastSettingsSchema),
        defaultValues: {
            type: propertyInfo.breakfast.type,
            orderingStartTime: propertyInfo.breakfast.orderingStartTime,
            orderingEndTime: propertyInfo.breakfast.orderingEndTime,
        },
    });
    const handleSaveChanges: SubmitHandler<BreakfastSettingsFormValues> = async (data) => {
        const toastId = toast.loading("Salvando alterações...");
        try {
            const propDocRef = doc(db, 'properties', 'default');
            await updateDoc(propDocRef, {
                'breakfast.type': data.type,
                'breakfast.orderingStartTime': data.orderingStartTime,
                'breakfast.orderingEndTime': data.orderingEndTime,
            });
            toast.success("Configurações salvas!", { id: toastId });
            onClose();
        } catch (error: any) {
            toast.error("Falha ao salvar.", { id: toastId, description: error.message });
        }
    };
    return (
        <Dialog open={isOpen} onOpenChange={onClose}><DialogContent><DialogHeader><DialogTitle>Configurações do Café da Manhã</DialogTitle><DialogDescription>Altere rapidamente a modalidade e horários para novos pedidos.</DialogDescription></DialogHeader><Form {...form}><form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-4 pt-4"><FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Modalidade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="on-site">Servido no Salão</SelectItem><SelectItem value="delivery">Entrega de Cestas</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="orderingStartTime" render={({ field }) => (<FormItem><FormLabel>Início dos Pedidos</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="orderingEndTime" render={({ field }) => (<FormItem><FormLabel>Horário Limite</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} /></div><DialogFooter className="pt-4"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter></form></Form></DialogContent></Dialog>
    );
};

// ... (Componente 'DashboardStatCard' não muda) ...
const DashboardStatCard = ({ title, value, icon, link, description }: { title: string, value: number, icon: React.ReactNode, link: string, description: string }) => (
    <Link href={link} className="block"><Card className="hover:border-primary transition-colors h-full"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle>{icon}</CardHeader><CardContent><div className="text-2xl font-bold">{value}</div><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card></Link>
);

// ++ ATUALIZADO: 'activityTypeMap' agora inclui 'maintenance_task_deleted' ++
const activityTypeMap: Record<ActivityLog['type'] | 'default', { icon: React.ReactNode; title: string; color: string; }> = {
    // Check-in
    checkin_submitted: { icon: <UserPlus className="h-5 w-5" />, title: "Pré-Check-in Recebido", color: "bg-blue-100 text-blue-800" },
    checkin_validated: { icon: <UserCheck className="h-5 w-5" />, title: "Check-in Validado", color: "bg-green-100 text-green-800" },
    checkin_rejected: { icon: <ShieldX className="h-5 w-5" />, title: "Check-in Recusado", color: "bg-red-100 text-red-800" },
    // Café
    cafe_ordered: { icon: <Utensils className="h-5 w-5" />, title: "Novo Pedido de Café", color: "bg-blue-100 text-blue-800" },
    // Agendamentos
    booking_requested: { icon: <CalendarCheck className="h-5 w-5" />, title: "Novo Agendamento", color: "bg-blue-100 text-blue-800" },
    booking_cancelled_by_guest: { icon: <CalendarX className="h-5 w-5" />, title: "Agend. Cancelado (Hósp.)", color: "bg-yellow-100 text-yellow-800" },
    booking_confirmed: { icon: <CalendarCheck className="h-5 w-5" />, title: "Agendamento Confirmado", color: "bg-green-100 text-green-800" },
    booking_created_by_admin: { icon: <CalendarCheck className="h-5 w-5" />, title: "Agendamento Criado", color: "bg-green-100 text-green-800" },
    booking_declined: { icon: <CalendarX className="h-5 w-5" />, title: "Agendamento Recusado", color: "bg-red-100 text-red-800" },
    booking_cancelled_by_admin: { icon: <Trash2 className="h-5 w-5" />, title: "Agend. Cancelado (Admin)", color: "bg-red-100 text-red-800" },
    // Pesquisas
    survey_submitted: { icon: <Star className="h-5 w-5" />, title: "Nova Avaliação", color: "bg-blue-100 text-blue-800" },
    // Solicitações
    request_created: { icon: <Send className="h-5 w-5" />, title: "Nova Solicitação", color: "bg-blue-100 text-blue-800" },
    request_cancelled: { icon: <XCircle className="h-5 w-5" />, title: "Solicitação Cancelada", color: "bg-yellow-100 text-yellow-800" },
    request_in_progress: { icon: <Clock className="h-5 w-5" />, title: "Solicitação em Andamento", color: "bg-purple-100 text-purple-800" },
    request_completed: { icon: <CheckCircle className="h-5 w-5" />, title: "Solicitação Concluída", color: "bg-green-100 text-green-800" },
    request_deleted: { icon: <Trash2 className="h-5 w-5" />, title: "Solicitação Excluída", color: "bg-red-100 text-red-800" },
    // Estadias
    stay_created_manually: { icon: <UserPlus className="h-5 w-5" />, title: "Estadia Criada", color: "bg-green-100 text-green-800" },
    stay_ended: { icon: <LogOut className="h-5 w-5" />, title: "Estadia Encerrada", color: "bg-red-100 text-red-800" },
    stay_token_updated: { icon: <KeyRound className="h-5 w-5" />, title: "Token Alterado", color: "bg-purple-100 text-purple-800" },
    // Manutenção
    maintenance_task_created: { icon: <Wrench className="h-5 w-5" />, title: "Tarefa Criada", color: "bg-gray-100 text-gray-800" },
    maintenance_task_assigned: { icon: <Wrench className="h-5 w-5" />, title: "Tarefa Delegada", color: "bg-gray-100 text-gray-800" },
    maintenance_task_status_changed: { icon: <Wrench className="h-5 w-5" />, title: "Tarefa Atualizada", color: "bg-gray-100 text-gray-800" },
    maintenance_task_completed: { icon: <Wrench className="h-5 w-5" />, title: "Tarefa Concluída", color: "bg-gray-100 text-gray-800" },
    maintenance_task_archived: { icon: <Wrench className="h-5 w-5" />, title: "Tarefa Arquivada", color: "bg-gray-100 text-gray-800" },
    maintenance_task_deleted: { icon: <Trash2 className="h-5 w-5" />, title: "Tarefa Excluída", color: "bg-red-100 text-red-800" }, // <-- ADIÇÃO DA ÚLTIMA RESPOSTA
    // Default
    default: { icon: <Info className="h-5 w-5" />, title: "Nova Atividade", color: "bg-muted text-muted-foreground" }
};

// ... (FilterCategory não muda) ...
type FilterCategory = 'checkin' | 'cafe' | 'booking' | 'survey' | 'request' | 'stay' | 'task' | 'other';

// ++ ATUALIZADO: 'activityCategoryMap' agora inclui 'maintenance_task_deleted' ++
const activityCategoryMap: Record<ActivityLog['type'], FilterCategory> = {
    checkin_submitted: 'checkin',
    checkin_validated: 'checkin',
    checkin_rejected: 'checkin',
    cafe_ordered: 'cafe',
    booking_requested: 'booking',
    booking_confirmed: 'booking',
    booking_declined: 'booking',
    booking_created_by_admin: 'booking',
    booking_cancelled_by_admin: 'booking',
    booking_cancelled_by_guest: 'booking',
    survey_submitted: 'survey',
    request_created: 'request',
    request_cancelled: 'request',
    request_in_progress: 'request',
    request_completed: 'request',
    request_deleted: 'request',
    stay_created_manually: 'stay',
    stay_ended: 'stay',
    stay_token_updated: 'stay',
    maintenance_task_created: 'task',
    maintenance_task_assigned: 'task',
    maintenance_task_status_changed: 'task',
    maintenance_task_completed: 'task',
    maintenance_task_archived: 'task',
    maintenance_task_deleted: 'task', // <-- ADIÇÃO DA ÚLTIMA RESPOSTA
};

// ... (filterConfig não muda) ...
const filterConfig: Record<FilterCategory, string> = {
    checkin: "Check-ins",
    cafe: "Pedidos de Café",
    booking: "Agendamentos",
    survey: "Pesquisas",
    request: "Solicitações",
    stay: "Estadias",
    task: "Manutenção",
    other: "Outros", 
};


export default function DashboardPage() {
    // ... (Hooks de estado, stats, propertyInfo, etc. não mudam) ...
    const [stats, setStats] = useState({ 
        pendingOrders: 0, 
        pendingBookings: 0, 
        pendingCheckIns: 0,
        pendingRequests: 0 
    });
    const [propertyInfo, setPropertyInfo] = useState<Property | null>(null);
    const [activityFeed, setActivityFeed] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBreakfastModalOpen, setIsBreakfastModalOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const pendingRequestsRef = useRef(0); 
    const [hasNewRequest, setHasNewRequest] = useState(false);
    const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
    const router = useRouter(); 

    // ... (Estado dos filtros não muda) ...
    const [filters, setFilters] = useState({
        checkin: true,
        cafe: true,
        booking: true,
        survey: true,
        request: true,
        stay: true,
        task: false, // <-- Desativado por padrão
        other: true,
    });

    // ... (handleFilterChange não muda) ...
    const handleFilterChange = (category: FilterCategory, checked: boolean) => {
        setFilters(prev => ({
            ...prev,
            [category]: checked,
        }));
    };

    // ... (useEffect para buscar dados não muda) ...
    useEffect(() => {
        const qOrders = query(collection(db, "breakfastOrders"), where("status", "==", "pending"));
        const qCheckIns = query(collection(db, "preCheckIns"), where("status", "==", "pendente"));
        const qRequests = query(collection(db, "requests"), where("status", "==", "pending"));
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const qBookings = query(
            collection(db, "bookings"), 
            where("date", "==", todayStr)
        );
        const unsubOrdersStats = onSnapshot(qOrders, (snapshot) => setStats(prev => ({ ...prev, pendingOrders: snapshot.size })));
        const unsubCheckInsStats = onSnapshot(qCheckIns, (snapshot) => setStats(prev => ({ ...prev, pendingCheckIns: snapshot.size })));
        const unsubBookingsStats = onSnapshot(qBookings, (snapshot) => {
            setStats(prev => ({ ...prev, pendingBookings: snapshot.size }));
        });
        const unsubRequestsStats = onSnapshot(qRequests, (snapshot) => {
            const newCount = snapshot.size;
            if (newCount > pendingRequestsRef.current) {
                audioRef.current?.play(); 
                setHasNewRequest(true);   
                setIsNewRequestModalOpen(true); 
            }
            pendingRequestsRef.current = newCount;
            setStats(prev => ({ ...prev, pendingRequests: newCount }));
        });
        const qLogs = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(20));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
            setActivityFeed(logs);
            if(loading) setLoading(false); 
        });
        const unsubProp = onSnapshot(doc(db, 'properties', 'default'), (doc) => {
            if (doc.exists()) setPropertyInfo(doc.data() as Property);
        });
        return () => {
            unsubOrdersStats(); 
            unsubBookingsStats(); 
            unsubCheckInsStats();
            unsubRequestsStats(); 
            unsubLogs();
            unsubProp();
        };
    }, []); 
    
    // ... (useMemo para filtrar não muda) ...
    const filteredActivityFeed = useMemo(() => {
        return activityFeed.filter(log => {
            const category = activityCategoryMap[log.type] || 'other';
            return filters[category as keyof typeof filters];
        });
    }, [activityFeed, filters]); 

    // ... (Renderização do return, loading, breakfastMode, etc. não mudam) ...
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin"/></div>
    }
    const breakfastMode = propertyInfo?.breakfast?.type === 'on-site' ? 'Servido no Salão' : 'Entrega de Cestas';

    return (
        <>
            <audio ref={audioRef} src="/sounds/notification.mp3" preload="auto" />
            
            <Dialog open={isNewRequestModalOpen} onOpenChange={setIsNewRequestModalOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <TriangleAlert className="h-7 w-7 text-yellow-500 animate-pulse" />
                    Nova Solicitação!
                  </DialogTitle>
                  <DialogDescription className="pt-2">
                    Uma nova solicitação de hóspede acabou de chegar.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:justify-end pt-4">
                  <Button variant="outline" onClick={() => setIsNewRequestModalOpen(false)}>
                    Fechar
                  </Button>
                  <Button onClick={() => {
                    router.push('/admin/solicitacoes');
                    setIsNewRequestModalOpen(false);
                    setHasNewRequest(false); 
                  }}>
                    Ver Solicitações
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Toaster richColors position="top-center" />
            <BreakfastSettingsModal isOpen={isBreakfastModalOpen} onClose={() => setIsBreakfastModalOpen(false)} propertyInfo={propertyInfo} />
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <DashboardStatCard 
                        title="Novos Pedidos de Café" 
                        value={stats.pendingOrders} 
                        icon={<Utensils className="h-4 w-4 text-muted-foreground" />} 
                        link="/admin/pedidos/cafe" 
                        description="Pedidos pendentes de impressão" 
                    />
                    <DashboardStatCard 
                        title="Agendamentos de Hoje" 
                        value={stats.pendingBookings}
                        icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />} 
                        link="/admin/agendamentos" 
                        description="Total de reservas para hoje"
                    />
                    <DashboardStatCard 
                        title="Pré-Check-ins Pendentes" 
                        value={stats.pendingCheckIns} 
                        icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} 
                        link="/admin/stays" 
                        description="Aguardando validação" 
                    />
                    <div 
                        className={cn(
                            "rounded-lg transition-all", 
                            hasNewRequest && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg animate-pulse"
                        )}
                        onClick={() => setHasNewRequest(false)} 
                    >
                        <DashboardStatCard 
                            title="Novas Solicitações" 
                            value={stats.pendingRequests} 
                            icon={<Send className="h-4 w-4 text-muted-foreground" />} 
                            link="/admin/solicitacoes" 
                            description="Pedidos de itens ou limpeza" 
                        />
                    </div>
                </div>
                
                <div className="grid gap-6 lg:grid-cols-3 items-start">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><Info /> Status do Café</span>
                                    <Button variant="outline" size="sm" onClick={() => setIsBreakfastModalOpen(true)}>
                                        <Settings className="mr-2 h-4 w-4"/> Alterar
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p><strong>Modalidade:</strong> <span className="font-semibold text-primary">{breakfastMode}</span></p>
                                <p><strong>Início dos Pedidos:</strong> <span className="font-semibold">{propertyInfo?.breakfast?.orderingStartTime}</span></p>
                                <p><strong>Limite para Pedidos:</strong> <span className="font-semibold">{propertyInfo?.breakfast?.orderingEndTime}</span></p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Atividade Recente</CardTitle>
                                        <CardDescription>Últimas ações realizadas na plataforma.</CardDescription>
                                    </div>
                                    
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Filter className="mr-2 h-4 w-4" />
                                                Filtros
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56" align="end">
                                            <DropdownMenuLabel>Exibir Atividades</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {(Object.keys(filters) as FilterCategory[]).map(category => (
                                                <DropdownMenuCheckboxItem
                                                    key={category}
                                                    checked={filters[category]}
                                                    onCheckedChange={(checked) => handleFilterChange(category, !!checked)}
                                                >
                                                    {filterConfig[category]}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {filteredActivityFeed.length > 0 ? (
                                    <div className="space-y-4">
                                        {filteredActivityFeed.map(log => {
                                            const activityInfo = activityTypeMap[log.type] || activityTypeMap.default;
                                            const description = log.actor.type === 'admin' 
                                                ? `${log.details} por ${log.actor.identifier}`
                                                : log.details;

                                            return (
                                                <Link href={log.link} key={log.id} className="flex items-center p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", activityInfo.color)}>
                                                        {activityInfo.icon}
                                                    </div>
                                                    <div className="ml-4 space-y-1">
                                                        <p className="text-sm font-medium leading-none">{activityInfo.title}</p>
                                                        <p className="text-sm text-muted-foreground">{description}</p>
                                                    </div>
                                                    <div className="ml-auto text-xs text-muted-foreground">
                                                        {log.timestamp && formatDistanceToNow(log.timestamp.toDate(), { addSuffix: true, locale: ptBR })}
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground py-8">
                                        {activityFeed.length > 0 ? "Nenhuma atividade corresponde aos filtros." : "Nenhuma atividade recente para exibir."}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}