// app/admin/(dashboard)/comunicacao/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useContext, useTransition } from 'react';
import { toast, Toaster } from 'sonner';
import { getProperty } from '@/app/actions/get-property';
import { logMessageCopy } from '@/app/actions/log-message-copy';
import { getActiveStaysForSelect, EnrichedStayForSelect } from '@/app/actions/get-active-stays-for-select';
import { getUpcomingCheckouts } from '@/app/actions/get-upcoming-checkouts';
import { getPendingBreakfastStays } from '@/app/actions/get-pending-breakfast-stays';
import { getRecentCheckoutsForFeedback } from '@/app/actions/get-recent-checkouts-for-feedback';
import { getActiveStaysForWelcome } from '@/app/actions/get-active-stays-for-welcome'; // NOVO
import { markCommunicationAsSent } from '@/app/actions/mark-communication-as-sent';
import { Property } from '@/types';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AuthContext } from '@/context/AuthContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MessageSquare, Copy, X, Wand2, Phone, BedDouble, Calendar, Bell, Coffee, LogOut, Star, CheckCircle, Loader2, Handshake } from 'lucide-react'; // NOVO ÍCONE

type TipMessageType = 'feedback' | 'welcome';

interface DialogState {
    isOpen: boolean;
    stay?: EnrichedStayForSelect;
    messageType?: TipMessageType;
}

