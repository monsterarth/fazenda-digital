"use client";

import React, { useState, useEffect, useContext, useTransition, useMemo } from 'react';
import { toast, Toaster } from 'sonner';
import { AuthContext } from '@/context/AuthContext';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import Link from 'next/link';

// Actions
import { getCommunicationListsAction, CommunicationLists, CommunicationStaySummary } from '@/app/actions/get-communication-lists';
import { getOlderEndedStaysAction } from '@/app/actions/get-older-ended-stays';
import { getGuestHistoryAction, GuestHistoryData } from '@/app/actions/get-guest-history';
import { sendCommunicationAction } from '@/app/actions/send-communication';
import { getProperty } from '@/app/actions/get-property';

// UI Components
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
    MessageSquare, Send, User, CheckCircle2, 
    RefreshCw, Zap, Loader2, Archive, Wifi,
    ArrowLeft, MoreVertical, Search
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// --- LÓGICA DE VARIÁVEIS ---
const processMessageVariables = (template: string, stay: any, property: any) => {
    if (!template) return '';
    if (!stay) return template;

    const formatGuestName = (fullName: string) => {
        if (!fullName) return 'Hóspede';
        const firstName = fullName.split(' ')[0];
        return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    };

    const checkoutDateFormatted = stay.checkOutDate 
        ? format(parseISO(stay.checkOutDate), "dd/MM/yyyy") 
        : '--/--/----';
    
    const checkoutTime = stay.checkoutTime || "12:00"; 
    const deadlineTime = property?.orderingEndTime || "22:00";
    const baseUrl = "https://portal.fazendadorosa.com.br";
    const tokenParams = `?token=${stay.token}`;
    const wifiSsid = stay.cabin?.wifiSsid || stay.wifiSsid || "Não informado";
    const wifiPass = stay.cabin?.wifiPassword || stay.wifiPassword || "Não informada";

    const variables: Record<string, string> = {
        '{propertyName}': property?.name || "Fazenda do Rosa",
        '{guestName}': formatGuestName(stay.guestName),
        '{token}': stay.token || "------",
        '{preCheckInLink}': `${baseUrl}/${tokenParams}`,
        '{portalLink}': `${baseUrl}/${tokenParams}`,
        '{feedbackLink}': `${baseUrl}/s/default_survey${tokenParams}`,
        '{wifiSsid}': wifiSsid,
        '{wifiPassword}': wifiPass,
        '{deadline}': deadlineTime,
        '{checkoutDate}': checkoutDateFormatted,
        '{checkoutTime}': checkoutTime,
        '{serviceName}': "Serviço", 
        '{serviceDate}': format(new Date(), "dd/MM"),
        '{serviceTime}': format(new Date(), "HH:mm"),
        '{serviceDuration}': "--",
        '{requestName}': "Solicitação"
    };

    let processedMessage = template;
    Object.keys(variables).forEach(key => {
        const regex = new RegExp(key, 'gi'); 
        processedMessage = processedMessage.replace(regex, variables[key]);
    });

    return processedMessage;
};

