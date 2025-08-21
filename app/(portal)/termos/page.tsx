//app/(portal)/termos/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, ScrollText, PawPrint } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Property, Stay } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
// ++ INÍCIO DA CORREÇÃO ++
import { cn, getMillisFromTimestamp } from '@/lib/utils'; // Importa a nova função
// ++ FIM DA CORREÇÃO ++
import { format } from 'date-fns';

// Função auxiliar para verificar se as políticas mais recentes foram aceitas
const hasAcceptedLatestPolicies = (stay: Stay, property: Property) => {
    if (!stay.policiesAccepted || !property.policies) return false;
    
    const hasPets = (stay.pets?.length || 0) > 0;
    const { general, pet } = stay.policiesAccepted;
    const { general: generalPolicy, pet: petPolicy } = property.policies;

    // ++ INÍCIO DA CORREÇÃO: Usando a função getMillisFromTimestamp ++
    const generalAccepted = general && generalPolicy?.lastUpdatedAt && getMillisFromTimestamp(general) >= getMillisFromTimestamp(generalPolicy.lastUpdatedAt);
    
    if (!hasPets) return !!generalAccepted;
    
    const petAccepted = pet && petPolicy?.lastUpdatedAt && getMillisFromTimestamp(pet) >= getMillisFromTimestamp(petPolicy.lastUpdatedAt);
    // ++ FIM DA CORREÇÃO ++
    return !!generalAccepted && !!petAccepted;
};

export default function TermsAndPoliciesPage() {
    const { stay, preCheckIn, isLoading: isGuestLoading } = useGuest();
    const router = useRouter();
    
    const [acceptedGeneral, setAcceptedGeneral] = useState(false);
    const [acceptedPet, setAcceptedPet] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [property, setProperty] = useState<Property | null>(null);
    const [isLoadingProperty, setIsLoadingProperty] = useState(true);

    useEffect(() => {
        const fetchPropertyData = async () => {
            try {
                const db = await getFirebaseDb();
                const propertyRef = doc(db, "properties", "main_property");
                const propertySnap = await getDoc(propertyRef);
                if (propertySnap.exists()) {
                    setProperty(propertySnap.data() as Property);
                } else {
                    toast.error("Configurações da propriedade não encontradas.");
                }
            } catch (error) {
                console.error("Falha ao buscar políticas:", error);
                toast.error("Não foi possível carregar o conteúdo das políticas.");
            } finally {
                setIsLoadingProperty(false);
            }
        };

        fetchPropertyData();
    }, []);

    const hasPets = useMemo(() => (preCheckIn?.pets?.length || 0) > 0, [preCheckIn]);
    
    const alreadyAccepted = useMemo(() => {
        if (!stay || !property) return false;
        return hasAcceptedLatestPolicies(stay, property);
    }, [stay, property]);

    const canAccept = hasPets ? acceptedGeneral && acceptedPet : acceptedGeneral;

    const handleAccept = async () => {
        if (!stay) return toast.error("Sessão inválida.");
        setIsSubmitting(true);
        const toastId = toast.loading("Salvando seu aceite...");

        try {
            const db = await getFirebaseDb();
            const stayRef = doc(db, "stays", stay.id);

            const updates: { [key: string]: any } = {};
            updates['policiesAccepted.general'] = serverTimestamp();
            
            if (hasPets) {
                updates['policiesAccepted.pet'] = serverTimestamp();
            }
            
            await updateDoc(stayRef, updates);
            
            toast.success("Termos aceitos! Redirecionando...", { id: toastId });

            window.location.reload();

        } catch (error) {
            console.error("Erro ao salvar aceite:", error);
            toast.error("Não foi possível salvar seu aceite.", { id: toastId });
            setIsSubmitting(false);
        }
    };

    // ++ INÍCIO DA CORREÇÃO: Usando a função toDate de forma segura ++
    const lastUpdatedDate = useMemo(() => {
        const ts = property?.policies?.general?.lastUpdatedAt;
        if (ts && typeof ts !== 'number' && typeof ts.toDate === 'function') {
            return format(ts.toDate(), 'dd/MM/yyyy');
        }
        return 'Data não disponível';
    }, [property]);
    // ++ FIM DA CORREÇÃO ++

    if (isGuestLoading || isLoadingProperty) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-brand-light-green">
                <Loader2 className="h-10 w-10 text-brand-dark-green animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light-green text-brand-dark-green flex flex-col items-center justify-center p-4 md:p-8">
            <Card className="w-full max-w-3xl bg-white/80 backdrop-blur-sm shadow-xl border-2 border-brand-primary">
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
                                <ScrollText className="h-7 w-7 text-brand-primary" />
                                Políticas e Termos
                            </CardTitle>
                            <CardDescription className="text-brand-mid-green">
                                {stay ? `Olá, ${stay.guestName.split(' ')[0]}! ` : ''}
                                {alreadyAccepted ? "Estes são os termos que você aceitou." : "Para continuar, por favor, leia e aceite nossos termos."}
                            </CardDescription>
                            <p className="text-sm text-brand-mid-green mt-2">
                                Última atualização: {lastUpdatedDate}
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg text-brand-dark-green mb-2">Políticas Gerais da Propriedade</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none max-h-60 overflow-y-auto rounded-md border border-brand-mid-green/50 bg-brand-light-green p-4">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{property?.policies?.general?.content || "Carregando políticas..."}</ReactMarkdown>
                        </div>
                    </div>
                    {hasPets && (
                        <div>
                            <h3 className="font-semibold text-lg text-brand-dark-green mb-2 flex items-center gap-2">
                                <PawPrint className="h-5 w-5 text-brand-primary" />
                                Políticas para Estadias com Pets
                            </h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none max-h-60 overflow-y-auto rounded-md border border-brand-mid-green/50 bg-brand-light-green p-4">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{property?.policies?.pet?.content || "Carregando políticas de pets..."}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brand-primary/20 pt-6">
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="terms-general" 
                                className="border-brand-mid-green data-[state=checked]:bg-brand-primary data-[state=checked]:text-white"
                                checked={alreadyAccepted || acceptedGeneral} 
                                onCheckedChange={(c) => setAcceptedGeneral(!!c)} 
                                disabled={alreadyAccepted} 
                            />
                            <Label htmlFor="terms-general" className={cn("text-brand-dark-green", alreadyAccepted && "text-brand-mid-green")}>Li e concordo com as Políticas Gerais.</Label>
                        </div>
                        {hasPets && (
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="terms-pet" 
                                    className="border-brand-mid-green data-[state=checked]:bg-brand-primary data-[state=checked]:text-white"
                                    checked={alreadyAccepted || acceptedPet} 
                                    onCheckedChange={(c) => setAcceptedPet(!!c)} 
                                    disabled={alreadyAccepted}
                                />
                                <Label htmlFor="terms-pet" className={cn("text-brand-dark-green", alreadyAccepted && "text-brand-mid-green")}>Li e concordo com as Políticas para Pets.</Label>
                            </div>
                        )}
                    </div>
                    {alreadyAccepted ? (
                        <Button asChild className="w-full sm:w-auto bg-brand-dark-green text-white hover:bg-brand-mid-green transition-colors">
                            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Início</Link>
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleAccept} 
                            disabled={!canAccept || isSubmitting} 
                            className="w-full sm:w-auto bg-brand-dark-green text-white hover:bg-brand-mid-green transition-colors"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Continuar
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}