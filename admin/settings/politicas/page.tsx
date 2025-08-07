"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Property } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, FileText, Eye, Pencil } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Importa o componente de Abas
import ReactMarkdown from 'react-markdown'; // Importa o renderizador de Markdown
import remarkGfm from 'remark-gfm'; // Importa o plugin GFM

export default function ManagePoliciesPage() {
    const [policyContent, setPolicyContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [propertyId, setPropertyId] = useState<string | null>(null);

    useEffect(() => {
        const fetchProperty = async () => {
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

            await setDoc(propertyRef, {
                policies: {
                    content: policyContent,
                    lastUpdatedAt: serverTimestamp()
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
                        Edite o conteúdo que será exibido aos hóspedes. Use a aba "Editar" para escrever e "Visualizar" para ver o resultado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* ## INÍCIO DA CORREÇÃO: Interface de Abas ## */}
                    <Tabs defaultValue="edit" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="edit"><Pencil className="mr-2 h-4 w-4" /> Editar</TabsTrigger>
                            <TabsTrigger value="preview"><Eye className="mr-2 h-4 w-4" /> Visualizar</TabsTrigger>
                        </TabsList>
                        <TabsContent value="edit" className="mt-4">
                            <Textarea
                                value={policyContent}
                                onChange={(e) => setPolicyContent(e.target.value)}
                                placeholder="Escreva aqui usando a sintaxe Markdown. Ex: `# Título`, `* item de lista`, `**negrito**`."
                                className="min-h-[50vh] font-mono"
                            />
                        </TabsContent>
                        <TabsContent value="preview" className="mt-4">
                            <div className="prose dark:prose-invert max-w-none rounded-md border p-4 min-h-[50vh]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {policyContent || "A visualização aparecerá aqui."}
                                </ReactMarkdown>
                            </div>
                        </TabsContent>
                    </Tabs>
                    {/* ## FIM DA CORREÇÃO ## */}
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