"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProperty } from '@/context/PropertyContext';
import Image from 'next/image';
import { PreCheckinForm } from '@/components/pre-checkin-form'; 
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getStayByToken } from '@/app/actions/get-stay-by-token';
import { toast } from 'sonner';

function PreCheckInContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { property, loading: propertyLoading } = useProperty();
    
    // Estado para guardar dados pré-carregados da estadia
    const [prefilledData, setPrefilledData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(!!token);

    useEffect(() => {
        const loadData = async () => {
            if (!token) return;

            try {
                const data = await getStayByToken(token);
                if (data) {
                    setPrefilledData(data);
                    toast.success(`Olá, ${data.guestName.split(' ')[0]}!`, {
                        description: "Encontramos sua reserva. Complete seus dados abaixo."
                    });
                } else {
                    toast.error("Reserva não encontrada ou token expirado.");
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();
    }, [token]);

    if (propertyLoading || isLoadingData) {
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

    if (!property) return null;

    return (
        <div className="max-w-2xl mx-auto w-full">
            <div className="text-center mb-8">
                {property.logoUrl && (
                    <Image
                        src={property.logoUrl}
                        alt={`Logo de ${property.name}`}
                        width={128}
                        height={128}
                        className="mx-auto mb-4 rounded-md shadow-sm"
                        priority
                    />
                )}
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
                    {property.messages?.preCheckInWelcomeTitle || "Bem-vindo!"}
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    {property.messages?.preCheckInWelcomeSubtitle || "Complete seu cadastro para agilizar o check-in."}
                </p>
            </div>
            
            {/* Passamos o token e os dados encontrados para o formulário */}
            <PreCheckinForm 
                property={property} 
                prefilledData={prefilledData} 
                token={token || undefined}
            />
        </div>
    );
}

export default function PreCheckInPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <Suspense fallback={<div className="text-center">Carregando...</div>}>
                <PreCheckInContent />
            </Suspense>
        </main>
    );
}