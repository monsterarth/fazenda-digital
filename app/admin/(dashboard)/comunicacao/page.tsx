"use client";

import React, { useState, useEffect, useMemo, useContext, useTransition } from 'react';
import { toast, Toaster } from 'sonner';
import { getProperty } from '@/app/actions/get-property';
import { logMessageCopy } from '@/app/actions/log-message-copy';
import { getActiveStaysForSelect, EnrichedStayForSelect } from '@/app/actions/get-active-stays-for-select';
import { getUpcomingCheckouts } from '@/app/actions/get-upcoming-checkouts';
import { getPendingBreakfastStays } from '@/app/actions/get-pending-breakfast-stays';
import { getRecentCheckoutsForFeedback } from '@/app/actions/get-recent-checkouts-for-feedback';
import { getActiveStaysForWelcome } from '@/app/actions/get-active-stays-for-welcome';
import { getNewBookingsForConfirmation, EnrichedBookingForSelect } from '@/app/actions/get-new-bookings-for-confirmation';
import { markCommunicationAsSent } from '@/app/actions/mark-communication-as-sent';
import { testWhatsAppConnection } from '@/app/actions/test-whatsapp-connection'; // NOVA ACTION IMPORTADA
import { Property, Stay } from '@/types';
import { format, addDays, differenceInHours, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AuthContext } from '@/context/AuthContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // IMPORTADO
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MessageSquare, Copy, X, Wand2, Phone, BedDouble, Calendar, Bell, Coffee, LogOut, Star, CheckCircle, Loader2, Handshake, CalendarCheck, Zap } from 'lucide-react';

type TipMessageType = 'feedback' | 'welcome' | 'bookingConfirmation';

interface DialogState {
    isOpen: boolean;
    stay?: EnrichedStayForSelect;
    booking?: EnrichedBookingForSelect;
    messageType?: TipMessageType;
}

type SelectableItem = (EnrichedStayForSelect | EnrichedBookingForSelect) & { guest: any; cabin: any; token?: string; };


