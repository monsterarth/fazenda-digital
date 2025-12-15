"use client";

import React, { useState, useEffect, useContext, useTransition } from 'react';
import { toast, Toaster } from 'sonner';
import { AuthContext } from '@/context/AuthContext';
import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

// Actions
import { getCommunicationListsAction, CommunicationLists, CommunicationStaySummary } from '@/app/actions/get-communication-lists';
import { getOlderEndedStaysAction } from '@/app/actions/get-older-ended-stays';
import { getGuestHistoryAction, GuestHistoryData } from '@/app/actions/get-guest-history';
import { sendCommunicationAction } from '@/app/actions/send-communication';
import { getProperty } from '@/app/actions/get-property';

// UI Components
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
    MessageSquare, Send, Phone, Calendar, User, CheckCircle2, 
    Clock, RefreshCw, Zap, Loader2, ChevronDown, Archive, AlertTriangle 
} from 'lucide-react';

export default function CommunicationMonitorPage() {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    
    const [activeTab, setActiveTab] = useState('current');
    const [lists, setLists] = useState<CommunicationLists>({ future: [], current: [], ended: [] });
    const [isLoadingList, setIsLoadingList] = useState(true);
    
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreEnded, setHasMoreEnded] = useState(true);

    const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
    const [historyData, setHistoryData] = useState<GuestHistoryData | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    
    const [customMessage, setCustomMessage] = useState('');
    const [isSending, startSending] = useTransition();
    const [property, setProperty] = useState<any>(null);

    // --- NOVOS ESTADOS PARA SEGURANÇA ---
    const [isCooldown, setIsCooldown] = useState(false); // Trava o botão por alguns segundos
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        content: string;
        templateKey?: string;
        title: string;
    }>({ isOpen: false, content: '', title: '' });

    // --- CARREGAMENTO DE DADOS ---
    const fetchLists = async () => {
        setIsLoadingList(true);
        const data = await getCommunicationListsAction();
        setLists(data);
        setIsLoadingList(false);
        setHasMoreEnded(true); 
    };

    const handleLoadMoreEnded = async () => {
        if (lists.ended.length === 0) return;
        setIsLoadingMore(true);
        const lastStay = lists.ended[lists.ended.length - 1];
        try {
            const olderStays = await getOlderEndedStaysAction(lastStay.checkOutDate);
            if (olderStays.length === 0) {
                setHasMoreEnded(false);
                toast.info("Não há mais registros antigos.");
            } else {
                setLists(prev => ({ ...prev, ended: [...prev.ended, ...olderStays] }));
            }
        } catch (error) {
            toast.error("Erro ao carregar histórico.");
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchLists();
        getProperty().then(p => setProperty(p));
    }, []);

    useEffect(() => {
        if (!selectedStayId) {
            setHistoryData(null);
            return;
        }
        const fetchDetails = async () => {
            setIsLoadingHistory(true);
            const data = await getGuestHistoryAction(selectedStayId);
            setHistoryData(data);
            setIsLoadingHistory(false);
            setCustomMessage('');
        };
        fetchDetails();
    }, [selectedStayId]);

    // --- LÓGICA DE ENVIO SEGURA ---

    // 1. O usuário clica no botão -> Abre o Dialog
    const requestSend = (content: string, templateKey?: string, title: string = "Confirmar Envio") => {
        if (!historyData) return;
        
        if (isCooldown) {
            toast.warning("Aguarde alguns segundos antes de enviar novamente.");
            return;
        }

        setConfirmDialog({
            isOpen: true,
            content,
            templateKey,
            title
        });
    };

    // 2. O usuário confirma no Dialog -> Executa o envio
    const executeSend = () => {
        if (!historyData || !user?.email) return;
        
        const { content, templateKey } = confirmDialog;
        setConfirmDialog({ ...confirmDialog, isOpen: false }); // Fecha dialog imediatamente

        // Ativa o Cooldown imediatamente para evitar cliques duplos
        setIsCooldown(true);

        startSending(async () => {
            const guestPhone = historyData.stay.guestPhone || historyData.stay.tempGuestPhone;
            
            if (!guestPhone) {
                toast.error("Hóspede sem telefone cadastrado.");
                setIsCooldown(false);
                return;
            }

            const result = await sendCommunicationAction({
                phone: guestPhone,
                message: content,
                guestName: historyData.stay.guestName,
                stayId: historyData.stay.id,
                adminEmail: user.email!,
                templateKey
            });

            if (result.success) {
                toast.success("Enviado com sucesso!");
                setCustomMessage('');
                const updated = await getGuestHistoryAction(historyData.stay.id);
                setHistoryData(updated);
            } else {
                toast.error(result.message);
            }

            // Remove o cooldown após 5 segundos, independente de sucesso ou erro
            setTimeout(() => {
                setIsCooldown(false);
            }, 5000);
        });
    };

    // Helpers
    const formatDateFriendly = (dateStr: string) => {
        if (!dateStr) return '--';
        const date = parseISO(dateStr);
        if (isToday(date)) return `Hoje, ${format(date, 'HH:mm')}`;
        if (isYesterday(date)) return `Ontem, ${format(date, 'HH:mm')}`;
        if (isTomorrow(date)) return `Amanhã, ${format(date, 'HH:mm')}`;
        return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
    };

    const getTemplateMessage = (key: string) => {
        if (!property?.messages?.[key]) return '';
        let msg = property.messages[key];
        const stay = historyData?.stay;
        if (!stay) return msg;

        msg = msg.replace('{guestName}', stay.guestName.split(' ')[0]);
        msg = msg.replace('{cabinName}', stay.cabinName);
        msg = msg.replace('{token}', stay.token);
        msg = msg.replace('{portalLink}', `https://portal.fazendadorosa.com.br/?token=${stay.token}`);
        
        return msg;
    };

    const StayListItem = ({ stay }: { stay: CommunicationStaySummary }) => (
        <div 
            onClick={() => setSelectedStayId(stay.id)}
            className={`p-3 rounded-lg cursor-pointer border transition-all hover:shadow-md mb-2
                ${selectedStayId === stay.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-slate-200 hover:border-blue-200'}
            `}
        >
            <div className="flex justify-between items-start">
                <h4 className="font-semibold text-sm text-slate-800 truncate pr-2">{stay.guestName}</h4>
                <Badge variant="outline" className="text-[10px] h-5 px-1 bg-white">{stay.cabinName}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <Calendar className="h-3 w-3" />
                <span>{format(parseISO(stay.checkInDate), 'dd/MM')} - {format(parseISO(stay.checkOutDate), 'dd/MM')}</span>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4 h-[calc(100vh-2rem)] flex flex-col">
            <Toaster richColors position="top-center" />
            
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-blue-600" /> Monitor de Jornada
                    </h1>
                    <p className="text-sm text-slate-500">Acompanhe e interaja com seus hóspedes em tempo real.</p>
                </div>
                
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={fetchLists} disabled={isLoadingList}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingList ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                    <Button variant="outline" size="sm" asChild className="hidden md:flex text-slate-500 hover:text-slate-700">
                        <Link href="/admin/legacycomm">
                            <Archive className="h-4 w-4 mr-2" /> Legado
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info("API Conectada: v2.4 (Estável)")} className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800">
                        <Zap className="h-4 w-4 mr-2 fill-green-600" /> API Online
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
                
                {/* ESQUERDA: LISTAS */}
                <Card className="lg:w-1/3 flex flex-col overflow-hidden h-full border-slate-200 shadow-sm bg-slate-50/50">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
                        <div className="px-4 pt-4">
                            <TabsList className="w-full grid grid-cols-3">
                                <TabsTrigger value="future">Futuros</TabsTrigger>
                                <TabsTrigger value="current">Atuais</TabsTrigger>
                                <TabsTrigger value="ended">Fim</TabsTrigger>
                            </TabsList>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingList ? (
                                <div className="space-y-2">
                                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                                </div>
                            ) : (
                                <>
                                    <TabsContent value="future" className="mt-0 space-y-1">
                                        {lists.future.length === 0 && <p className="text-center text-sm text-slate-400 py-8">Nenhum check-in próximo.</p>}
                                        {lists.future.map(stay => <StayListItem key={stay.id} stay={stay} />)}
                                    </TabsContent>
                                    <TabsContent value="current" className="mt-0 space-y-1">
                                        {lists.current.length === 0 && <p className="text-center text-sm text-slate-400 py-8">Nenhum hóspede na casa.</p>}
                                        {lists.current.map(stay => <StayListItem key={stay.id} stay={stay} />)}
                                    </TabsContent>
                                    <TabsContent value="ended" className="mt-0 space-y-1">
                                        {lists.ended.length === 0 && <p className="text-center text-sm text-slate-400 py-8">Nenhum check-out recente.</p>}
                                        {lists.ended.map(stay => <StayListItem key={stay.id} stay={stay} />)}
                                        {lists.ended.length > 0 && hasMoreEnded && (
                                            <Button variant="ghost" className="w-full mt-4 text-xs text-blue-600" onClick={handleLoadMoreEnded} disabled={isLoadingMore}>
                                                {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                                                Carregar mais antigos
                                            </Button>
                                        )}
                                    </TabsContent>
                                </>
                            )}
                        </div>
                    </Tabs>
                </Card>

                {/* DIREITA: DETALHES & TIMELINE */}
                <Card className="lg:w-2/3 flex flex-col overflow-hidden h-full shadow-md border-slate-200">
                    {!selectedStayId ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <User className="h-16 w-16 mb-4 opacity-20" />
                            <p>Selecione um hóspede ao lado para ver detalhes.</p>
                        </div>
                    ) : isLoadingHistory ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : historyData ? (
                        <div className="flex flex-col h-full">
                            <div className="p-6 border-b bg-white flex justify-between items-start flex-shrink-0">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{historyData.stay.guestName}</h2>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full"><Phone size={12}/> {historyData.stay.guestPhone || "Sem fone"}</span>
                                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full"><User size={12}/> {historyData.stay.cabinName}</span>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={`https://wa.me/${(historyData.stay.guestPhone || "").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 border-green-200 hover:bg-green-50">
                                        <Zap className="h-4 w-4 mr-2" /> WhatsApp Web
                                    </a>
                                </Button>
                            </div>

                            <ScrollArea className="flex-1 bg-slate-50/50">
                                <div className="p-6 space-y-8">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatusCard 
                                            label="Pré-Check-in" 
                                            done={historyData.flags.preCheckInSent || historyData.stay.status === 'active'} 
                                            action={() => requestSend(getTemplateMessage('whatsappPreCheckIn'), 'whatsappPreCheckIn', "Enviar Link de Pré-Check-in")}
                                            actionLabel="Enviar Link"
                                            disabled={isCooldown}
                                        />
                                        <StatusCard 
                                            label="Boas-Vindas" 
                                            done={historyData.flags.welcomeSent} 
                                            action={() => requestSend(getTemplateMessage('whatsappWelcome'), 'whatsappWelcome', "Enviar Boas-Vindas")}
                                            actionLabel="Enviar Agora"
                                            disabled={isCooldown}
                                        />
                                        <StatusCard 
                                            label="Info Saída" 
                                            done={historyData.flags.checkoutInfoSent} 
                                            action={() => requestSend(getTemplateMessage('whatsappCheckoutInfo'), 'whatsappCheckoutInfo', "Enviar Informações de Saída")}
                                            actionLabel="Enviar Info"
                                            disabled={isCooldown}
                                        />
                                        <StatusCard 
                                            label="Feedback" 
                                            done={historyData.flags.feedbackSent} 
                                            action={() => requestSend(getTemplateMessage('whatsappFeedbackRequest'), 'whatsappFeedbackRequest', "Solicitar Avaliação")}
                                            actionLabel="Pedir Avaliação"
                                            disabled={isCooldown}
                                        />
                                    </div>

                                    <Separator />

                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            <Clock className="h-4 w-4" /> Histórico de Comunicação
                                        </h3>
                                        <div className="space-y-4 pl-2 border-l-2 border-slate-200 ml-2">
                                            {historyData.logs.length === 0 ? (
                                                <p className="text-sm text-slate-400 pl-4 italic">Nenhuma mensagem registrada ainda.</p>
                                            ) : (
                                                historyData.logs.map(log => (
                                                    <div key={log.id} className="relative pl-6 pb-2 group">
                                                        <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start bg-white p-3 rounded-lg border border-slate-100 shadow-sm group-hover:shadow-md transition-all">
                                                            <div className="flex-1">
                                                                <p className="text-xs font-semibold text-blue-600 mb-0.5 uppercase tracking-wider">
                                                                    {getTemplateName(log.type)}
                                                                </p>
                                                                <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                                                                    {log.content}
                                                                </p>
                                                            </div>
                                                            <div className="text-xs text-slate-400 mt-2 sm:mt-0 sm:ml-4 text-right min-w-[80px]">
                                                                {formatDateFriendly(log.sentAt)}
                                                                <br/>
                                                                <span className="opacity-70">{log.actor.split('@')[0]}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <div className="p-4 bg-white border-t flex flex-col gap-2 flex-shrink-0">
                                <Textarea 
                                    placeholder="Escrever mensagem personalizada..." 
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="min-h-[80px] resize-none bg-slate-50 focus:bg-white transition-colors"
                                    disabled={isCooldown}
                                />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">
                                        {isCooldown ? "Aguarde um momento..." : "Enter para nova linha"}
                                    </span>
                                    <Button 
                                        onClick={() => requestSend(customMessage, 'custom_message', "Enviar Mensagem Manual")} 
                                        disabled={!customMessage.trim() || isSending || isCooldown}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Send className="h-4 w-4 mr-2"/>}
                                        {isCooldown ? `Aguarde...` : 'Enviar Mensagem'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </Card>
            </div>

            {/* DIALOG DE CONFIRMAÇÃO */}
            <AlertDialog open={confirmDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmDialog({ ...confirmDialog, isOpen: false })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a enviar uma mensagem para <strong>{historyData?.stay.guestName}</strong> via WhatsApp.
                            <br/><br/>
                            <span className="font-semibold text-xs uppercase text-slate-500">Preview:</span>
                            <div className="mt-1 p-2 bg-slate-100 rounded text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono">
                                {confirmDialog.content}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeSend} className="bg-blue-600 hover:bg-blue-700">
                            Confirmar Envio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Componente Auxiliar: Card de Status (Agora aceita disabled)
function StatusCard({ label, done, action, actionLabel, disabled }: { label: string, done: boolean, action: () => void, actionLabel: string, disabled: boolean }) {
    return (
        <div className={`p-3 rounded-lg border flex flex-col items-center justify-center text-center gap-2 transition-all
            ${done ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'}
        `}>
            {done ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
                <div className="h-6 w-6 rounded-full border-2 border-slate-300 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                </div>
            )}
            <span className={`text-sm font-medium ${done ? 'text-green-800' : 'text-slate-600'}`}>{label}</span>
            
            {!done && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 -mb-1" 
                    onClick={action}
                    disabled={disabled}
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

function getTemplateName(type: string) {
    const map: Record<string, string> = {
        'whatsappWelcome': 'Boas-Vindas',
        'whatsappPreCheckIn': 'Pré-Check-in',
        'whatsappFeedbackRequest': 'Pedido de Feedback',
        'whatsappCheckoutInfo': 'Info de Saída',
        'custom_message': 'Manual',
        'whatsappBookingConfirmed': 'Reserva Confirmada'
    };
    return map[type] || type;
}