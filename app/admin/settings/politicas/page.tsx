"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Property } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, FileText } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function ManagePoliciesPage() {
    const [policyContent, setPolicyContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [propertyId, setPropertyId] = useState<string | null>(null); // Armazena o ID da propriedade

    useEffect(() => {
        const fetchProperty = async () => {
            // Assumindo que você tem um ID de propriedade fixo ou uma lógica para obtê-lo.
            // Para este exemplo, estou usando um ID fixo "main_property". Ajuste conforme necessário.
            const PROP_ID = "main_property"; 
            setPropertyId(PROP_ID);

            const db = await getFirebaseDb();
            const propertyRef = doc(db, "properties", PROP_ID);
            const propertySnap = await getDoc(propertyRef);

            if (propertySnap.exists()) {
                const propertyData = propertySnap.data() as Property;
                setPolicyContent(propertyData.policies?.content || '');
            }
            setLoading(false);
        };
        fetchProperty();
    }, []);

    const handleSave = async () => {
        if (!propertyId) {
            toast.error("ID da propriedade não encontrado.");
            return;
        }
        setIsSaving(true);
        const toastId = toast.loading("Salvando políticas...");

        try {
            const db = await getFirebaseDb();
            const propertyRef = doc(db, "properties", propertyId);

            // Usa setDoc com merge para criar ou atualizar o campo 'policies'
            await setDoc(propertyRef, {
                policies: {
                    content: policyContent,
                    lastUpdatedAt: serverTimestamp() // Atualiza o timestamp!
                }
            }, { merge: true });

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

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Editor de Políticas e Termos</CardTitle>
                    <CardDescription>
                        Edite o conteúdo que será exibido aos hóspedes. Você pode usar formatação <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Markdown</a> para criar títulos, listas e negrito.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={policyContent}
                        onChange={(e) => setPolicyContent(e.target.value)}
                        placeholder="Escreva aqui os termos e políticas da sua propriedade..."
                        className="min-h-[50vh] font-mono"
                    />
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