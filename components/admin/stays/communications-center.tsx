"use client";

import React from 'react';
import { Stay, Cabin, Property, BreakfastOrder, MessageLog } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Firestore, doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ClipboardCopy, MessageSquarePlus, Wind, Coffee, Star, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

interface CommunicationsCenterProps {
    db: Firestore | null;
    activeStays: Stay[];
    checkedOutStays: Stay[];
    breakfastOrders: BreakfastOrder[];
    cabins: Cabin[];
    property?: Property;
}

export function CommunicationsCenter({ db, activeStays, checkedOutStays, breakfastOrders, cabins, property }: CommunicationsCenterProps) {
    const { user } = useAuth();

    const handleCopyToClipboard = async (message: string, logData?: Omit<MessageLog, 'id' | 'copiedAt' | 'actor' | 'content'>) => {
        if (!message) {
            toast.error("O modelo desta mensagem está vazio. Edite-o nas configurações de 'Aparência e Textos'.");
            return;
        }

        try {
            await navigator.clipboard.writeText(message);
            toast.success("Mensagem copiada para a área de transferência!");

            if (logData && db && user?.email) {
                await addDoc(collection(db, "messageLogs"), {
                    ...logData,
                    content: message,
                    actor: user.email,
                    copiedAt: serverTimestamp(),
                });
            }
        } catch (error) {
            toast.error("Erro ao interagir com a área de transferência ou salvar histórico.");
            console.error("Clipboard/Firestore Error:", error);
        }
    };

    const handleMarkAsSent = async (stayId: string, messageType: 'welcome' | 'feedback') => {
        if (!db) {
            toast.error("Conexão com o banco de dados perdida.");
            return;
        }
        const stayRef = doc(db, 'stays', stayId);
        const fieldToUpdate = messageType === 'welcome' 
            ? 'communicationStatus.welcomeMessageSentAt' 
            : 'communicationStatus.feedbackMessageSentAt';
        
        try {
            await updateDoc(stayRef, { [fieldToUpdate]: serverTimestamp() });
            toast.info(`Mensagem de ${messageType === 'welcome' ? 'boas-vindas' : 'feedback'} marcada como enviada.`);
        } catch (error) {
            toast.error("Erro ao marcar a mensagem como enviada.");
        }
    };

    const copyAndMark = (message: string, stay: Stay, type: 'welcome' | 'feedback') => {
        const logData = { stayId: stay.id, guestName: stay.guestName, type };
        handleCopyToClipboard(message, logData);
        handleMarkAsSent(stay.id, type);
    };

    const staysAwaitingWelcome = activeStays.filter(s => !s.communicationStatus?.welcomeMessageSentAt);
    const staysForFeedback = checkedOutStays.filter(s => !s.communicationStatus?.feedbackMessageSentAt);

    const isBreakfastReminderNeeded = (stay: Stay) => {
        if (property?.breakfast?.type !== 'delivery') return false;
        
        const deadlineHour = parseInt((property.breakfast.orderingEndTime || "20:00").split(':')[0]);
        const deadlineMinute = parseInt((property.breakfast.orderingEndTime || "20:00").split(':')[1]);
        const now = new Date();
        const deadline = new Date();
        deadline.setHours(deadlineHour, deadlineMinute, 0, 0);

        const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (now > deadline || hoursRemaining > 2) return false;
        
        const deliveryDateForOrder = new Date();
        if (now.getHours() >= deadlineHour) {
            deliveryDateForOrder.setDate(deliveryDateForOrder.getDate() + 1);
        }
        const deliveryDateStr = format(deliveryDateForOrder, 'yyyy-MM-dd');
        const hasOrdered = breakfastOrders.some(order => order.stayId === stay.id && order.deliveryDate === deliveryDateStr);

        return !hasOrdered;
    };
    const staysForBreakfastReminder = activeStays.filter(isBreakfastReminderNeeded);

    const getMessage = (type: 'pre-check-in' | 'welcome' | 'breakfast' | 'feedback', stay?: Stay): string => {
        let template = '';
        const replacements: { [key: string]: string } = {
            '{propertyName}': property?.name || '',
            '{guestName}': stay?.guestName || '',
            '{token}': stay?.token || '',
            '{portalLink}': stay ? `${window.location.origin}/?token=${stay.token}` : '',
            '{preCheckInLink}': stay ? `${window.location.origin}/pre-check-in?stayId=${stay.id}` : '[Link]',
            '{deadline}': property?.breakfast?.orderingEndTime || '20:00',
            '{feedbackLink}': property?.contact?.googleMapsLink || '[Link de Avaliação]',
        };
        const cabin = cabins.find(c => c.id === stay?.cabinId);
        replacements['{wifiSsid}'] = cabin?.wifiSsid || '';
        replacements['{wifiPassword}'] = cabin?.wifiPassword || '';

        switch (type) {
            case 'pre-check-in': template = property?.messages?.whatsappPreCheckIn || ''; break;
            case 'welcome': template = property?.messages?.whatsappWelcome || ''; break;
            case 'breakfast': template = property?.messages?.whatsappBreakfastReminder || ''; break;
            case 'feedback': template = property?.messages?.whatsappFeedbackRequest || ''; break;
        }
        
        return Object.entries(replacements).reduce((msg, [key, value]) => msg.replace(new RegExp(key, 'g'), value), template);
    };

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquarePlus /> Centro de Comunicações</CardTitle>
                <CardDescription>Gerencie o envio de mensagens importantes para seus hóspedes com agilidade.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2">Ações Imediatas</h3>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => handleCopyToClipboard(getMessage('pre-check-in'), { type: 'pre-check-in', guestName: 'Genérico', stayId: 'N/A' })}>
                            <Wind className="mr-2 h-4 w-4" /> Copiar Mensagem de Pré-Check-in
                        </Button>
                    </div>
                </div>
                <Separator />
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Boas-Vindas Pendentes ({staysAwaitingWelcome.length})</h3>
                        {staysAwaitingWelcome.length > 0 ? staysAwaitingWelcome.map(stay => (
                            <div key={stay.id} className="flex justify-between items-center p-2 border rounded-md">
                                <div>
                                    <p className="font-medium">{stay.guestName}</p>
                                    <p className="text-xs text-muted-foreground">{stay.cabinName}</p>
                                </div>
                                <Button size="sm" onClick={() => copyAndMark(getMessage('welcome', stay), stay, 'welcome')}><Send className="mr-2 h-4 w-4" /> Copiar & Enviar</Button>
                            </div>
                        )) : <p className="text-sm text-muted-foreground">Nenhuma mensagem de boas-vindas pendente.</p>}
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold">Lembrete de Café ({staysForBreakfastReminder.length})</h3>
                        {staysForBreakfastReminder.length > 0 ? staysForBreakfastReminder.map(stay => (
                             <div key={stay.id} className="flex justify-between items-center p-2 border rounded-md">
                                <div>
                                    <p className="font-medium">{stay.guestName}</p>
                                    <p className="text-xs text-muted-foreground">{stay.cabinName}</p>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => handleCopyToClipboard(getMessage('breakfast', stay), { type: 'breakfast', guestName: stay.guestName, stayId: stay.id })}><Coffee className="mr-2 h-4 w-4" /> Copiar Lembrete</Button>
                            </div>
                        )) : <p className="text-sm text-muted-foreground">Nenhum lembrete de café necessário agora.</p>}
                    </div>

                     <div className="space-y-2">
                        <h3 className="font-semibold">Solicitar Avaliação ({staysForFeedback.length})</h3>
                        {staysForFeedback.length > 0 ? staysForFeedback.map(stay => (
                             <div key={stay.id} className="flex justify-between items-center p-2 border rounded-md">
                                <div>
                                    <p className="font-medium">{stay.guestName}</p>
                                    <p className="text-xs text-muted-foreground">Check-out: {format(new Date(stay.checkOutDate), 'dd/MM/yy')}</p>
                                </div>
                                <Button size="sm" onClick={() => copyAndMark(getMessage('feedback', stay), stay, 'feedback')}><Star className="mr-2 h-4 w-4" /> Copiar & Enviar</Button>
                            </div>
                        )) : <p className="text-sm text-muted-foreground">Nenhuma solicitação de avaliação pendente.</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}