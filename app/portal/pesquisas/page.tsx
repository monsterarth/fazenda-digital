"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getFirebaseDb } from '@/lib/firebase'; 
import * as firestore from "firebase/firestore";
import { useGuest } from '@/context/GuestProvider';
import { Survey } from '@/types/survey';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Gift, Lock } from 'lucide-react';
import { differenceInHours } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function SurveyCard({ survey, isLocked, stayId }: { survey: Survey, isLocked: boolean, stayId: string }) {
    const surveyUrl = `/s/${survey.id}?stayId=${stayId}`;

    const cardContent = (
        <Card className={cn("flex flex-col h-full transition-all", isLocked ? "bg-muted/50 cursor-not-allowed" : "hover:border-primary hover:shadow-lg")}>
            <CardHeader>
                <CardTitle>{survey.title}</CardTitle>
                <CardDescription>{survey.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end">
                {survey.reward?.hasReward && (
                    <div className="mb-4 p-2 bg-green-50 text-green-700 rounded-md text-sm flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        <div>
                            <p className="font-bold">{survey.reward.type}</p>
                            <p>{survey.reward.description}</p>
                        </div>
                    </div>
                )}
                {isLocked ? (
                    <Button disabled className="w-full">
                        <Lock className="mr-2 h-4 w-4" />
                        Liberada no Check-out
                    </Button>
                ) : (
                    <Button asChild className="w-full">
                        <Link href={surveyUrl}>
                            Responder Pesquisa <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );

    return isLocked ? <div>{cardContent}</div> : <div className="h-full">{cardContent}</div>;
}

export default function GuestSurveysPage() {
    const { stay, isLoading: isGuestLoading } = useGuest();
    const router = useRouter();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isGuestLoading && !stay) {
            router.push('/portal');
        }
    }, [stay, isGuestLoading, router]);

    useEffect(() => {
        if (isGuestLoading || !stay) return;

        const fetchSurveys = async () => {
            const db = await getFirebaseDb();
            if (!db) {
                toast.error("Erro de conexão.");
                setLoading(false);
                return;
            }
            
            try {
                // Com as novas regras, esta query agora é permitida para hóspedes.
                const q = firestore.query(firestore.collection(db, 'surveys'));
                const querySnapshot = await firestore.getDocs(q);
                setSurveys(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey)));
            } catch (error) {
                console.error("Erro ao buscar pesquisas:", error);
                toast.error("Não foi possível carregar as pesquisas disponíveis.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchSurveys();
        
    }, [isGuestLoading, stay]);

    if (isGuestLoading || loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }
    
    // stay é verificado no useEffect, mas adicionamos uma checagem extra para segurança de tipo
    if (!stay) return null;

    const isDefaultSurveyLocked = (survey: Survey) => {
        if (!survey.isDefault) return false;
        
        const checkOutDate = (stay.checkOutDate as any).toDate ? (stay.checkOutDate as any).toDate() : new Date(stay.checkOutDate);
        const hoursUntilCheckout = differenceInHours(checkOutDate, new Date());
        return hoursUntilCheckout > 12;
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold">Pesquisas de Satisfação</h1>
                <p className="text-lg text-muted-foreground">Sua opinião é muito importante para nós!</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {surveys.map(survey => (
                    <SurveyCard key={survey.id} survey={survey} isLocked={isDefaultSurveyLocked(survey)} stayId={stay.id} />
                ))}
                {surveys.length === 0 && (
                    <Card className="md:col-span-3 text-center p-12">
                        <CardDescription>Nenhuma pesquisa disponível no momento.</CardDescription>
                    </Card>
                )}
            </div>
        </div>
    );
}