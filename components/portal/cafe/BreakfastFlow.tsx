"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useProperty } from '@/context/PropertyContext';
import { useGuest } from '@/context/GuestProvider';
import { useOrder } from '@/context/OrderContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { BreakfastOrder } from '@/types';
import { format, addDays } from 'date-fns';
import { getAuth } from 'firebase/auth';

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
import { toast } from 'sonner';

export const BreakfastFlow: React.FC = () => {
    const { property, loading: propertyLoading, breakfastMenu } = useProperty();
    const { stay, isLoading: guestLoading } = useGuest();
    const { currentStep, setStep, selections, clearOrder } = useOrder();

    const [existingOrder, setExistingOrder] = useState<BreakfastOrder | null | undefined>(undefined);
    const [editMode, setEditMode] = useState(false);

    const deliveryDateString = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    useEffect(() => {
        if (!stay?.id || !db) {
            if (!guestLoading) setExistingOrder(null);
            return;
        };

        const checkForExistingOrder = async () => {
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
                setExistingOrder(null);
            }
        };
        checkForExistingOrder();
    }, [stay, guestLoading, deliveryDateString]);

    const individualCategories = useMemo(() => breakfastMenu.filter(c => c.type === 'individual'), [breakfastMenu]);
    const collectiveCategories = useMemo(() => breakfastMenu.filter(c => c.type === 'collective'), [breakfastMenu]);
    
    const breakfastConfig = property?.breakfast;
    const isWindowActive = useMemo(() => 
        isOrderingWindowActive(breakfastConfig?.orderingStartTime, breakfastConfig?.orderingEndTime),
    [breakfastConfig]);

    const handleSendOrder = async (generalNotes: string) => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user || !stay) {
            toast.error("Você precisa estar logado para enviar um pedido.");
            return;
        }

        const toastId = toast.loading("Enviando seu pedido...");
        try {
            const idToken = await user.getIdToken();

            const orderData = {
                stayId: stay.id,
                guestName: stay.guestName,
                cabinName: stay.cabinName,
                numberOfGuests: stay.numberOfGuests,
                deliveryDate: deliveryDateString,
                ...selections,
                generalNotes: generalNotes,
                status: 'pending',
            };

            const response = await fetch('/api/portal/cafe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    orderData,
                    existingOrderId: editMode ? existingOrder?.id : null
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Não foi possível enviar o pedido.');
            }

            toast.success("Pedido enviado com sucesso!", { id: toastId });
            setStep(5);
            setEditMode(false);

        } catch (error: any) {
            toast.error("Erro ao enviar o pedido", { id: toastId, description: error.message });
        }
    }

    if (propertyLoading || guestLoading || existingOrder === undefined) {
        return <Skeleton className="h-96 w-full" />;
    }
    if (!breakfastConfig) {
        return <StateCard icon={<Coffee />} title="Café da Manhã" description="Informações não disponíveis." />;
    }
    if (breakfastConfig.type === 'on-site') {
        return <StateCard icon={<Utensils />} title="Café no Salão" description="Nosso café será servido no salão principal." />;
    }

    if (!editMode) {
        if (existingOrder) {
            if (isWindowActive) {
                return (
                    <StateCard
                        icon={<ShieldCheck className="h-10 w-10 text-brand-primary" />}
                        title="Pedido Recebido!"
                        description={`Já registramos sua cesta para amanhã. Você pode editar seu pedido até as ${breakfastConfig.orderingEndTime}.`}
                    >
                        <Button size="lg" className="bg-brand-dark-green text-white hover:bg-brand-mid-green transition-colors" onClick={() => setEditMode(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Alterar Pedido
                        </Button>
                    </StateCard>
                );
            } else {
                return (
                     <StateCard
                        icon={<Lock className="h-10 w-10 text-brand-mid-green" />}
                        title="Pedido Confirmado"
                        description={`Seu pedido já foi recebido e está sendo preparado! O período para alterações encerrou às ${breakfastConfig.orderingEndTime}.`}
                    />
                );
            }
        } else {
            if (!isWindowActive) {
                const defaultMessage = (property?.messages?.breakfastBasketDefaultMessage || "Fique tranquilo, uma cesta padrão para {X} pessoa(s) será preparada para você.").replace('{X}', stay?.numberOfGuests.toString() || '1');
                return (
                    <StateCard
                        icon={<TimerOff className="h-10 w-10 text-destructive" />}
                        title="Pedidos Encerrados"
                        description={<>{`O horário para escolher os itens da sua cesta encerrou às ${breakfastConfig.orderingEndTime}.`}<br/>{defaultMessage}</>}
                    />
                );
            }
        }
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
                {currentStep === 1 && <StepWelcome />}
                {currentStep === 2 && <StepIndividualChoices categories={individualCategories} />}
                {currentStep === 3 && <StepAccompaniments categories={collectiveCategories} />}
                {currentStep === 4 && <StepReview onConfirmOrder={handleSendOrder} />}
                {currentStep === 5 && <StepSuccess />}
            </div>
            {/* ++ INÍCIO DA ALTERAÇÃO ++ */}
            {/* A classe "hidden" oculta o componente em telas pequenas (mobile) */}
            {/* A classe "lg:block" faz com que ele reapareça em telas grandes (desktop) */}
            <div className="hidden lg:block lg:col-span-1">
            {/* ++ FIM DA ALTERAÇÃO ++ */}
                {currentStep > 1 && currentStep < 5 && (
                    <OrderSidebar individualCategories={individualCategories} collectiveCategories={collectiveCategories} />
                )}
            </div>
        </div>
    );
};