"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from "firebase/firestore";
import { useGuest } from '@/context/GuestProvider';
import { Survey } from '@/types/survey';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Gift, Lock, ArrowLeft, Star } from 'lucide-react';
import { differenceInHours } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function SurveyCard({ survey, isLocked, stayId }: { survey: Survey, isLocked: boolean, stayId: string }) {
    const surveyUrl = `/s/${survey.id}?stayId=${stayId}`;

    const cardContent = (
        <Card className={cn(
            "flex flex-col h-full transition-all duration-200 border-2",
            isLocked 
                ? "bg-brand-mid-green/20 text-brand-mid-green cursor-not-allowed border-brand-mid-green/40" 
                : "bg-white/80 hover:border-brand-primary hover:shadow-lg border-brand-mid-green/40"
        )}>
            <CardHeader className="p-4">
                <CardTitle className="text-xl font-bold">{survey.title}</CardTitle>
                <CardDescription>{survey.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end p-4 pt-0">
                {survey.reward?.hasReward && (
                    <div className="mb-4 p-3 bg-brand-primary/10 text-brand-dark-green rounded-md text-sm flex items-start gap-2">
                        <Gift className="h-5 w-5 flex-shrink-0 text-brand-primary" />
                        <div>
                            <p className="font-bold">Recompensa: {survey.reward.type}</p>
                            <p className="text-brand-dark-green/80">{survey.reward.description}</p>
                        </div>
                    </div>
                )}
                {isLocked ? (
                    <Button disabled className="w-full bg-brand-mid-green/40 text-brand-dark-green cursor-not-allowed">
                        <Lock className="mr-2 h-4 w-4" />
                        Disponível no Check-out
                    </Button>
                ) : (
                    <Button asChild className="w-full bg-brand-dark-green text-white hover:bg-brand-primary transition-colors">
                        <Link href={surveyUrl}>
                            Responder Pesquisa <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );

    return isLocked ? <div className="h-full">{cardContent}</div> : <div className="h-full">{cardContent}</div>;
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
        return <div className="flex justify-center items-center h-screen bg-brand-light-green"><Loader2 className="h-12 w-12 text-brand-dark-green animate-spin" /></div>;
    }
    
    if (!stay) return null;

    const isDefaultSurveyLocked = (survey: Survey) => {
        if (!survey.isDefault) return false;
        
        const checkOutDate = (stay.checkOutDate as any).toDate ? (stay.checkOutDate as any).toDate() : new Date(stay.checkOutDate);
        const hoursUntilCheckout = differenceInHours(checkOutDate, new Date());
        return hoursUntilCheckout > 12;
    };

    return (
        <div className="min-h-screen bg-brand-light-green text-brand-dark-green flex flex-col items-center p-4 md:p-8">
            <Card className="w-full max-w-5xl bg-white/80 backdrop-blur-sm shadow-xl border-2 border-brand-primary">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => router.back()} 
                            className="text-brand-dark-green hover:bg-brand-light-green"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <CardTitle className="text-3xl font-bold text-brand-dark-green flex items-center gap-2">
                                <Star className="h-7 w-7 text-brand-primary" />
                                Pesquisas de Satisfação
                            </CardTitle>
                            <CardDescription className="text-brand-mid-green mt-1">Sua opinião é muito importante para nós!</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {surveys.map(survey => (
                            <SurveyCard key={survey.id} survey={survey} isLocked={isDefaultSurveyLocked(survey)} stayId={stay.id} />
                        ))}
                        {surveys.length === 0 && (
                            <div className="md:col-span-1 lg:col-span-3">
                                <Card className="text-center p-12 bg-white/50 border-dashed border-2">
                                    <CardDescription className="text-brand-mid-green">Nenhuma pesquisa disponível no momento.</CardDescription>
                                </Card>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}