export default function CommunicationMonitorPage() {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    
    const [activeTab, setActiveTab] = useState('current');
    const [lists, setLists] = useState<CommunicationLists>({ future: [], current: [], ended: [] });
    const [isLoadingList, setIsLoadingList] = useState(true);
    
    // Novo estado para o filtro
    const [searchTerm, setSearchTerm] = useState('');

    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreEnded, setHasMoreEnded] = useState(true);

    const [selectedStayId, setSelectedStayId] = useState<string | null>(null);
    const [historyData, setHistoryData] = useState<GuestHistoryData | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    
    const [customMessage, setCustomMessage] = useState('');
    const [isSending, startSending] = useTransition();
    const [property, setProperty] = useState<any>(null);

    const [isCooldown, setIsCooldown] = useState(false); 
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        content: string;
        templateKey?: string;
        title: string;
    }>({ isOpen: false, content: '', title: '' });

    // --- CARREGAMENTO ---
    const fetchLists = async () => {
        setIsLoadingList(true);
        try {
            const data = await getCommunicationListsAction();
            setLists(data);
            setHasMoreEnded(true); 
        } catch (error) {
            toast.error("Erro ao carregar lista.");
        } finally {
            setIsLoadingList(false);
        }
    };

    const handleLoadMoreEnded = async () => {
        if (lists.ended.length === 0) return;
        setIsLoadingMore(true);
        const lastStay = lists.ended[lists.ended.length - 1];
        try {
            const olderStays = await getOlderEndedStaysAction(lastStay.checkOutDate);
            if (olderStays.length === 0) {
                setHasMoreEnded(false);
                toast.info("Fim do histórico.");
            } else {
                setLists(prev => ({ ...prev, ended: [...prev.ended, ...olderStays] }));
            }
        } catch (error) {
            toast.error("Erro no histórico.");
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchLists();
        getProperty().then(p => setProperty(p)).catch(console.error);
    }, []);

    useEffect(() => {
        if (!selectedStayId) {
            setHistoryData(null);
            return;
        }
        const fetchDetails = async () => {
            setIsLoadingHistory(true);
            try {
                const data = await getGuestHistoryAction(selectedStayId);
                setHistoryData(data);
                setCustomMessage('');
            } catch (error) {
                toast.error("Erro ao abrir conversa.");
            } finally {
                setIsLoadingHistory(false);
            }
        };
        fetchDetails();
    }, [selectedStayId]);

    // --- LÓGICA DE FILTRO ATUALIZADA ---
    const filteredLists = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return lists;

        const filterFn = (stay: CommunicationStaySummary) => {
            // Se tiver posição, verifica se o termo de busca é igual à posição
            // Ex: busca "1" deve achar "01" ou "1"
            if (stay.cabinPosicao) {
                if (String(stay.cabinPosicao).includes(term)) return true;
            }
            // Fallback para nome da cabana e nome do hóspede
            return (stay.cabinName?.toLowerCase().includes(term) || 
                    stay.guestName?.toLowerCase().includes(term));
        };

        return {
            future: lists.future.filter(filterFn),
            current: lists.current.filter(filterFn),
            ended: lists.ended.filter(filterFn)
        };
    }, [lists, searchTerm]);


    // --- ENVIO ---
    const requestSend = (rawContent: string, templateKey?: string, title: string = "Confirmar") => {
        if (!historyData) return;
        if (isCooldown) {
            toast.warning("Aguarde...");
            return;
        }
        const processedContent = processMessageVariables(rawContent, historyData.stay, property);
        setConfirmDialog({ isOpen: true, content: processedContent, templateKey, title });
    };

    const executeSend = () => {
        if (!historyData || !user?.email) return;
        const { content, templateKey } = confirmDialog;
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        setIsCooldown(true);

        startSending(async () => {
            const guestPhone = historyData.stay.guestPhone || historyData.stay.tempGuestPhone;
            if (!guestPhone) {
                toast.error("Sem telefone.");
                setIsCooldown(false);
                return;
            }
            try {
                const result = await sendCommunicationAction({
                    phone: guestPhone,
                    message: content, 
                    guestName: historyData.stay.guestName,
                    stayId: historyData.stay.id,
                    adminEmail: user.email!,
                    templateKey
                });

                if (result.success) {
                    toast.success("Enviado!");
                    setCustomMessage('');
                    const updated = await getGuestHistoryAction(historyData.stay.id);
                    setHistoryData(updated);
                } else {
                    toast.error(result.message || "Erro.");
                }
            } catch (error) {
                toast.error("Erro conexão.");
            } finally {
                setTimeout(() => setIsCooldown(false), 5000);
            }
        });
    };

    // --- UTILS UI ---
    const formatDateFriendly = (dateStr: string) => {
        if (!dateStr) return '--';
        const date = parseISO(dateStr);
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return `Ontem ${format(date, 'HH:mm')}`;
        return format(date, "dd/MM HH:mm");
    };

    const getRawTemplate = (key: string) => property?.messages?.[key] || '';

    // --- NOVO DESIGN DO ITEM DA LISTA (ATUALIZADO PARA USAR POSICAO) ---
    const StayListItem = ({ stay }: { stay: CommunicationStaySummary }) => {
        const isSelected = selectedStayId === stay.id;
        
        // CORREÇÃO APLICADA: Usar cabinPosicao se existir, formatado com zero à esquerda
        const cabinNumberDisplay = stay.cabinPosicao 
            ? String(stay.cabinPosicao).padStart(2, '0') // 1 vira "01"
            : stay.cabinName.replace(/\D/g, '').substring(0, 3) || "?"; // Fallback apenas se falhar
        
        return (
            <div 
                onClick={() => setSelectedStayId(stay.id)}
                className={`
                    group flex items-center gap-3 p-3 border-b cursor-pointer transition-all relative
                    ${isSelected ? 'bg-blue-50/80 border-blue-200' : 'bg-white hover:bg-slate-50 border-slate-100'}
                `}
            >
                {/* CABINE - Destaque Principal usando Posição */}
                <div className={`
                    h-12 w-14 shrink-0 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm border
                    ${isSelected 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-600 transition-colors'}
                `}>
                    {cabinNumberDisplay}
                </div>

                {/* INFO */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                            {stay.guestName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide truncate max-w-[120px]">
                            {stay.cabinName}
                        </span>
                        <span className="text-[10px] text-slate-400">|</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                            {format(parseISO(stay.checkInDate), 'dd/MM')} - {format(parseISO(stay.checkOutDate), 'dd/MM')}
                        </span>
                    </div>
                </div>
                
                {isSelected && <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-600" />}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-50/50 overflow-hidden md:-m-8 -m-4"> 
            <Toaster richColors position="top-center" />
            
            {/* --- HEADER (Fixo, não encolhe) --- */}
            <header className="flex-none flex items-center justify-between px-4 py-2 bg-white border-b z-20 h-14 shadow-sm">
                <div className="flex items-center gap-2">
                    {/* Botão Voltar (Mobile) */}
                    {selectedStayId && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="md:hidden -ml-2 h-9 w-9 text-slate-600" 
                            onClick={() => setSelectedStayId(null)}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-1.5 rounded-md">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                        <h1 className="text-sm font-bold text-slate-800 hidden xs:block">
                            Comunicação
                        </h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchLists} 
                        disabled={isLoadingList}
                        className="h-8 px-2 text-xs"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingList ? 'animate-spin' : ''}`} /> 
                        <span className="hidden sm:inline">Atualizar</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuItem asChild>
                                <Link href="/admin/legacycomm" className="cursor-pointer">
                                    <Archive className="h-4 w-4 mr-2" /> Versão Legada
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* --- BODY (Ocupa o resto da tela) --- */}
            <div className="flex flex-1 overflow-hidden relative w-full">
                
                {/* --- COLUNA ESQUERDA: LISTA --- */}
                <div className={`
                    w-full md:w-80 bg-white border-r flex flex-col transition-transform duration-300 absolute inset-0 md:relative z-10
                    ${selectedStayId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
                `}>
                    
                    {/* SEARCH BAR (NOVO) */}
                    <div className="p-3 pb-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Filtrar por nº cabana..." 
                                className="pl-9 bg-slate-50 border-slate-200 h-9 text-sm focus-visible:ring-1"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                        <div className="px-2 pt-2 pb-2 border-b flex-none">
                            <TabsList className="w-full grid grid-cols-3 h-8">
                                <TabsTrigger value="future" className="text-xs px-0">Futuros</TabsTrigger>
                                <TabsTrigger value="current" className="text-xs px-0">Atuais</TabsTrigger>
                                <TabsTrigger value="ended" className="text-xs px-0">Fim</TabsTrigger>
                            </TabsList>
                        </div>
                        {/* ScrollArea Nativo com flex-1 e min-h-0 */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {isLoadingList ? (
                                <div className="p-3 space-y-2">
                                    {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                                </div>
                            ) : (
                                <div>
                                    <TabsContent value="future" className="mt-0">
                                        {filteredLists.future.length === 0 && <p className="text-center text-xs text-slate-400 py-8">Nada encontrado</p>}
                                        {filteredLists.future.map(stay => <StayListItem key={stay.id} stay={stay} />)}
                                    </TabsContent>
                                    <TabsContent value="current" className="mt-0">
                                        {filteredLists.current.length === 0 && <p className="text-center text-xs text-slate-400 py-8">Nada encontrado</p>}
                                        {filteredLists.current.map(stay => <StayListItem key={stay.id} stay={stay} />)}
                                    </TabsContent>
                                    <TabsContent value="ended" className="mt-0">
                                        {filteredLists.ended.length === 0 && <p className="text-center text-xs text-slate-400 py-8">Nada encontrado</p>}
                                        {filteredLists.ended.map(stay => <StayListItem key={stay.id} stay={stay} />)}
                                        {lists.ended.length > 0 && hasMoreEnded && !searchTerm && (
                                            <Button variant="ghost" className="w-full h-10 text-xs text-blue-600 rounded-none" onClick={handleLoadMoreEnded} disabled={isLoadingMore}>
                                                {isLoadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : "Carregar +"}
                                            </Button>
                                        )}
                                    </TabsContent>
                                </div>
                            )}
                        </div>
                    </Tabs>
                </div>

                {/* --- COLUNA DIREITA: DETALHES --- */}
                <div className={`
                    flex-1 flex flex-col bg-slate-50 absolute inset-0 md:relative z-20 md:z-0 transition-transform duration-300 md:translate-x-0
                    ${selectedStayId ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    {!selectedStayId ? (
                        <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-300">
                            <User className="h-12 w-12 mb-2 opacity-20" />
                            <p className="text-sm">Selecione um hóspede</p>
                        </div>
                    ) : isLoadingHistory ? (
                        <div className="flex items-center justify-center h-full bg-white">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    ) : historyData ? (
                        <div className="flex flex-col h-full w-full bg-white md:bg-slate-50/50">
                            
                            {/* 1. TOPO DOS DETALHES (Fixo) */}
                            <div className="flex-none px-4 py-3 bg-white border-b flex justify-between items-start shadow-sm z-10">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                                        {historyData.stay.guestName}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="text-[10px] h-5 font-normal bg-slate-100 text-slate-600">
                                            {historyData.stay.cabinName}
                                        </Badge>
                                        <span className="text-xs text-slate-500 font-mono">
                                            {historyData.stay.guestPhone || "Sem fone"}
                                        </span>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" className="h-8 px-2 border-green-200 text-green-700 bg-green-50 hover:bg-green-100 text-xs" asChild>
                                    <a href={`https://wa.me/${(historyData.stay.guestPhone || "").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                        <Zap className="h-3.5 w-3.5 mr-1" /> WhatsApp
                                    </a>
                                </Button>
                            </div>

                            {/* 2. AREA DE ROLAGEM (Flex-1 + min-h-0 + overflow-auto) */}
                            <div className="flex-1 overflow-y-auto min-h-0 p-3 bg-slate-50">
                                <div className="space-y-4 max-w-3xl mx-auto pb-4">
                                    
                                    {/* STATUS CARDS */}
                                    <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border shadow-sm">
                                        <CompactStatusCard 
                                            label="Pré-Check-in" 
                                            done={historyData.flags.preCheckInSent || historyData.stay.status === 'active'} 
                                            action={() => requestSend(getRawTemplate('whatsappPreCheckIn'), 'whatsappPreCheckIn', "Link Pré-Check-in")}
                                        />
                                        <CompactStatusCard 
                                            label="Boas-Vindas" 
                                            done={historyData.flags.welcomeSent} 
                                            action={() => requestSend(getRawTemplate('whatsappWelcome'), 'whatsappWelcome', "Boas-Vindas")}
                                        />
                                        <CompactStatusCard 
                                            label="Info Saída" 
                                            done={historyData.flags.checkoutInfoSent} 
                                            action={() => requestSend(getRawTemplate('whatsappCheckoutInfo'), 'whatsappCheckoutInfo', "Info Saída")}
                                        />
                                        <CompactStatusCard 
                                            label="Feedback" 
                                            done={historyData.flags.feedbackSent} 
                                            action={() => requestSend(getRawTemplate('whatsappFeedbackRequest'), 'whatsappFeedbackRequest', "Pedir Avaliação")}
                                        />
                                    </div>

                                    {/* WIFI */}
                                    {(historyData.stay.wifiSsid || historyData.stay.cabin?.wifiSsid) && (
                                        <div className="bg-white border rounded px-3 py-2 flex items-center justify-between text-xs shadow-sm">
                                            <div className="flex items-center gap-2 text-blue-700">
                                                <Wifi className="h-3 w-3" />
                                                <span className="font-semibold">{historyData.stay.cabin?.wifiSsid || historyData.stay.wifiSsid}</span>
                                            </div>
                                            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                                {historyData.stay.cabin?.wifiPassword || historyData.stay.wifiPassword}
                                            </code>
                                        </div>
                                    )}

                                    <Separator className="bg-slate-200" />

                                    {/* TIMELINE */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">
                                            Histórico
                                        </h3>
                                        <div className="space-y-3">
                                            {historyData.logs.length === 0 ? (
                                                <p className="text-xs text-slate-400 pl-2 italic">Sem mensagens.</p>
                                            ) : (
                                                historyData.logs.map(log => (
                                                    <div key={log.id} className="flex gap-3 px-1 group">
                                                        <div className="flex flex-col items-center">
                                                            <div className="h-2 w-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                                            <div className="w-px flex-1 bg-slate-200 my-1 group-last:hidden" />
                                                        </div>
                                                        <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm text-sm">
                                                            <div className="flex justify-between items-baseline mb-1">
                                                                <span className="text-[10px] font-bold text-blue-600 uppercase">
                                                                    {getTemplateName(log.type)}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {formatDateFriendly(log.sentAt)}
                                                                </span>
                                                            </div>
                                                            <p className="text-slate-700 text-xs whitespace-pre-wrap leading-relaxed">
                                                                {log.content}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. RODAPÉ DE ENVIO (Fixo, shrink-0) */}
                            <div className="flex-none p-3 bg-white border-t z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <div className="flex gap-2 items-end max-w-3xl mx-auto">
                                    <Textarea 
                                        placeholder="Mensagem..." 
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        className="min-h-[44px] max-h-32 resize-none bg-slate-50 text-sm py-2 focus:bg-white transition-colors"
                                        rows={1}
                                        disabled={isCooldown}
                                    />
                                    <Button 
                                        size="icon"
                                        onClick={() => requestSend(customMessage, 'custom_message', "Enviar Manual")} 
                                        disabled={!customMessage.trim() || isSending || isCooldown}
                                        className="h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-sm"
                                    >
                                        {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* MODAL DE CONFIRMAÇÃO */}
            <AlertDialog open={confirmDialog.isOpen} onOpenChange={(isOpen) => !isOpen && setConfirmDialog({ ...confirmDialog, isOpen: false })}>
                <AlertDialogContent className="w-[95%] max-w-md rounded-lg p-4 gap-4">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg">{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-xs">
                                <div className="mt-2 p-3 bg-slate-100 rounded-md text-slate-800 max-h-[40vh] overflow-y-auto whitespace-pre-wrap border border-slate-200">
                                    {confirmDialog.content}
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 justify-end sm:justify-end">
                        <AlertDialogCancel className="mt-0 text-xs h-9">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeSend} className="bg-blue-600 h-9 text-xs">
                            Enviar WhatsApp
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function CompactStatusCard({ label, done, action }: { label: string, done: boolean, action: () => void }) {
    return (
        <div className={`
            flex items-center justify-between p-2 rounded border transition-all select-none
            ${done ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}
        `}>
            <div className="flex items-center gap-2 overflow-hidden">
                {done ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                )}
                <span className={`text-xs font-medium truncate ${done ? 'text-green-800' : 'text-slate-600'}`}>
                    {label}
                </span>
            </div>
            
            {!done && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-blue-600 hover:bg-blue-100 -mr-1" 
                    onClick={(e) => { e.stopPropagation(); action(); }}
                >
                    <Send className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}

function getTemplateName(type: string) {
    const map: Record<string, string> = {
        'whatsappWelcome': 'Boas-Vindas',
        'whatsappPreCheckIn': 'Pré-Check-in',
        'whatsappFeedbackRequest': 'Feedback',
        'whatsappCheckoutInfo': 'Saída',
        'custom_message': 'Manual',
        'whatsappBookingConfirmed': 'Reserva'
    };
    return map[type] || type;
}