export default function CommunicationCenterPage() {
    const auth = useContext(AuthContext);
    const [property, setProperty] = useState<Property | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [allStaysForSelect, setAllStaysForSelect] = useState<EnrichedStayForSelect[]>([]);
    const [selectedStay, setSelectedStay] = useState<EnrichedStayForSelect | null>(null);
    const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('');
    const [generatedMessage, setGeneratedMessage] = useState('');

    // Estados para as dicas
    const [upcomingCheckouts, setUpcomingCheckouts] = useState<EnrichedStayForSelect[]>([]);
    const [pendingBreakfast, setPendingBreakfast] = useState<EnrichedStayForSelect[]>([]);
    const [recentCheckouts, setRecentCheckouts] = useState<EnrichedStayForSelect[]>([]);
    const [staysNeedingWelcome, setStaysNeedingWelcome] = useState<EnrichedStayForSelect[]>([]); // NOVO ESTADO
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
                const [propData, activeStaysData, checkoutsData, breakfastData, recentCheckoutsData, welcomeData] = await Promise.all([
                    getProperty(), getActiveStaysForSelect(), getUpcomingCheckouts(),
                    getPendingBreakfastStays(), getRecentCheckoutsForFeedback(), getActiveStaysForWelcome() // CHAMADA DA NOVA ACTION
                ]);
                setProperty(propData || null);
                
                const combinedStays = [...activeStaysData, ...recentCheckoutsData];
                const uniqueStays = Array.from(new Map(combinedStays.map(stay => [stay.id, stay])).values());
                const sortedStays = uniqueStays.sort((a, b) => a.guest.name.localeCompare(b.guest.name));
                setAllStaysForSelect(sortedStays);

                setUpcomingCheckouts(checkoutsData); setPendingBreakfast(breakfastData);
                setRecentCheckouts(recentCheckoutsData); setStaysNeedingWelcome(welcomeData); // SALVA OS DADOS NO ESTADO
            } catch (error) {
                toast.error('Falha ao carregar dados iniciais.'); console.error(error);
            } finally {
                setIsLoading(false); setLoadingTips(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedStay || !selectedTemplateKey || !property) { setGeneratedMessage(''); return; }
        let template = messageTemplates[selectedTemplateKey] || '';
        const getFirstName = (fullName: string) => {
            if (!fullName) return ''; const firstName = fullName.split(' ')[0];
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        };
        const portalLink = `https://portal.fazendadorosa.com.br/?token=${selectedStay.token}`;
        const wifiSsid = selectedStay.cabin?.wifiSsid || 'Não informado';
        const wifiPassword = selectedStay.cabin?.wifiPassword || 'Não informado';
        const feedbackLink = `https://portal.fazendadorosa.com.br/s/${property.defaultSurveyId || 'default_survey'}?token=${selectedStay.token}`;
        const tomorrow = addDays(new Date(), 1); const nextDate = format(tomorrow, 'dd/MM');
        const breakfastType = property.breakfast?.type;
        const newModality = breakfastType === 'on-site' ? 'servido no salão' : 'entregue em cesta';
        const newLocation = breakfastType === 'on-site' ? 'Salão Mayam' : 'sua cabana';
        const checkoutTime = '11:00';
        const replacements: { [key: string]: string | undefined } = {
            '{guestName}': getFirstName(selectedStay.guest?.name), '{portalLink}': portalLink, '{wifiSsid}': wifiSsid,
            '{wifiPassword}': wifiPassword, '{feedbackLink}': feedbackLink, '{date}': nextDate,
            '{newModality}': newModality, '{newLocation}': newLocation, '{checkoutTime}': checkoutTime,
            '{propertyName}': property.name, '{cabinName}': selectedStay.cabin?.name,
            '{token}': selectedStay.token, '{deadline}': property?.breakfast?.orderingEndTime || '',
        };
        Object.entries(replacements).forEach(([key, value]) => {
            if (value !== undefined) template = template.replace(new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value);
        });
        setGeneratedMessage(template);
    }, [selectedStay, selectedTemplateKey, property, messageTemplates]);

    const handleStaySelect = (stayId: string) => {
        const findStay = allStaysForSelect.find(s => s.id === stayId);
        setSelectedStay(findStay || null);
    };

    const handleGenerateFromTip = (stay: EnrichedStayForSelect, templateKey: string) => {
        setSelectedStay(stay); setSelectedTemplateKey(templateKey);
        toast.info(`Mensagem para ${stay.guest.name} pré-selecionada.`);
    };

    const handleClearSelection = () => {
        setSelectedStay(null); setSelectedTemplateKey(''); setGeneratedMessage('');
    };

    const handleOpenMarkAsSentDialog = (stay: EnrichedStayForSelect, messageType: TipMessageType) => {
        setDialogState({ isOpen: true, stay, messageType });
    };
    
    const handleConfirmMarkAsSent = () => {
        if (!dialogState.stay || !dialogState.messageType) { toast.error("Ocorreu um erro. Tente novamente."); return; }
        
        startTransition(async () => {
            const result = await markCommunicationAsSent({
                stayId: dialogState.stay!.id,
                messageType: dialogState.messageType!
            });

            if (result.success) {
                toast.success("Mensagem marcada como enviada!");
                // Remove a dica da UI instantaneamente com base no tipo
                if (dialogState.messageType === 'feedback') {
                    setRecentCheckouts(prev => prev.filter(s => s.id !== dialogState.stay?.id));
                } else if (dialogState.messageType === 'welcome') {
                    setStaysNeedingWelcome(prev => prev.filter(s => s.id !== dialogState.stay?.id));
                }
            } else {
                toast.error("Falha ao marcar como enviada.", { description: result.error });
            }
            setDialogState({ isOpen: false });
        });
    };

    const handleCopyToClipboard = async () => {
        if (!generatedMessage || !selectedStay || !selectedTemplateKey || !auth?.user?.uid) {
            if (!auth?.user?.uid) toast.error("Erro de autenticação."); return;
        }
        try {
            await navigator.clipboard.writeText(generatedMessage);
            toast.success('Mensagem copiada para a área de transferência!');
            await logMessageCopy({
                guestName: selectedStay.guest.name, type: getTemplateLabel(selectedTemplateKey),
                content: generatedMessage, actor: auth.user.uid,
            });
        } catch (error) {
            toast.error('Falha ao copiar ou registrar a mensagem.'); console.error('Failed to copy or log message:', error);
        }
    };

    const getTemplateLabel = (key: string) => {
        const labels: { [key: string]: string } = {
            'whatsappPreCheckIn': 'Pré-Check-in', 'whatsappWelcome': 'Boas-Vindas',
            'whatsappBreakfastReminder': 'Lembrete de Café da Manhã', 'whatsappCheckoutInfo': 'Informações de Check-out',
            'whatsappFeedbackRequest': 'Pedido de Avaliação', 'whatsappBookingConfirmed': 'Confirmação de Agendamento',
            'whatsappRequestReceived': 'Confirmação de Pedido', 'whatsappEventInvite': 'Convite para Evento',
            'whatsappBreakfastChange': 'Alteração no Café da Manhã',
        };
        return labels[key] || key;
    };

    if (isLoading || auth?.loading) {
        return (
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                <Skeleton className="h-12 w-1/2" /> <Skeleton className="h-8 w-3/4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4"><Skeleton className="h-64 w-full" /></div>
                    <div><Skeleton className="h-64 w-full" /></div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <MessageSquare className="h-8 w-8 text-primary" /> Centro de Comunicação
                </h1>
                <p className="text-muted-foreground">Gere e envie mensagens personalizadas para seus hóspedes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerador de Mensagens</CardTitle>
                            <CardDescription>
                                {selectedStay ? `Gerando mensagem para ${selectedStay.guest?.name}` : 'Selecione uma estadia ou use uma dica proativa.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={selectedStay ? 'hidden' : 'block'}>
                                <Select onValueChange={handleStaySelect}>
                                    <SelectTrigger className="text-base h-12">
                                        <SelectValue placeholder="Selecione uma estadia..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allStaysForSelect.length > 0 ? allStaysForSelect.map((stay) => (
                                            <SelectItem key={stay.id} value={stay.id}>
                                                <span className='font-semibold'>{stay.guest.name}</span>
                                                <span className='text-muted-foreground ml-2'>({stay.cabin.name}) - {stay.status === 'active' ? 'Ativa' : 'Encerrada'}</span>
                                            </SelectItem>
                                        )) : ( <div className='p-4 text-center text-sm text-muted-foreground'>Nenhuma estadia encontrada.</div> )}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {selectedStay && (
                                <div className="space-y-4">
                                    <Card className="bg-muted/50">
                                        <CardContent className="p-4 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-lg">{selectedStay.guest?.name}</p>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                                        <span className="flex items-center gap-1.5"><Phone size={14} /> {selectedStay.guest?.phone}</span>
                                                        <span className="flex items-center gap-1.5"><BedDouble size={14} /> {selectedStay.cabin?.name}</span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={handleClearSelection}><X className="h-5 w-5" /></Button>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
                                                 <Calendar size={14} />
                                                 {format(new Date(selectedStay.checkInDate), 'dd/MM/yyyy')} até {format(new Date(selectedStay.checkOutDate), 'dd/MM/yyyy')}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Select value={selectedTemplateKey} onValueChange={(v) => setSelectedTemplateKey(v)}>
                                        <SelectTrigger><SelectValue placeholder="Selecione o tipo de mensagem..." /></SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(messageTemplates).map(key => (
                                                <SelectItem key={key} value={key}>{getTemplateLabel(key)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Textarea value={generatedMessage} readOnly placeholder="A mensagem gerada aparecerá aqui..." rows={8} className="text-base leading-relaxed" />
                                    <Button onClick={handleCopyToClipboard} disabled={!generatedMessage}><Copy className="mr-2 h-4 w-4" /> Copiar Mensagem</Button>
                                </div>
                            )}
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
                            {loadingTips ? <Skeleton className="h-24 w-full" /> : (
                                <>
                                    {staysNeedingWelcome.length === 0 && pendingBreakfast.length === 0 && upcomingCheckouts.length === 0 && recentCheckouts.length === 0 &&
                                        <Alert>
                                            <Bell className="h-4 w-4" />
                                            <AlertTitle>Tudo em dia!</AlertTitle>
                                            <AlertDescription>Nenhuma ação proativa sugerida no momento.</AlertDescription>
                                        </Alert>
                                    }

                                    {/* DICA: MENSAGEM DE BOAS VINDAS */}
                                    {staysNeedingWelcome.map(stay => (
                                        <div key={stay.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors">
                                            <div className="space-y-2">
                                                <p className="font-semibold text-sm flex items-center gap-2"><Handshake size={14} className='text-green-600'/> Boas-Vindas</p>
                                                <p className="text-xs text-muted-foreground"> Enviar mensagem para <strong>{stay.guest.name}</strong> ({stay.cabin.name}). </p>
                                                <div className="flex items-center gap-2 pt-1">
                                                     <Button size="sm" className="flex-1" variant="outline" onClick={() => handleGenerateFromTip(stay, 'whatsappWelcome')}>Gerar</Button>
                                                     <Button size="sm" className="flex-1" variant="secondary" onClick={() => handleOpenMarkAsSentDialog(stay, 'welcome')}>
                                                        <CheckCircle size={14} className="mr-1.5"/> Marcar
                                                     </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* DICA: PEDIDO DE AVALIAÇÃO */}
                                    {recentCheckouts.map(stay => (
                                        <div key={stay.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors">
                                            <div className="space-y-2">
                                                <p className="font-semibold text-sm flex items-center gap-2"><Star size={14} className='text-yellow-500'/> Pedido de Avaliação</p>
                                                <p className="text-xs text-muted-foreground"> Enviar pesquisa para <strong>{stay.guest.name}</strong> ({stay.cabin.name}). </p>
                                                <div className="flex items-center gap-2 pt-1">
                                                     <Button size="sm" className="flex-1" variant="outline" onClick={() => handleGenerateFromTip(stay, 'whatsappFeedbackRequest')}>Gerar</Button>
                                                     <Button size="sm" className="flex-1" variant="secondary" onClick={() => handleOpenMarkAsSentDialog(stay, 'feedback')}>
                                                        <CheckCircle size={14} className="mr-1.5"/> Marcar
                                                     </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* DICA: CAFÉ PENDENTE */}
                                    {pendingBreakfast.map(stay => (
                                        <div key={stay.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-sm flex items-center gap-2"><Coffee size={14} className='text-amber-600'/> Café da Manhã Pendente</p>
                                                    <p className="text-xs text-muted-foreground"> Lembrar <strong>{stay.guest.name}</strong> ({stay.cabin.name}) de pedir o café para amanhã. </p>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => handleGenerateFromTip(stay, 'whatsappBreakfastReminder')}>Gerar</Button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* DICA: CHECK-OUT AMANHÃ */}
                                     {upcomingCheckouts.map(stay => (
                                        <div key={stay.id} className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-sm flex items-center gap-2"><LogOut size={14} className='text-blue-600'/> Check-out Amanhã</p>
                                                    <p className="text-xs text-muted-foreground"> Enviar infos de check-out para <strong>{stay.guest.name}</strong> ({stay.cabin.name}). </p>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => handleGenerateFromTip(stay, 'whatsappCheckoutInfo')}>Gerar</Button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={dialogState.isOpen} onOpenChange={(isOpen) => setDialogState({ ...dialogState, isOpen })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a marcar a mensagem para <strong>{dialogState.stay?.guest.name}</strong> como enviada. 
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