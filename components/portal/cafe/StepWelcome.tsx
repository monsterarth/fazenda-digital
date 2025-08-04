"use client";

import React from 'react';
import { useProperty } from '@/context/PropertyContext';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PartyPopper } from 'lucide-react';

export const StepWelcome: React.FC = () => {
    const { property } = useProperty();
    const { setStep } = useOrder();

    // Mensagens podem ser personalizadas no admin, com um fallback padrão.
    const welcomeTitle = property?.messages?.portalWelcomeTitle || 'Bem-vindo(a)!';
    const welcomeSubtitle = property?.messages?.portalWelcomeSubtitle || 'Preparamos tudo com muito carinho para você.';

    return (
        <Card className="shadow-lg border-2 w-full">
            <CardHeader className="items-center text-center p-6 md:p-8 bg-primary/5">
                <PartyPopper className="w-16 h-16 text-primary mb-4" />
                <CardTitle className="text-3xl font-bold">
                    {welcomeTitle.replace('{guestName}', '')} {/* Remove a variável caso exista */}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                    Sua experiência gastronômica começa agora. Siga as etapas para montar seu café da manhã perfeito!
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 text-center">
                <Button 
                    onClick={() => setStep(2)} // Avança para a próxima etapa (Seleção Individual)
                    size="lg"
                    className="w-full md:w-auto"
                >
                    Começar a Montar a Cesta
                </Button>
            </CardContent>
        </Card>
    );
};
