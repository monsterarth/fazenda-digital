"use client";

import React, { useState, useEffect } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import { Property } from '@/types';
import ReactMarkdown from 'react-markdown'; // Importa o renderizador de Markdown
import remarkGfm from 'remark-gfm'; // Importa o plugin GFM

export default function TermsAndPoliciesPage() {
    const { stay, setStay, isLoading: isGuestLoading } = useGuest();
    const { property, loading: isPropertyLoading } = useProperty();
    const router = useRouter();
    const [isChecked, setIsChecked] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [policyContent, setPolicyContent] = useState<string | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(true);

    useEffect(() => {
        if (!isPropertyLoading && property?.policies?.content) {
            setPolicyContent(property.policies.content);
            setIsLoadingContent(false);
            return;
        }
        if (!isPropertyLoading && !property?.policies?.content) {
            const fetchPoliciesDirectly = async () => {
                try {
                    const db = await getFirebaseDb();
                    const propertyRef = doc(db, "properties", "main_property"); 
                    const propertySnap = await getDoc(propertyRef);
                    if (propertySnap.exists()) {
                        const propertyData = propertySnap.data() as Property;
                        setPolicyContent(propertyData.policies?.content || '');
                    }
                } catch (error) {
                    console.error("Falha ao buscar políticas diretamente:", error);
                    toast.error("Não foi possível carregar o conteúdo das políticas.");
                } finally {
                    setIsLoadingContent(false);
                }
            };
            fetchPoliciesDirectly();
        }
    }, [property, isPropertyLoading]);

    const handleAccept = async () => {
        if (!stay) {
            toast.error("Sessão inválida. Por favor, faça o login novamente.");
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading("Salvando seu aceite...");
        try {
            const db = await getFirebaseDb();
            const stayRef = doc(db, "stays", stay.id);
            await updateDoc(stayRef, { termsAcceptedAt: serverTimestamp() });
            const updatedStay = { ...stay, termsAcceptedAt: Timestamp.now() };
            setStay(updatedStay);
            sessionStorage.setItem('synapse-stay', JSON.stringify(updatedStay));
            toast.success("Termos aceitos com sucesso! Redirecionando...", { id: toastId });
            router.push('/portal/dashboard');
        } catch (error) {
            toast.error("Não foi possível salvar seu aceite. Tente novamente.", { id: toastId });
            setIsSubmitting(false);
        }
    };

    if (isGuestLoading || isLoadingContent) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if(stay?.termsAcceptedAt && property?.policies?.lastUpdatedAt && stay.termsAcceptedAt.toMillis() >= property.policies.lastUpdatedAt.toMillis()) {
        router.replace('/portal/dashboard');
        return null;
    }

    return (
        <div className="min-h-screen bg-secondary p-4 md:p-8 flex items-center justify-center">
            <Toaster richColors position="top-center" />
            <Card className="w-full max-w-3xl shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Políticas e Termos de Uso</CardTitle>
                    <CardDescription>
                        {stay ? `Olá, ${stay.guestName.split(' ')[0]}! ` : ''}
                        Para continuar, por favor, leia e aceite nossos termos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* ## INÍCIO DA CORREÇÃO: Usando ReactMarkdown para renderizar o conteúdo ## */}
                    <div className="prose dark:prose-invert max-w-none max-h-96 overflow-y-auto rounded-md border p-4 text-sm">
                        {policyContent ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {policyContent}
                            </ReactMarkdown>
                        ) : (
                            <p>O conteúdo das políticas ainda não foi configurado.</p>
                        )}
                    </div>
                    {/* ## FIM DA CORREÇÃO ## */}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="terms" checked={isChecked} onCheckedChange={(checked) => setIsChecked(!!checked)} />
                        <Label htmlFor="terms" className="text-sm font-medium leading-none">
                            Li e concordo com os termos e políticas.
                        </Label>
                    </div>
                    <Button onClick={handleAccept} disabled={!isChecked || isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continuar
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}