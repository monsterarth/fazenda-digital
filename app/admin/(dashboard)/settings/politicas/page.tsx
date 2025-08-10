"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'; // Importa updateDoc
import { Property } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, FileText, Eye, Pencil, Dog } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type PolicyType = 'general' | 'pet';

export default function ManagePoliciesPage() {
    const [generalPolicy, setGeneralPolicy] = useState('');
    const [petPolicy, setPetPolicy] = useState('');
    const [activePolicy, setActivePolicy] = useState<PolicyType>('general');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const propertyId = "main_property"; 

    useEffect(() => {
        const fetchProperty = async () => {
            const db = await getFirebaseDb();
            const propertyRef = doc(db, "properties", propertyId);
            const propertySnap = await getDoc(propertyRef);

            if (propertySnap.exists()) {
                const propertyData = propertySnap.data() as Property;
                setGeneralPolicy(propertyData.policies?.general?.content || '');
                setPetPolicy(propertyData.policies?.pet?.content || '');
            }
            setLoading(false);
        };
        fetchProperty();
    }, [propertyId]);

    const handleSave = async () => {
        setIsSaving(true);
        const toastId = toast.loading(`Salvando Políticas (${activePolicy === 'general' ? 'Gerais' : 'Pet'})...`);

        try {
            const db = await getFirebaseDb();
            const propertyRef = doc(db, "properties", propertyId);
            const contentToSave = activePolicy === 'general' ? generalPolicy : petPolicy;
            
            // ## CORREÇÃO DEFINITIVA: Usando updateDoc com notação de ponto ##
            // Isso garante que estamos atualizando apenas o campo específico (general ou pet)
            // dentro do mapa 'policies', sem sobrescrever o outro.
            const fieldPath = `policies.${activePolicy}`;
            const updateData = {
                [fieldPath]: {
                    content: contentToSave,
                    lastUpdatedAt: serverTimestamp()
                }
            };

            await updateDoc(propertyRef, updateData);
            
            toast.success("Políticas salvas com sucesso!", { id: toastId });
        } catch (error) {
            console.error("Erro ao salvar políticas:", error);
            toast.error("Não foi possível salvar as alterações.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const currentContent = activePolicy === 'general' ? generalPolicy : petPolicy;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Editor de Políticas e Termos</CardTitle>
                    <CardDescription>
                        Edite o conteúdo que será exibido aos hóspedes. Use as abas para alternar entre a política geral e a de pets.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="general" className="w-full" onValueChange={(value) => setActivePolicy(value as PolicyType)}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="general"><FileText className="mr-2 h-4 w-4" /> Políticas Gerais</TabsTrigger>
                            <TabsTrigger value="pet"><Dog className="mr-2 h-4 w-4" /> Políticas para Pets</TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-4">
                            <Tabs defaultValue="edit" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="edit"><Pencil className="mr-2 h-4 w-4" /> Editar</TabsTrigger>
                                    <TabsTrigger value="preview"><Eye className="mr-2 h-4 w-4" /> Visualizar</TabsTrigger>
                                </TabsList>
                                <TabsContent value="edit" className="mt-4">
                                    <Textarea
                                        value={currentContent}
                                        onChange={(e) => activePolicy === 'general' ? setGeneralPolicy(e.target.value) : setPetPolicy(e.target.value)}
                                        placeholder={`Escreva aqui a política (${activePolicy === 'general' ? 'geral' : 'de pets'})...`}
                                        className="min-h-[50vh] font-mono"
                                    />
                                </TabsContent>
                                <TabsContent value="preview" className="mt-4">
                                    <div className="prose dark:prose-invert max-w-none rounded-md border p-4 min-h-[50vh]">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {currentContent || "A visualização aparecerá aqui."}
                                        </ReactMarkdown>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </Tabs>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}