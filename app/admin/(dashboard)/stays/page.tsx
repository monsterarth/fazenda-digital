"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    RefreshCcw, History, Calendar, List, Zap, FileCheck2, 
    ArrowLeft, Maximize2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'; // Importando Dialog
import { useModalStore } from '@/hooks/use-modal-store';
import { toast } from 'sonner';

// Componentes
import { SchedulerTimeline } from '@/components/admin/stays/SchedulerTimeline';
import { StaysList } from '@/components/admin/stays/stays-list';
import { FastStaysList } from '@/components/admin/stays/fast-stays-list';
import { PendingCheckInsList } from '@/components/admin/stays/pending-checkins-list';
import { CreateStayDialog } from '@/components/admin/stays/create-stay-dialog'; 
import { EditStayDialog } from '@/components/admin/stays/edit-stay-dialog';
import { SendWhatsappDialog } from '@/components/admin/stays/send-whatsapp-dialog';
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
    const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
    
    // NOVO: Estado para controlar o Mapa em Tela Cheia
    const [isMapFullScreen, setIsMapFullScreen] = useState(false);

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
             const phone = stay.guest?.phone || stay.guestPhone || ""; 
             if (phone) window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
             else toast.error("Telefone não encontrado.");
        } else if (action === 'whatsapp_modal') {
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
            {/* HEADER DA PÁGINA */}
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

            {/* CONTEÚDO PRINCIPAL (TABS) */}
            <div className="flex-1 min-h-0 w-full">
                {/* ALTERAÇÃO 1: defaultValue="list" para iniciar na lista 
                */}
                <Tabs defaultValue="list" className="h-full flex flex-col w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-4 flex-none">
                        <TabsTrigger value="list"><List className="mr-2 h-4 w-4"/> Lista</TabsTrigger>
                        <TabsTrigger value="fast"><Zap className="mr-2 h-4 w-4"/> Aguardando</TabsTrigger>
                        <TabsTrigger value="pending"><FileCheck2 className="mr-2 h-4 w-4"/> Validação</TabsTrigger>
                    </TabsList>
                    
                    {/* TAB LISTA (PRINCIPAL) */}
                    <TabsContent value="list" className="flex-1 overflow-auto mt-0">
                        <Card className="shadow-sm border-none h-full flex flex-col">
                            <CardHeader className="flex-none flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle>Estadias Ativas</CardTitle>
                                    <CardDescription>Visualização em lista das estadias atuais.</CardDescription>
                                </div>
                                {/* ALTERAÇÃO 2: Botão para abrir o Mapa em Tela Cheia 
                                */}
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsMapFullScreen(true)}
                                    className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Abrir Mapa
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-auto min-h-0">
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

            {/* --- MODAL DE MAPA EM TELA CHEIA --- */}
            {/* ALTERAÇÃO 3: Dialog que cobre tudo (w-screen h-screen) sem layout 
            */}
            <Dialog open={isMapFullScreen} onOpenChange={setIsMapFullScreen}>
                <DialogContent className="max-w-[100vw] w-screen h-screen p-0 m-0 rounded-none border-none bg-slate-50 flex flex-col overflow-hidden">
                    {/* Header do Mapa */}
                    <div className="flex items-center justify-between px-4 py-2 bg-white border-b shadow-sm z-50 shrink-0">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <h2 className="font-bold text-lg text-slate-800">Mapa de Ocupação</h2>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsMapFullScreen(false)} className="hover:bg-red-50 hover:text-red-600">
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                    
                    {/* Corpo do Mapa */}
                    <div className="flex-1 relative w-full h-full overflow-hidden">
                        <SchedulerTimeline 
                            cabins={data.cabins}
                            stays={data.stays}
                            currentDate={viewDate}
                            onDateChange={setViewDate}
                            onAction={handleAction}
                            isLoading={loading}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAIS GLOBAIS DA PÁGINA */}
            
            {selectedStay && (
                <EditStayDialog 
                    isOpen={isEditOpen}
                    onClose={() => { setIsEditOpen(false); setSelectedStay(null); }}
                    stay={selectedStay}
                    cabins={data.cabins}
                    onSuccess={loadData}
                />
            )}

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

            <SendWhatsappDialog 
                isOpen={isWhatsappOpen} 
                onClose={() => setIsWhatsappOpen(false)} 
                stay={selectedStay} 
            />
        </div>
    );
}