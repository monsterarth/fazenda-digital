"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useProperty } from '@/context/PropertyContext';
import { useGuest } from '@/context/GuestProvider';
import { useOrder } from '@/context/OrderContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { BreakfastOrder } from '@/types';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StepWelcome } from './StepWelcome';
import { StepIndividualChoices } from './StepIndividualChoices';
import { StepAccompaniments } from './StepAccompaniments';
import { StepReview } from './StepReview';
import { StepSuccess } from './StepSuccess';
import { OrderSidebar } from './OrderSidebar';
import { StateCard } from './StateCard';
import { Coffee, Utensils, Lock, ShieldCheck, Edit, TimerOff } from 'lucide-react';
import { isOrderingWindowActive } from '@/lib/utils';

export const BreakfastFlow: React.FC = () => {
    const { property, loading: propertyLoading } = useProperty();
    const { stay, isLoading: guestLoading } = useGuest();
    const { currentStep, setStep } = useOrder();

    const [existingOrder, setExistingOrder] = useState<BreakfastOrder | null | undefined>(undefined); // undefined: carregando, null: não existe, object: existe
    const [editMode, setEditMode] = useState(false);

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
                    setExistingOrder({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as BreakfastOrder);
                } else {
                    setExistingOrder(null);
                }
            } catch (error) {
                console.error("Error checking for existing order:", error);
                setExistingOrder(null); // Assume que não há pedido em caso de erro
            }
        };
        checkForExistingOrder();
    }, [stay?.id, deliveryDateString]);

    const breakfastConfig = property?.breakfast;
    const menu = breakfastConfig?.menu || [];
    const individualCategories = useMemo(() => menu.filter(c => c.type === 'individual'), [menu]);
    const collectiveCategories = useMemo(() => menu.filter(c => c.type === 'collective'), [menu]);
    
    const isWindowActive = useMemo(() => 
        isOrderingWindowActive(breakfastConfig?.orderingStartTime, breakfastConfig?.orderingEndTime),
    [breakfastConfig]);

    // ESTADOS DE CARREGAMENTO E INDISPONIBILIDADE GERAL
    if (propertyLoading || guestLoading || existingOrder === undefined) {
        return <Skeleton className="h-96 w-full" />;
    }
    if (!breakfastConfig) {
        return <StateCard icon={<Coffee />} title="Café da Manhã" description="Informações não disponíveis." />;
    }
    if (breakfastConfig.type === 'on-site') {
        return <StateCard icon={<Utensils />} title="Café no Salão" description="Nosso café será servido no salão principal. Não é necessário pedir por aqui." />;
    }

    // LÓGICA DOS 4 ESTADOS
    if (!editMode) { // Só entra no fluxo de etapas se estiver em modo de edição
        if (existingOrder) { // Formulário já preenchido
            if (isWindowActive) { // Dentro do horário
                return (
                    <StateCard icon={<ShieldCheck className="h-10 w-10 text-green-600" />} title="Pedido Recebido!" description={`Já registramos sua cesta para amanhã. Deseja alterar algum item? Você pode editar seu pedido até as ${breakfastConfig.orderingEndTime}.`}>
                        <Button size="lg" onClick={() => setEditMode(true)}><Edit className="mr-2 h-4 w-4" /> Alterar Pedido</Button>
                    </StateCard>
                );
            } else { // Fora do horário
                return (
                     <StateCard icon={<Lock className="h-10 w-10 text-primary" />} title="Pedido Confirmado" description={`Seu pedido já foi recebido e está sendo preparado! O período para alterações encerrou às ${breakfastConfig.orderingEndTime}.`} />
                );
            }
        } else { // Formulário não preenchido
            if (!isWindowActive) { // Fora do horário
                const defaultMessage = (property.messages?.breakfastBasketDefaultMessage || "Fique tranquilo, uma cesta padrão para {X} pessoa(s) será preparada para você.").replace('{X}', stay?.numberOfGuests.toString() || '1');
                return (
                    <StateCard icon={<TimerOff className="h-10 w-10 text-destructive" />} title="Pedidos Encerrados" description={<>{`O horário para escolher os itens da sua cesta encerrou às ${breakfastConfig.orderingEndTime}.`}<br/>{defaultMessage}</>} />
                );
            }
        }
    }
    
    // RENDERIZAÇÃO DO FLUXO DE ETAPAS (Formulário não preenchido, dentro do horário OU modo de edição ativo)
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                {currentStep === 1 && <StepWelcome />}
                {currentStep === 2 && <StepIndividualChoices categories={individualCategories} />}
                {currentStep === 3 && <StepAccompaniments categories={collectiveCategories} />}
                {currentStep === 4 && <StepReview individualCategories={individualCategories} collectiveCategories={collectiveCategories} />}
                {currentStep === 5 && <StepSuccess />}
            </div>
            <div className="lg:col-span-1">
                {currentStep > 1 && currentStep < 5 && (
                    <OrderSidebar individualCategories={individualCategories} collectiveCategories={collectiveCategories} />
                )}
            </div>
        </div>
    );
};