export default function CommunicationCenterPage() {
    const auth = useContext(AuthContext);
    const [property, setProperty] = useState<Property | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [allStaysForSelect, setAllStaysForSelect] = useState<EnrichedStayForSelect[]>([]);
    const [selectedItem, setSelectedItem] = useState<SelectableItem | null>(null);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
    const [generatedMessage, setGeneratedMessage] = useState('');

    const [preCheckInMessage, setPreCheckInMessage] = useState('');

    // --- ESTADOS PARA TESTE DE WHATSAPP ---
    const [testPhone, setTestPhone] = useState('');
    const [isTestingZap, startTestZap] = useTransition();

    const [upcomingCheckouts, setUpcomingCheckouts] = useState<EnrichedStayForSelect[]>([]);
    const [pendingBreakfast, setPendingBreakfast] = useState<EnrichedStayForSelect[]>([]);
    const [recentCheckouts, setRecentCheckouts] = useState<EnrichedStayForSelect[]>([]);
    const [staysNeedingWelcome, setStaysNeedingWelcome] = useState<EnrichedStayForSelect[]>([]);
    const [newBookings, setNewBookings] = useState<EnrichedBookingForSelect[]>([]);
    const [loadingTips, setLoadingTips] = useState(true);
    const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false });

    const messageTemplates = useMemo(() => {
        if (!property) return {};
        return Object.entries(property.messages)
            .filter(([key]) => key.startsWith('whatsapp'))
            .reduce((acc, [key, value]) => { acc[key] = value; return acc; }, {} as Record<string, string>);
    }, [property]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true); setLoadingTips(true);
                const [propData, activeStaysData, checkoutsData, breakfastData, recentCheckoutsData, welcomeData, newBookingsData] = await Promise.all([
                    getProperty(), getActiveStaysForSelect(), getUpcomingCheckouts(),
                    getPendingBreakfastStays(), getRecentCheckoutsForFeedback(), getActiveStaysForWelcome(),
                    getNewBookingsForConfirmation()
                ]);
                setProperty(propData || null);
                
                const combinedStays = [...activeStaysData, ...recentCheckoutsData];
                const uniqueStays = Array.from(new Map(combinedStays.map(stay => [stay.id, stay])).values());
                
                const sortedStays = uniqueStays.sort((a, b) => 
                    a.cabin.name.localeCompare(b.cabin.name)
                );
                
                setAllStaysForSelect(sortedStays);

                setUpcomingCheckouts(checkoutsData); setPendingBreakfast(breakfastData);
                setRecentCheckouts(recentCheckoutsData); setStaysNeedingWelcome(welcomeData);
                setNewBookings(newBookingsData);
            } catch (error) {
                console.error("Erro ao carregar os dados:", error);
                toast.error('Falha ao carregar dados iniciais.');
            } finally {
                setIsLoading(false); setLoadingTips(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedItem || !selectedTemplateKey || !property) { setGeneratedMessage(''); return; }
        let template = messageTemplates[selectedTemplateKey] || '';
        const getFirstName = (fullName: string) => {
            if (!fullName) return ''; const firstName = fullName.split(' ')[0];
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        };

        const stayToken = 'token' in selectedItem ? selectedItem.token : ('stayId' in selectedItem ? allStaysForSelect.find(s => s.id === selectedItem.stayId)?.token : '');

        const portalLink = `https://portal.fazendadorosa.com.br/?token=${stayToken}`;
        const wifiSsid = selectedItem.cabin?.wifiSsid || 'Não informado';
        const wifiPassword = selectedItem.cabin?.wifiPassword || 'Não informado';
        const feedbackLink = `https://portal.fazendadorosa.com.br/s/${property.defaultSurveyId || 'default_survey'}?token=${stayToken}`;
        const tomorrow = addDays(new Date(), 1); const nextDate = format(tomorrow, 'dd/MM');
        const breakfastType = property.breakfast?.type;
        const newModality = breakfastType === 'on-site' ? 'servido no salão' : 'entregue em cesta';
        const newLocation = breakfastType === 'on-site' ? 'Salão Mayam' : 'sua cabana';
        const checkoutTime = '11:00';

        const serviceName = 'structureName' in selectedItem ? selectedItem.structureName : '';
        const serviceDate = 'date' in selectedItem ? format(new Date(selectedItem.date.replace(/-/g, '/')), 'dd/MM/yyyy') : '';
        const serviceTime = 'startTime' in selectedItem ? selectedItem.startTime : '';

        let serviceDuration = '';
        if ('startTime' in selectedItem && 'endTime' in selectedItem && selectedItem.startTime && selectedItem.endTime) {
            try {
                const baseDate = new Date();
                const start = parse(selectedItem.startTime, 'HH:mm', baseDate);
                const end = parse(selectedItem.endTime, 'HH:mm', baseDate);
                const durationInHours = differenceInHours(end, start);
                
                if (durationInHours > 0) {
                    serviceDuration = `${durationInHours} hora${durationInHours > 1 ? 's' : ''}`;
                }
            } catch (e) {
                console.error("Erro ao calcular a duração do serviço:", e);
            }
        }

        const replacements: { [key: string]: string | undefined } = {
            '{guestName}': getFirstName(selectedItem.guest?.name), '{portalLink}': portalLink, '{wifiSsid}': wifiSsid,
            '{wifiPassword}': wifiPassword, '{feedbackLink}': feedbackLink, '{date}': nextDate,
            '{newModality}': newModality, '{newLocation}': newLocation, '{checkoutTime}': checkoutTime,
            '{propertyName}': property.name, '{cabinName}': selectedItem.cabin?.name,
            '{token}': stayToken, '{deadline}': property?.breakfast?.orderingEndTime || '',
            '{serviceName}': serviceName, '{serviceDate}': serviceDate, '{serviceTime}': serviceTime,
            '{serviceDuration}': serviceDuration,
        };

        Object.entries(replacements).forEach(([key, value]) => {
            if (value !== undefined) template = template.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value);
        });
        setGeneratedMessage(template);
    }, [selectedItem, selectedTemplateKey, property, messageTemplates, allStaysForSelect]);

    const handleGeneratePreCheckIn = () => {
        if (!property || !messageTemplates.whatsappPreCheckIn) {
            toast.error("Template de mensagem de pré-check-in não encontrado.");
            return;
        }

        let template = messageTemplates.whatsappPreCheckIn;
        const preCheckInLink = 'https://portal.fazendadorosa.com.br/pre-check-in'; 
        
        template = template.replace(/{preCheckInLink}/g, preCheckInLink);
        
        setPreCheckInMessage(template);
        toast.success("Mensagem de pré-check-in gerada!");
    };

    const handleCopyPreCheckIn = async () => {
        if (!preCheckInMessage) return;
        try {
            await navigator.clipboard.writeText(preCheckInMessage);
            toast.success('Mensagem copiada para a área de transferência!');
            if (auth?.user?.uid) {
                await logMessageCopy({
                    guestName: 'N/A (Pré-Check-in)', type: 'Pré-Check-in',
                    content: preCheckInMessage, actor: auth.user.uid,
                });
            }
        } catch (error) {
            toast.error('Falha ao copiar a mensagem.');
        }
    };

    // --- FUNÇÃO DE TESTE WHATSAPP ---
    const handleTestWhatsApp = () => {
        if (!testPhone) {
            toast.error("Digite um número para testar.");
            return;
        }
        startTestZap(async () => {
            const result = await testWhatsAppConnection(testPhone);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        });
    };

    const handleStaySelect = (stayId: string) => {
        const findStay = allStaysForSelect.find(s => s.id === stayId);
        setSelectedItem(findStay || null);
    };

    const handleGenerateFromTip = (item: SelectableItem, templateKey: string) => {
        setSelectedItem(item);
        setSelectedTemplateKey(templateKey);
        toast.info(`Mensagem para ${item.guest.name} pré-selecionada.`);
    };

    const handleClearSelection = () => {
        setSelectedItem(null); setSelectedTemplateKey(''); setGeneratedMessage('');
    };

    const handleOpenMarkAsSentDialog = (item: EnrichedStayForSelect | EnrichedBookingForSelect, messageType: TipMessageType) => {
        if (messageType === 'bookingConfirmation') {
            setDialogState({ isOpen: true, booking: item as EnrichedBookingForSelect, messageType });
        } else {
            setDialogState({ isOpen: true, stay: item as EnrichedStayForSelect, messageType });
        }
    };
    
    const handleConfirmMarkAsSent = () => {
        const { stay, booking, messageType } = dialogState;
        if (!messageType || (!stay && !booking)) {
            toast.error("Ocorreu um erro. Tente novamente."); return;
        }
        
        startTransition(async () => {
            const result = await markCommunicationAsSent({ messageType, stayId: stay?.id, bookingId: booking?.id });

            if (result.success) {
                toast.success("Mensagem marcada como enviada!");
                if (messageType === 'feedback') setRecentCheckouts(prev => prev.filter(s => s.id !== stay?.id));
                else if (messageType === 'welcome') setStaysNeedingWelcome(prev => prev.filter(s => s.id !== stay?.id));
                else if (messageType === 'bookingConfirmation') setNewBookings(prev => prev.filter(b => b.id !== booking?.id));
            } else {
                toast.error("Falha ao marcar como enviada.", { description: result.error });
            }
            setDialogState({ isOpen: false });
        });
    };

    const handleCopyToClipboard = async () => {
        if (!generatedMessage || !selectedItem || !selectedTemplateKey || !auth?.user?.uid) {
            if (!auth?.user?.uid) toast.error("Erro de autenticação."); return;
        }
        try {
            await navigator.clipboard.writeText(generatedMessage);
            toast.success('Mensagem copiada para a área de transferência!');
            await logMessageCopy({
                guestName: selectedItem.guest.name, type: getTemplateLabel(selectedTemplateKey),
                content: generatedMessage, actor: auth.user.uid,
            });
        } catch (error) {
            toast.error('Falha ao copiar ou registrar a mensagem.');
        }
    };

    const getTemplateLabel = (key: string) => {
        const labels: { [key: string]: string } = {
            'whatsappPreCheckIn': 'Pré-Check-in', 'whatsappWelcome': 'Boas-Vindas',
            'whatsappBreakfastReminder': 'Lembrete de Café', 'whatsappCheckoutInfo': 'Info de Check-out',
            'whatsappFeedbackRequest': 'Pedido de Avaliação', 'whatsappBookingConfirmed': 'Confirmação de Reserva',
            'whatsappRequestReceived': 'Confirmação de Pedido', 'whatsappEventInvite': 'Convite para Evento',
            'whatsappBreakfastChange': 'Alteração no Café',
        };
        return labels[key] || key;
    };

    if (isLoading || auth?.loading) {
        return <div className="container mx-auto p-4 md:p-6 space-y-6"> <Skeleton className="h-12 w-1/2" /> <Skeleton className="h-8 w-3/4" /> <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> <div className="md:col-span-2 space-y-4"><Skeleton className="h-64 w-full" /></div> <div><Skeleton className="h-64 w-full" /></div> </div> </div>;
    }
    
    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"> <MessageSquare className="h-8 w-8 text-primary" /> Centro de Comunicação </h1>
                    <p className="text-muted-foreground">Gere e envie mensagens personalizadas para seus hóspedes.</p>
                </div>
            </div>

            {/* --- ÁREA DE DIAGNÓSTICO DO WHATSAPP --- */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                        <Zap className="h-4 w-4 fill-blue-800" /> Diagnóstico do WhatsApp (Synapse Gateway)
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Número de Teste (com DDD)</label>
                        <Input 
                            placeholder="Ex: 31999999999" 
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                    <Button onClick={handleTestWhatsApp} disabled={isTestingZap} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {isTestingZap ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle className="h-4 w-4 mr-2"/>}
                        Testar Envio
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerador de Mensagens</CardTitle>
                            <CardDescription> {selectedItem ? `Gerando mensagem para ${selectedItem.guest?.name}` : 'Selecione uma estadia ou use uma dica proativa.'} </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={selectedItem ? 'hidden' : 'block'}>
                                <Select onValueChange={handleStaySelect}>
                                    <SelectTrigger className="text-base h-12"> <SelectValue placeholder="Selecione uma estadia..." /> </SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto">
                                        {allStaysForSelect.length > 0 ? allStaysForSelect.map((stay) => ( <SelectItem key={stay.id} value={stay.id}> <span className='font-semibold'>{stay.cabin.name}:</span> <span className='text-muted-foreground ml-2'>{stay.guest.name} - {stay.status === 'active' ? 'Ativa' : 'Encerrada'}</span> </SelectItem> )) : ( <div className='p-4 text-center text-sm text-muted-foreground'>Nenhuma estadia encontrada.</div> )}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {selectedItem && ( <div className="space-y-4"> <Card className="bg-muted/50"> <CardContent className="p-4 space-y-2"> <div className="flex justify-between items-start"> <div> <p className="font-bold text-lg">{selectedItem.guest?.name}</p> <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1"> <span className="flex items-center gap-1.5"><Phone size={14} /> {selectedItem.guest?.phone}</span> <span className="flex items-center gap-1.5"><BedDouble size={14} /> {selectedItem.cabin?.name}</span> </div> </div> <Button variant="ghost" size="icon" onClick={handleClearSelection}><X className="h-5 w-5" /></Button> </div> {'checkInDate' in selectedItem && <div className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1"> <Calendar size={14} /> {format(new Date(selectedItem.checkInDate), 'dd/MM/yyyy')} até {format(new Date(selectedItem.checkOutDate), 'dd/MM/yyyy')} </div> } </CardContent> </Card> <Select value={selectedTemplateKey} onValueChange={(v) => setSelectedTemplateKey(v)}> <SelectTrigger><SelectValue placeholder="Selecione o tipo de mensagem..." /></SelectTrigger> <SelectContent> {Object.keys(messageTemplates).filter(key => key !== 'whatsappPreCheckIn').map(key => ( <SelectItem key={key} value={key}>{getTemplateLabel(key)}</SelectItem> ))} </SelectContent> </Select> <Textarea value={generatedMessage} readOnly placeholder="A mensagem gerada aparecerá aqui..." rows={8} className="text-base leading-relaxed" /> <Button onClick={handleCopyToClipboard} disabled={!generatedMessage}><Copy className="mr-2 h-4 w-4" /> Copiar Mensagem</Button> </div> )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Envio Rápido: Pré-Check-in</CardTitle>
                            <CardDescription>
                                Envie o link de pré-check-in para hóspedes que ainda não têm uma reserva ativa no sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea 
                                value={preCheckInMessage} 
                                readOnly 
                                placeholder="Clique em 'Gerar' para criar a mensagem de pré-check-in..." 
                                rows={4}
                                className="text-base leading-relaxed" 
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleGeneratePreCheckIn} className="flex-1">
                                    <Wand2 className="mr-2 h-4 w-4" /> Gerar Mensagem
                                </Button>
                                <Button 
                                    onClick={handleCopyPreCheckIn} 
                                    disabled={!preCheckInMessage} 
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    <Copy className="mr-2 h-4 w-4" /> Copiar Mensagem
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Wand2 className="text-amber-500" /> Dicas Proativas</CardTitle>
                            <CardDescription>Oportunidades de comunicação para encantar seus hóspedes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingTips ? <Skeleton className="h-24 w-full" /> : ( <> {newBookings.length === 0 && staysNeedingWelcome.length === 0 && pendingBreakfast.length === 0 && upcomingCheckouts.length === 0 && recentCheckouts.length === 0 && <Alert> <Bell className="h-4 w-4" /> <AlertTitle>Tudo em dia!</AlertTitle> <AlertDescription>Nenhuma ação proativa sugerida no momento.</AlertDescription> </Alert> } {newBookings.map(booking => ( <div key={booking.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors"> <div className="space-y-2"> <p className="font-semibold text-sm flex items-center gap-2"><CalendarCheck size={14} className='text-blue-600'/> Nova Reserva</p> <p className="text-xs text-muted-foreground"> Confirmar reserva de <strong>{booking.structureName}</strong> para <strong>{booking.guest.name}</strong> ({booking.cabin.name}). </p> <div className="flex items-center gap-2 pt-1"> <Button size="sm" className="flex-1" variant="outline" onClick={() => handleGenerateFromTip(booking, 'whatsappBookingConfirmed')}>Gerar</Button> <Button size="sm" className="flex-1" variant="secondary" onClick={() => handleOpenMarkAsSentDialog(booking, 'bookingConfirmation')}> <CheckCircle size={14} className="mr-1.5"/> Marcar </Button> </div> </div> </div> ))} {staysNeedingWelcome.map(stay => ( <div key={stay.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors"> <div className="space-y-2"> <p className="font-semibold text-sm flex items-center gap-2"><Handshake size={14} className='text-green-600'/> Boas-Vindas</p> <p className="text-xs text-muted-foreground"> Enviar mensagem para <strong>{stay.guest.name}</strong> ({stay.cabin.name}). </p> <div className="flex items-center gap-2 pt-1"> <Button size="sm" className="flex-1" variant="outline" onClick={() => handleGenerateFromTip(stay, 'whatsappWelcome')}>Gerar</Button> <Button size="sm" className="flex-1" variant="secondary" onClick={() => handleOpenMarkAsSentDialog(stay, 'welcome')}> <CheckCircle size={14} className="mr-1.5"/> Marcar </Button> </div> </div> </div> ))} {recentCheckouts.map(stay => ( <div key={stay.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors"> <div className="space-y-2"> <p className="font-semibold text-sm flex items-center gap-2"><Star size={14} className='text-yellow-500'/> Pedido de Avaliação</p> <p className="text-xs text-muted-foreground"> Enviar pesquisa para <strong>{stay.guest.name}</strong> ({stay.cabin.name}). </p> <div className="flex items-center gap-2 pt-1"> <Button size="sm" className="flex-1" variant="outline" onClick={() => handleGenerateFromTip(stay, 'whatsappFeedbackRequest')}>Gerar</Button> <Button size="sm" className="flex-1" variant="secondary" onClick={() => handleOpenMarkAsSentDialog(stay, 'feedback')}> <CheckCircle size={14} className="mr-1.5"/> Marcar </Button> </div> </div> </div> ))} {pendingBreakfast.map(stay => ( <div key={stay.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors"> <div className="flex items-start justify-between"> <div className="space-y-1"> <p className="font-semibold text-sm flex items-center gap-2"><Coffee size={14} className='text-amber-600'/> Café da Manhã Pendente</p> <p className="text-xs text-muted-foreground"> Lembrar <strong>{stay.guest.name}</strong> ({stay.cabin.name}) de pedir o café para amanhã. </p> </div> <Button size="sm" variant="outline" onClick={() => handleGenerateFromTip(stay, 'whatsappBreakfastReminder')}>Gerar</Button> </div> </div> ))} {upcomingCheckouts.map(stay => ( <div key={stay.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors"> <div className="flex items-start justify-between"> <div className="space-y-1"> <p className="font-semibold text-sm flex items-center gap-2"><LogOut size={14} className='text-blue-600'/> Check-out Amanhã</p> <p className="text-xs text-muted-foreground"> Enviar infos de check-out para <strong>{stay.guest.name}</strong> ({stay.cabin.name}). </p> </div> <Button size="sm" variant="outline" onClick={() => handleGenerateFromTip(stay, 'whatsappCheckoutInfo')}>Gerar</Button> </div> </div> ))} </> )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={dialogState.isOpen} onOpenChange={(isOpen) => setDialogState({ ...dialogState, isOpen })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a marcar a mensagem para <strong>{dialogState.stay?.guest.name || dialogState.booking?.guest.name}</strong> como enviada. 
                            Esta operação não pode ser desfeita. Tenha certeza de que a mensagem foi de fato enviada antes de confirmar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDialogState({ isOpen: false })}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmMarkAsSent} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}