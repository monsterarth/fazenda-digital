"use client";

import React from 'react';
import { useProperty } from '@/context/PropertyContext';
import Image from 'next/image';
import { PreCheckinForm } from '@/components/pre-checkin-form'; // Importando o novo componente
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PreCheckInPage() {
    // Usar o hook para obter os dados de personalização
    const { property, loading } = useProperty();

    // Enquanto o PropertyProvider carrega os dados, exibimos um skeleton.
    if (loading || !property) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center items-center flex flex-col gap-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-72 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-2xl mx-auto w-full">
                {/* O cabeçalho agora está na página, e não no formulário */}
                <div className="text-center mb-8">
                    {property.logoUrl && (
                        <Image
                            src={property.logoUrl}
                            alt={`Logo de ${property.name}`}
                            width={128}
                            height={128}
                            className="mx-auto mb-4 rounded-md"
                            priority
                        />
                    )}
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
                        {property.messages.preCheckInWelcomeTitle}
                    </h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        {property.messages.preCheckInWelcomeSubtitle}
                    </p>
                </div>
                
                {/* O formulário agora é um componente separado, recebendo os dados da propriedade */}
                <PreCheckinForm property={property} />
            </div>
        </main>
    );
}