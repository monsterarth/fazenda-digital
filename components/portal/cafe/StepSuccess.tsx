"use client";

import React from 'react';
import { useProperty } from '@/context/PropertyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// ++ IMPORTS ADICIONADOS ++
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, Heart, Home } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const StepSuccess: React.FC = () => {
    const { property } = useProperty();
    const deliveryDate = addDays(new Date(), 1);

    const successTitle = property?.messages?.surveySuccessTitle || 'Pedido Confirmado!';
    const successSubtitle = property?.messages?.surveySuccessSubtitle || 'Sua cesta está sendo preparada com muito carinho.';

    return (
        <Card className="shadow-lg border-2 w-full text-center">
            <CardHeader className="items-center p-6 md:p-8">
                <CheckCircle className="w-20 h-20 text-green-600 mb-4" />
                <CardTitle className="text-3xl font-bold text-green-700">
                    {successTitle}
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                    {successSubtitle}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
                <p className="text-muted-foreground">
                    Seu pedido para o café da manhã de amanhã, dia <strong className="text-primary">{format(deliveryDate, "dd 'de' MMMM", { locale: ptBR })}</strong>, foi registrado.
                </p>
                <div className="flex items-center justify-center gap-2 text-primary font-medium pt-4 border-t">
                    <Heart className="w-5 h-5 fill-current" />
                    <span>Desejamos um dia maravilhoso!</span>
                    <Heart className="w-5 h-5 fill-current" />
                </div>
                
                {/* ++ BOTÃO ADICIONADO ++ */}
                <div className="mt-8">
                    <Link href="/portal/dashboard" passHref>
                        <Button size="lg" className="w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow">
                            <Home className="w-5 h-5 mr-2" />
                            Voltar para o Portal
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};