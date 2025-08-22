"use client";

import React, { useState, useEffect } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { createRequest, CreateRequestData } from '@/app/actions/create-request';
import { Cabin } from '@/types';
import { WeatherCard } from '@/components/guest/dashboard/WeatherCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wifi, KeyRound, BookOpen, Shield, Sparkles, Construction } from 'lucide-react';
import { toast } from 'sonner';

export default function EstadiaPage() {
    const { stay, user: guest } = useGuest();
    const { property } = useProperty();
    const [cabin, setCabin] = useState<Cabin | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (stay?.cabinId) {
            const fetchCabinData = async () => {
                const db = await getFirebaseDb();
                if (!db) { toast.error("Erro de conexão."); setLoading(false); return; }
                const cabinRef = firestore.doc(db, "cabins", stay.cabinId);
                const cabinSnap = await firestore.getDoc(cabinRef);
                if (cabinSnap.exists()) {
                    setCabin(cabinSnap.data() as Cabin);
                }
                setLoading(false);
            };
            fetchCabinData();
        } else if (stay) {
            setLoading(false);
        }
    }, [stay]);

    const handleRequestSubmit = async (type: CreateRequestData['type'], details: CreateRequestData['details']) => {
        if (!stay || !guest) return toast.error("Informações da estadia não encontradas.");
        
        setIsSubmitting(true);
        const toastId = toast.loading("Enviando solicitação...");
        const requestData: CreateRequestData = {
          stayId: stay.id,
          guestName: guest.displayName || "Hóspede",
          cabinName: stay.cabinName,
          type,
          details,
        };
        const result = await createRequest(requestData);
        toast.dismiss(toastId);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
        setIsSubmitting(false);
    };

    if (loading || !stay) {
        return <div className="flex justify-center items-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>
                        Olá, {guest?.displayName?.split(" ")[0]}!
                    </CardTitle>
                    <CardDescription>
                        Bem-vindo(a) à sua cabana, {stay.cabinName}.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Seção de Status Dinâmico */}
            <WeatherCard />
            {/* Aqui entrarão os futuros cards de resumo de agendamentos e solicitações */}

            {/* Seção de Informações da Cabana */}
            <Accordion type="multiple" defaultValue={['acessos']} className="w-full space-y-4">
                <AccordionItem value="acessos" className="border rounded-lg">
                    <AccordionTrigger className="p-4 text-lg font-semibold"><div className="flex items-center gap-3"><KeyRound className="w-6 h-6 text-primary"/> Acessos e Senhas</div></AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <div className="space-y-4">
                            {cabin?.wifiSsid && cabin.wifiPassword ? (
                                <Card>
                                    <CardHeader><CardTitle className="flex items-center gap-2"><Wifi size={20}/> Wi-Fi</CardTitle></CardHeader>
                                    <CardContent>
                                        <p><strong>Rede:</strong> {cabin.wifiSsid}</p>
                                        <p><strong>Senha:</strong> {cabin.wifiPassword}</p>
                                    </CardContent>
                                </Card>
                            ) : <p className="text-sm text-muted-foreground">Informações de Wi-Fi não disponíveis.</p>}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="guias" className="border rounded-lg">
                    <AccordionTrigger className="p-4 text-lg font-semibold"><div className="flex items-center gap-3"><BookOpen className="w-6 h-6 text-primary"/> Guias e Manuais</div></AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <p className="text-muted-foreground text-center py-4">Em breve: guias personalizados para os equipamentos da sua cabana.</p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="politicas" className="border rounded-lg">
                    <AccordionTrigger className="p-4 text-lg font-semibold"><div className="flex items-center gap-3"><Shield className="w-6 h-6 text-primary"/> Políticas da Pousada</div></AccordionTrigger>
                    <AccordionContent className="p-4 pt-0 prose prose-sm max-w-none dark:prose-invert">
                        <h4>Políticas Gerais</h4>
                        <p>{property?.policies?.general?.content || "Informações gerais não disponíveis."}</p>
                        <h4>Política para Pets</h4>
                        <p>{property?.policies?.pet?.content || "Informações sobre pets não disponíveis."}</p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
            {/* Seção de Ações Rápidas */}
            <Card>
                <CardHeader>
                    <CardTitle>Serviços para a Cabana</CardTitle>
                    <CardDescription>Precisa de algo? Peça por aqui.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button size="lg" variant="outline" onClick={() => handleRequestSubmit('cleaning', {})} disabled={isSubmitting}>
                        <Sparkles className="mr-2 h-5 w-5"/> Solicitar Limpeza
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => handleRequestSubmit('maintenance', { description: 'Hóspede solicitou verificação de manutenção geral.' })} disabled={isSubmitting}>
                         <Construction className="mr-2 h-5 w-5"/> Relatar Problema
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}