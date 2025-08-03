"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb, uploadFile } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Property, PropertyColors, PropertyMessages } from '@/types';
import { toast, Toaster } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Save, Upload } from 'lucide-react';
import Image from 'next/image';

const ColorInput = ({ label, color, onChange }: { label: string, color: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div className="flex items-center justify-between border p-2 rounded-md">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{color}</span>
            <Input type="color" value={color} onChange={onChange} className="w-10 h-10 p-1" />
        </div>
    </div>
);

const MessageInput = ({ label, description, value, onChange }: { label: string, description?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }) => (
    <div className="space-y-1">
        <Label>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <Input value={value} onChange={onChange} />
    </div>
);


export default function PersonalizationPage() {
    const [property, setProperty] = useState<Partial<Property>>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchPropertyData = async () => {
            setLoading(true);
            try {
                const db = await getFirebaseDb();
                const docRef = doc(db, 'properties', 'default');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProperty(docSnap.data() as Property);
                } else {
                    // Crie um estado inicial se o documento não existir
                    setProperty({
                        name: 'Nome da Pousada',
                        logoUrl: '',
                        colors: { primary: '#000000', secondary: '#64748b', accent: '#f59e0b', background: '#f8fafc', card: '#ffffff', text: '#0d172a', textOnPrimary: '#ffffff' },
                        messages: { preCheckInWelcomeTitle: 'Bem-vindo(a)!', preCheckInWelcomeSubtitle: 'Complete seu pré-check-in para agilizar sua chegada.', preCheckInSuccessTitle: 'Tudo pronto!', preCheckInSuccessSubtitle: 'Seu pré-check-in foi concluído com sucesso.', portalWelcomeTitle: 'Olá, {guestName}!', portalWelcomeSubtitle: 'O que podemos fazer por você hoje?', surveySuccessTitle: 'Obrigado!', surveySuccessSubtitle: 'Sua opinião é muito importante para nós.', breakfastBasketClosed: 'Os pedidos para o café da manhã estão encerrados por hoje.' }
                    });
                }
            } catch (error) {
                toast.error('Erro ao carregar as configurações de personalização.');
            } finally {
                setLoading(false);
            }
        };
        fetchPropertyData();
    }, []);

    const handleColorChange = (key: keyof PropertyColors, value: string) => {
        setProperty(prev => ({ ...prev, colors: { ...prev.colors!, [key]: value } }));
    };

    const handleMessageChange = (key: keyof PropertyMessages, value: string) => {
        setProperty(prev => ({ ...prev, messages: { ...prev.messages!, [key]: value } }));
    };
    
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const toastId = toast.loading('Salvando alterações...');

        try {
            const db = await getFirebaseDb();
            let finalData = { ...property };
            
            if (logoFile) {
                const downloadURL = await uploadFile(logoFile, `properties/default/logo`);
                finalData.logoUrl = downloadURL;
                setLogoFile(null); // Limpar o arquivo após o upload
            }
            
            await setDoc(doc(db, 'properties', 'default'), finalData, { merge: true });

            toast.success('Configurações salvas com sucesso!', { id: toastId });
        } catch (error) {
            console.error(error)
            toast.error('Falha ao salvar as configurações.', { id: toastId, description: (error as Error).message });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) {
        return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Personalização</h1>
                    <p className="text-muted-foreground">Configure a identidade visual e as mensagens da plataforma.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identidade da Marca</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="propertyName">Nome da Pousada</Label>
                                <Input id="propertyName" value={property.name || ''} onChange={(e) => setProperty(p => ({...p, name: e.target.value}))}/>
                            </div>
                            <div>
                                <Label>Logo</Label>
                                {property.logoUrl && <Image src={property.logoUrl} alt="Logo" width={128} height={128} className="my-2 border rounded-md" />}
                                <Input id="logo-upload" type="file" onChange={handleLogoSelect} accept="image/png, image/jpeg, image/svg+xml" />
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Esquema de Cores</CardTitle>
                            <CardDescription>As cores serão aplicadas em toda a plataforma.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {property.colors && Object.entries(property.colors).map(([key, value]) => (
                                <ColorInput key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} color={value} onChange={(e) => handleColorChange(key as keyof PropertyColors, e.target.value)} />
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mensagens Customizadas</CardTitle>
                             <CardDescription>Personalize os textos exibidos em pontos-chave da jornada do hóspede.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Pré-Check-in</h3>
                            <MessageInput label="Título de Boas-vindas" value={property.messages?.preCheckInWelcomeTitle || ''} onChange={(e) => handleMessageChange('preCheckInWelcomeTitle', e.target.value)} />
                            <MessageInput label="Subtítulo de Boas-vindas" value={property.messages?.preCheckInWelcomeSubtitle || ''} onChange={(e) => handleMessageChange('preCheckInWelcomeSubtitle', e.target.value)} />
                             <MessageInput label="Título de Sucesso" value={property.messages?.preCheckInSuccessTitle || ''} onChange={(e) => handleMessageChange('preCheckInSuccessTitle', e.target.value)} />
                            <MessageInput label="Subtítulo de Sucesso" value={property.messages?.preCheckInSuccessSubtitle || ''} onChange={(e) => handleMessageChange('preCheckInSuccessSubtitle', e.target.value)} />

                             <h3 className="font-semibold text-lg border-b pb-2 pt-4">Portal do Hóspede</h3>
                             <MessageInput label="Título de Boas-vindas" description="Use {guestName} para inserir o nome do hóspede." value={property.messages?.portalWelcomeTitle || ''} onChange={(e) => handleMessageChange('portalWelcomeTitle', e.target.value)} />
                            <MessageInput label="Subtítulo de Boas-vindas" value={property.messages?.portalWelcomeSubtitle || ''} onChange={(e) => handleMessageChange('portalWelcomeSubtitle', e.target.value)} />
                            <MessageInput label="Mensagem de Cestas de Café Encerradas" value={property.messages?.breakfastBasketClosed || ''} onChange={(e) => handleMessageChange('breakfastBasketClosed', e.target.value)} />

                            <h3 className="font-semibold text-lg border-b pb-2 pt-4">Pesquisa de Satisfação</h3>
                            <MessageInput label="Título de Sucesso" value={property.messages?.surveySuccessTitle || ''} onChange={(e) => handleMessageChange('surveySuccessTitle', e.target.value)} />
                            <MessageInput label="Subtítulo de Sucesso" value={property.messages?.surveySuccessSubtitle || ''} onChange={(e) => handleMessageChange('surveySuccessSubtitle', e.target.value)} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}