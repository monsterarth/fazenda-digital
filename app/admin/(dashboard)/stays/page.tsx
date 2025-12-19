"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    RefreshCcw, Plus, History, Calendar, List, Zap, FileCheck2, 
    ArrowLeft, UserPlus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useModalStore } from '@/hooks/use-modal-store';
import { toast } from 'sonner';

// Componentes
import { SchedulerTimeline } from '@/components/admin/stays/SchedulerTimeline';
import { StaysList } from '@/components/admin/stays/stays-list';
import { FastStaysList } from '@/components/admin/stays/fast-stays-list';
import { PendingCheckInsList } from '@/components/admin/stays/pending-checkins-list';
import { CreateStayDialog } from '@/components/admin/stays/create-stay-dialog'; 
import { EditStayDialog } from '@/components/admin/stays/edit-stay-dialog';
import { SendWhatsappDialog } from '@/components/admin/stays/send-whatsapp-dialog'; // NOVO IMPORT
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";

// Actions e Tipos
import { getSchedulerData, SchedulerData } from '@/app/actions/get-scheduler-data';
import { finalizeStayAction } from '@/app/actions/finalize-stay';
import { Stay } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function StaysPage() {
    const { onOpen } = useModalStore();
    const { user } = useAuth();
    const [data, setData] = useState<SchedulerData>({ cabins: [], stays: [], fastStays: [], pendingCheckIns: [] });
    const [loading, setLoading] = useState(true);
    const [viewDate, setViewDate] = useState(new Date());

    // Estados de Ação
    const [selectedStay, setSelectedStay] = useState<Stay | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCheckoutAlertOpen, setIsCheckoutAlertOpen] = useState(false);
    const [isWhatsappOpen, setIsWhatsappOpen] = useState(false); // NOVO ESTADO

    const loadData = async () => {
        setLoading(true);
        try {
            const startStr = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1).toISOString();
            const endStr = new Date(viewDate.getFullYear(), viewDate.getMonth() + 2, 0).toISOString();
            
            const result = await getSchedulerData(startStr, endStr);
            setData(result);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [viewDate]);

    // --- HANDLER UNIFICADO ---
    const handleAction = (action: string, stay: Stay) => {
        setSelectedStay(stay);
        
        if (action === 'edit' || action === 'details' || action === 'checkin' || action === 'validate') {
            setIsEditOpen(true);
        } else if (action === 'checkout') {
            setIsCheckoutAlertOpen(true);
        } else if (action === 'whatsapp') {
             // Abre link direto (como no mapa)
             const phone = stay.guest?.phone || stay.guestPhone || ""; 
             if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
             else toast.error("Telefone não encontrado.");
        } else if (action === 'whatsapp_modal') {
             // Abre o novo modal de escrever mensagem (usado na lista)
             setIsWhatsappOpen(true);
        }
    };

    const confirmCheckout = async () => {
        if (!selectedStay || !user) return;
        const toastId = toast.loading("Realizando check-out...");
        try {
            const result = await finalizeStayAction(selectedStay.id, user.email || 'Admin');
            if (result.success) {
                toast.success("Check-out realizado!", { id: toastId });
                loadData();
            } else {
                toast.error("Erro ao finalizar.", { id: toastId });
            }
        } catch (error) {
            toast.error("Erro de conexão.", { id: toastId });
        } finally {
            setIsCheckoutAlertOpen(false);
            setSelectedStay(null);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] gap-4 p-4 md:p-6 bg-slate-50/50 w-full overflow-hidden">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 flex-none">
                <div className="flex items-center gap-4">
                    <Link href="/admin/dashboard">
                        <Button variant="outline" size="icon" title="Voltar ao Dashboard">
                            <ArrowLeft className="h-4 w-4 text-slate-600" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Estadias</h1>
                        <p className="text-muted-foreground text-sm hidden md:block">
                            Visão geral de ocupação, check-ins e validações.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={loadData} title="Atualizar">
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onOpen('createStayLegacy')} className="hidden md:flex">
                        <History className="mr-2 h-4 w-4" /> Manual
                    </Button>
                    <Button onClick={() => onOpen('createStay', { cabins: data.cabins })} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                        <Zap className="mr-2 h-4 w-4" /> Estadia Rápida
                    </Button>
                    <CreateStayDialog cabins={data.cabins} onSuccess={loadData} />
                </div>
            </div>

            {/* CONTEÚDO */}
            <div className="flex-1 min-h-0 w-full">
                <Tabs defaultValue="map" className="h-full flex flex-col w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-4 flex-none">
                        <TabsTrigger value="map"><Calendar className="mr-2 h-4 w-4"/> Mapa</TabsTrigger>
                        <TabsTrigger value="list"><List className="mr-2 h-4 w-4"/> Lista</TabsTrigger>
                        <TabsTrigger value="fast"><Zap className="mr-2 h-4 w-4"/> Aguardando</TabsTrigger>
                        <TabsTrigger value="pending"><FileCheck2 className="mr-2 h-4 w-4"/> Validação</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="map" className="flex-1 min-h-0 mt-0 data-[state=active]:flex flex-col w-full">
                        <SchedulerTimeline 
                            cabins={data.cabins}
                            stays={data.stays}
                            currentDate={viewDate}
                            onDateChange={setViewDate}
                            onAction={handleAction}
                            isLoading={loading}
                        />
                    </TabsContent>

                    <TabsContent value="list" className="flex-1 overflow-auto mt-0">
                        <Card className="shadow-sm border-none">
                            <CardHeader>
                                <CardTitle>Estadias Ativas</CardTitle>
                                <CardDescription>Visualização em lista das estadias atuais.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Passando Cabins e onAction para o StaysList */}
                                <StaysList 
                                    stays={data.stays.filter(s => s.status === 'active')} 
                                    cabins={data.cabins}
                                    onAction={handleAction}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="fast" className="flex-1 overflow-auto mt-0">
                        <Card className="shadow-sm border-blue-100 h-full">
                            <CardHeader className="bg-blue-50/50">
                                <CardTitle className="text-blue-800">Links Enviados</CardTitle>
                                <CardDescription>Estadias criadas via Fast Stay aguardando preenchimento.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Aqui conectamos o onEdit para abrir o modal de edição (handleAction usa 'edit' ou 'details') */}
                                <FastStaysList 
                                    stays={data.fastStays} 
                                    onEdit={(stay) => handleAction('edit', stay)} 
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="pending" className="flex-1 overflow-auto mt-0">
                        <Card className="shadow-sm h-full">
                            <CardHeader>
                                <CardTitle className="text-yellow-700">Pré-Check-ins Pendentes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <PendingCheckInsList pendingCheckIns={data.pendingCheckIns} cabins={data.cabins} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* MODAIS GLOBAIS DA PÁGINA */}
            
            {/* 1. Editar Estadia */}
            {selectedStay && (
                <EditStayDialog 
                    isOpen={isEditOpen}
                    onClose={() => { setIsEditOpen(false); setSelectedStay(null); }}
                    stay={selectedStay}
                    cabins={data.cabins}
                    onSuccess={loadData}
                />
            )}

            {/* 2. Check-out Alert */}
            <AlertDialog open={isCheckoutAlertOpen} onOpenChange={setIsCheckoutAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Check-out</AlertDialogTitle>
                        <AlertDialogDescription>Confirmar saída de <b>{selectedStay?.guestName}</b>?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCheckout} className="bg-red-600 hover:bg-red-700">Confirmar Saída</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 3. Enviar WhatsApp Modal */}
            <SendWhatsappDialog 
                isOpen={isWhatsappOpen} 
                onClose={() => setIsWhatsappOpen(false)} 
                stay={selectedStay} 
            />
        </div>
    );
}