"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from "firebase/firestore";
import { useGuest } from '@/context/GuestProvider';
import { Survey } from '@/types/survey'; // Importa do novo arquivo dedicado
import { Stay } from '@/types'; // Importa o tipo Stay
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Gift, Lock } from 'lucide-react';
import { differenceInHours } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function SurveyCard({ survey, isLocked }: { survey: Survey, isLocked: boolean }) {
    // Envolvemos o card em um Link se não estiver bloqueado
    const CardLinkWrapper = ({ children }: { children: React.ReactNode }) => 
        isLocked ? <div>{children}</div> : <Link href={`/portal/pesquisas/${survey.id}`} className="block h-full">{children}</Link>;

    return (
        <CardLinkWrapper>
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
                        <Button className="w-full">
                            Responder Pesquisa <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardContent>
            </Card>
        </CardLinkWrapper>
    );
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
        const fetchSurveys = async () => {
            const db = await getFirebaseDb();
            if (!db) return;
            const q = firestore.query(firestore.collection(db, 'surveys'));
            const querySnapshot = await firestore.getDocs(q);
            setSurveys(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey)));
            setLoading(false);
        };
        if (!isGuestLoading && stay) {
            fetchSurveys();
        }
    }, [isGuestLoading, stay]);

    if (isGuestLoading || loading || !stay) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    const isDefaultSurveyLocked = (survey: Survey) => {
        if (!survey.isDefault) return false;
        
        // Assegura que estamos trabalhando com um objeto Date
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
                    <SurveyCard key={survey.id} survey={survey} isLocked={isDefaultSurveyLocked(survey)} />
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