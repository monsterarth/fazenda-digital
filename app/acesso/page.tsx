"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Stay } from '@/types';
// Importado useSearchParams para ler os parâmetros da URL
import { useSearchParams } from 'next/navigation'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, KeyRound, CheckCircle, XCircle } from 'lucide-react';
import { useProperty } from '@/context/PropertyContext';
import Image from 'next/image';
import { Toaster, toast } from 'sonner';

// O componente que faz a lógica precisa ser separado para usar o useSearchParams
function AccessValidation() {
    const searchParams = useSearchParams();
    const { property } = useProperty();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [stay, setStay] = useState<Stay | null>(null);
    const [errorMessage, setErrorMessage] = useState('Link de acesso inválido ou expirado.');

    useEffect(() => {
        const stayId = searchParams.get('stayId');
        const token = searchParams.get('token');

        if (!stayId || !token) {
            setStatus('error');
            return;
        }

        const validateAccess = async () => {
            const db = await getFirebaseDb();
            if (!db) {
                setErrorMessage("Erro de conexão com o servidor.");
                setStatus('error');
                return;
            }
            const stayRef = firestore.doc(db, 'stays', stayId);
            const docSnap = await firestore.getDoc(stayRef);

            if (!docSnap.exists()) {
                setStatus('error'); // Estadia não encontrada
                return;
            }
            
            const stayData = docSnap.data() as Stay;
            setStay(stayData);

            // Validação 1: O token da URL bate com o do banco de dados?
            const isTokenValid = stayData.token === token;

            // Validação 2: A data/hora atual é anterior à data/hora do checkout?
            const now = new Date();
            const checkOutDate = new Date(stayData.checkOutDate);
            const isStayActive = now < checkOutDate;

            if (isTokenValid && isStayActive) {
                setStatus('success');
                // Aqui você pode adicionar lógica futura, como marcar o acesso no banco
            } else {
                if (!isStayActive) {
                    setErrorMessage("Esta hospedagem já foi finalizada.");
                }
                setStatus('error');
            }
        };

        validateAccess();
    }, [searchParams]);

    if (status === 'loading') {
        return (
            <Card className="w-full max-w-md text-center p-8">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                <CardTitle className="text-2xl mt-4">Validando seu acesso...</CardTitle>
                <CardDescription>Aguarde um momento.</CardDescription>
            </Card>
        );
    }

    if (status === 'error' || !stay) {
        return (
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-red-100 rounded-full p-4 w-fit">
                        <XCircle className="h-12 w-12 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl mt-4">Acesso Negado</CardTitle>
                    <CardDescription>{errorMessage}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                {property?.logoUrl && <Image src={property.logoUrl} alt="Logo" width={96} height={96} className="mx-auto mb-4 rounded-md" />}
                <div className="mx-auto bg-green-100 rounded-full p-4 w-fit">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <CardTitle className="text-2xl mt-4">Acesso validado, {stay.guestName}!</CardTitle>
                <CardDescription>Bem-vindo(a) à cabana <strong>{stay.cabinName}</strong>.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Tenha uma excelente estadia conosco!</p>
            </CardContent>
        </Card>
    );
}


// A página principal agora usa Suspense para aguardar a renderização do componente filho
export default function AccessPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <Toaster richColors position="top-center" />
            <Suspense fallback={<Loader2 className="h-10 w-10 animate-spin" />}>
                <AccessValidation />
            </Suspense>
        </main>
    );
}