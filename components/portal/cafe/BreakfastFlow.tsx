"use client";

import React, { useMemo } from 'react';
import { useProperty } from '@/context/PropertyContext';
import { useGuest } from '@/context/GuestProvider';
import { useOrder } from '@/context/OrderContext';

import { Skeleton } from '@/components/ui/skeleton';
import { StepWelcome } from './StepWelcome';
import { StepIndividualChoices } from './StepIndividualChoices';
import { StepAccompaniments } from './StepAccompaniments';
import { StepReview } from './StepReview';
import { StepSuccess } from './StepSuccess';
import { OrderSidebar } from './OrderSidebar';
import { StateCard } from './StateCard'; // Vamos criar este
import { Coffee, Utensils, Lock } from 'lucide-react';
import { isOrderingWindowActive } from '@/lib/utils'; // Vamos adicionar essa função

export const BreakfastFlow: React.FC = () => {
    const { property, loading: propertyLoading } = useProperty();
    const { stay, isLoading: guestLoading } = useGuest();
    const { currentStep } = useOrder();

    const breakfastConfig = property?.breakfast;
    const menu = breakfastConfig?.menu || [];

    const individualCategories = useMemo(() => menu.filter(c => c.type === 'individual'), [menu]);
    const collectiveCategories = useMemo(() => menu.filter(c => c.type === 'collective'), [menu]);
    
    const isWindowActive = useMemo(() => 
        isOrderingWindowActive(breakfastConfig?.orderingStartTime, breakfastConfig?.orderingEndTime),
    [breakfastConfig]);

    // Estados de Carregamento e Indisponibilidade
    if (propertyLoading || guestLoading) return <Skeleton className="h-96 w-full" />;
    if (!breakfastConfig) return <StateCard icon={<Coffee />} title="Café da Manhã" description="Informações não disponíveis." />;
    if (breakfastConfig.type === 'on-site') return <StateCard icon={<Utensils />} title="Café no Salão" description="Nosso café será servido no salão principal. Não é necessário pedir por aqui." />;
    if (!isWindowActive) return <StateCard icon={<Lock />} title="Pedidos Encerrados" description={`O horário para pedidos encerrou às ${breakfastConfig.orderingEndTime}. Uma cesta padrão será enviada.`} />;

    // Renderização das Etapas
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