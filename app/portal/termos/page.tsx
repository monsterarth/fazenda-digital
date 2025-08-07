"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import { Property, Stay } from '@/types'; // Importa o tipo Property
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function TermsAndPoliciesPage() {
    const { stay, preCheckIn, setStay, isLoading: isGuestLoading } = useGuest();
    const router = useRouter();
    
    const [acceptedGeneral, setAcceptedGeneral] = useState(false);
    const [acceptedPet, setAcceptedPet] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ## INÍCIO DA CORREÇÃO: A página agora busca e gerencia seus próprios dados da propriedade ##
    const [property, setProperty] = useState<Property | null>(null);
    const [isLoadingProperty, setIsLoadingProperty] = useState(true);

    useEffect(() => {
        // Esta função busca os dados da propriedade diretamente, tornando o componente autônomo.
        const fetchPropertyData = async () => {
            try {
                const db = await getFirebaseDb();
                const propertyRef = doc(db, "properties", "main_property"); // Ajuste se o ID for dinâmico
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
    // ## FIM DA CORREÇÃO ##

    const hasPets = useMemo(() => (preCheckIn?.pets?.length || 0) > 0, [preCheckIn]);
    
    // ## INÍCIO DA CORREÇÃO: Lógica de verificação de aceite corrigida e mais robusta ##
    const hasAcceptedLatestPolicies = useMemo(() => {
        if (!stay || !property?.policies) {
            return false;
        }

        const accepted = stay.policiesAccepted;
        const policies = property.policies;
        
        // Assegura que o objeto de aceite e as políticas existem antes de comparar
        if (!accepted || !policies) return false;

        // Verifica a política geral
        const generalPolicyAccepted = 
            accepted.general && 
            policies.general?.lastUpdatedAt &&
            accepted.general.toMillis() >= policies.general.lastUpdatedAt.toMillis();

        // Se o hóspede não tem pets, apenas a política geral importa
        if (!hasPets) {
            return !!generalPolicyAccepted;
        }

        // Se tem pets, a política de pets também precisa ter sido aceita
        const petPolicyAccepted = 
            accepted.pet &&
            policies.pet?.lastUpdatedAt &&
            accepted.pet.toMillis() >= policies.pet.lastUpdatedAt.toMillis();

        return !!generalPolicyAccepted && !!petPolicyAccepted;
    }, [stay, property, hasPets]);
    // ## FIM DA CORREÇÃO ##

    const canAccept = hasPets ? acceptedGeneral && acceptedPet : acceptedGeneral;

    const handleAccept = async () => {
        if (!stay) return toast.error("Sessão inválida.");
        setIsSubmitting(true);
        const toastId = toast.loading("Salvando seu aceite...");

        try {
            const db = await getFirebaseDb();
            const stayRef = doc(db, "stays", stay.id);

            const newPoliciesAccepted = {
                ...stay.policiesAccepted,
                general: serverTimestamp(),
            };
            if (hasPets) {
                (newPoliciesAccepted as any).pet = serverTimestamp();
            }
            
            await updateDoc(stayRef, {
                policiesAccepted: newPoliciesAccepted
            });

            const updatedStay = { 
                ...stay, 
                policiesAccepted: {
                    ...stay.policiesAccepted,
                    general: Timestamp.now(),
                    ...(hasPets && { pet: Timestamp.now() })
                }
            };
            
            setStay(updatedStay);
            sessionStorage.setItem('synapse-stay', JSON.stringify(updatedStay));
            toast.success("Termos aceitos! Redirecionando...", { id: toastId });
            router.push('/portal/dashboard');
        } catch (error) {
            toast.error("Não foi possível salvar seu aceite.", { id: toastId });
            setIsSubmitting(false);
        }
    };

    if (isGuestLoading || isLoadingProperty) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-secondary p-4 md:p-8 flex items-center justify-center">
            <Toaster richColors position="top-center" />
            <Card className="w-full max-w-3xl shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Políticas e Termos de Uso</CardTitle>
                    <CardDescription>
                        {stay ? `Olá, ${stay.guestName.split(' ')[0]}! ` : ''}
                        {hasAcceptedLatestPolicies ? "Estes são os termos que você aceitou." : "Para continuar, por favor, leia e aceite nossos termos."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-bold mb-2">Políticas Gerais da Propriedade</h3>
                        <div className="prose dark:prose-invert max-w-none max-h-60 overflow-y-auto rounded-md border p-4 text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{property?.policies?.general?.content || "Carregando políticas..."}</ReactMarkdown>
                        </div>
                    </div>
                    {hasPets && (
                        <div>
                            <h3 className="font-bold mb-2 text-amber-700">Políticas para Estadias com Pets</h3>
                            <div className="prose dark:prose-invert max-w-none max-h-60 overflow-y-auto rounded-md border p-4 text-sm">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{property?.policies?.pet?.content || "Carregando políticas de pets..."}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="terms-general" 
                                checked={hasAcceptedLatestPolicies || acceptedGeneral} 
                                onCheckedChange={(c) => setAcceptedGeneral(!!c)} 
                                disabled={hasAcceptedLatestPolicies} 
                            />
                            <Label htmlFor="terms-general" className={cn(hasAcceptedLatestPolicies && "text-muted-foreground")}>Li e concordo com as Políticas Gerais.</Label>
                        </div>
                        {hasPets && (
                            <div className="flex items-center space-x-2">
                                <Checkbox id="terms-pet" 
                                    checked={hasAcceptedLatestPolicies || acceptedPet} 
                                    onCheckedChange={(c) => setAcceptedPet(!!c)} 
                                    disabled={hasAcceptedLatestPolicies}
                                />
                                <Label htmlFor="terms-pet" className={cn(hasAcceptedLatestPolicies && "text-muted-foreground")}>Li e concordo com as Políticas para Pets.</Label>
                            </div>
                        )}
                    </div>
                     {hasAcceptedLatestPolicies ? (
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/portal/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Início</Link>
                        </Button>
                    ) : (
                        <Button onClick={handleAccept} disabled={!canAccept || isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Continuar
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}