"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { BreakfastOrder, Stay } from '@/types';
import { isOrderingWindowActive } from '@/lib/utils';
import { format, addDays } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { Coffee, ArrowRight, CheckCircle, AlertTriangle, Lock, TimerOff, Edit, Utensils } from "lucide-react";
import Link from "next/link";

export function BreakfastCard() {
    const { property, loading: propertyLoading } = useProperty();
    const { stay, isLoading: guestLoading } = useGuest();
    
    // Estado interno para buscar o pedido do dia, espelhando a lógica do BreakfastFlow
    const [todaysOrder, setTodaysOrder] = useState<BreakfastOrder | null | undefined>(undefined);

    const deliveryDateString = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    useEffect(() => {
        const checkForExistingOrder = async () => {
            if (!stay?.id || !db) return;
            try {
                const q = query(
                    collection(db, 'breakfastOrders'),
                    where("stayId", "==", stay.id),
                    where("deliveryDate", "==", deliveryDateString),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    setTodaysOrder({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as BreakfastOrder);
                } else {
                    setTodaysOrder(null);
                }
            } catch (error) {
                console.error("Erro ao buscar pedido de café:", error);
                setTodaysOrder(null);
            }
        };
        // A busca só é acionada quando o 'stay' estiver disponível
        if (stay) {
            checkForExistingOrder();
        }
    }, [stay, deliveryDateString]);

    const breakfastConfig = property?.breakfast;
    
    const isWindowActive = useMemo(() => 
        isOrderingWindowActive(breakfastConfig?.orderingStartTime, breakfastConfig?.orderingEndTime),
    [breakfastConfig]);

    if (propertyLoading || guestLoading || todaysOrder === undefined) {
        return <Skeleton className="h-48 w-full" />;
    }

    if (!breakfastConfig?.isAvailable) {
        return null; // O card não é renderizado se o serviço não estiver ativo
    }
    
    // Cenário 1: Café no Salão
    if (breakfastConfig.type === 'on-site') {
        return (
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Utensils /> Café no Salão</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{breakfastConfig.orderingStartTime || '08:00'} - {breakfastConfig.orderingEndTime || '10:00'}</p>
                    <p className="text-sm text-muted-foreground">Servido diariamente no salão principal.</p>
                </CardContent>
            </Card>
        );
    }
    
    // Lógica dos 4 estados para cesta de café da manhã
    let cardState: { icon: React.ReactNode; title: string; description: React.ReactNode; action?: React.ReactNode; colorClass: string; };

    if (todaysOrder) { // Cenário 2 e 5: Hóspede JÁ fez o pedido
        if (isWindowActive) {
            cardState = {
                icon: <CheckCircle className="h-10 w-10" />, title: "Pedido Recebido!",
                description: `Sua cesta para amanhã está registrada. Você pode editá-la até as ${breakfastConfig.orderingEndTime}.`,
                action: <Button asChild variant="secondary" className="w-full"><Link href="/cafe"><Edit className="mr-2 h-4 w-4"/> Editar Cesta</Link></Button>,
                colorClass: "text-green-600"
            };
        } else {
            cardState = {
                icon: <Lock className="h-10 w-10" />, title: "Pedido Confirmado",
                description: `Sua cesta já está sendo preparada! O período para alterações encerrou.`,
                colorClass: "text-primary"
            };
        }
    } else { // Cenário 3 e 4: Hóspede AINDA NÃO fez o pedido
        if (isWindowActive) {
            cardState = {
                icon: <AlertTriangle className="h-10 w-10" />, title: "Não esqueça sua cesta!",
                description: `Você tem até as ${breakfastConfig.orderingEndTime} para montar sua cesta para amanhã.`,
                action: <Button asChild className="w-full"><Link href="/cafe">Montar minha cesta <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>,
                colorClass: "text-amber-700"
            };
        } else {
            const defaultMessage = (property?.messages?.breakfastBasketDefaultMessage || "Fique tranquilo, uma cesta padrão para {X} pessoa(s) será preparada.")
                .replace('{X}', stay?.numberOfGuests.toString() || '1');
            cardState = {
                icon: <TimerOff className="h-10 w-10" />, title: "Pedidos Encerrados",
                description: <>{`O horário para escolher os itens encerrou.`}<br/>{defaultMessage}</>,
                colorClass: "text-destructive"
            };
        }
    }
    
    return (
        <Card className="flex flex-col h-full">
            <CardHeader><CardTitle className="flex items-center gap-2"><Coffee /> Sua Cesta de Café</CardTitle></CardHeader>
            <CardContent className={`flex-grow flex flex-col justify-center items-center text-center space-y-3 ${cardState.colorClass}`}>
                {cardState.icon}
                <p className="font-bold text-lg">{cardState.title}</p>
                <p className="text-sm text-muted-foreground px-4">{cardState.description}</p>
            </CardContent>
            {cardState.action && <CardFooter>{cardState.action}</CardFooter>}
        </Card>
    );
}