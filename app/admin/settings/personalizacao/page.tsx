"use client";

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { getFirebaseDb, uploadFile } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Property } from '@/types';
import { toast, Toaster } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Save } from 'lucide-react';

// Esquema de validação com Zod para garantir a integridade dos dados do formulário
const propertySchema = z.object({
    name: z.string().min(1, "O nome da propriedade é obrigatório."),
    logoUrl: z.string().url().or(z.literal('')),
    logoFile: z.instanceof(File).optional(),
    colors: z.object({
        primary: z.string(),
        secondary: z.string(),
        accent: z.string(),
        background: z.string(),
        card: z.string(),
        text: z.string(),
        textOnPrimary: z.string(),
    }),
    messages: z.object({
        preCheckInWelcomeTitle: z.string(),
        preCheckInWelcomeSubtitle: z.string(),
        preCheckInSuccessTitle: z.string(),
        preCheckInSuccessSubtitle: z.string(),
        portalWelcomeTitle: z.string(),
        portalWelcomeSubtitle: z.string(),
        surveySuccessTitle: z.string(),
        surveySuccessSubtitle: z.string(),
        breakfastBasketClosed: z.string(),
        breakfastBasketDefaultMessage: z.string(),
    }),
    breakfast: z.object({
        type: z.enum(['delivery', 'on-site']),
        orderingStartTime: z.string(),
        orderingEndTime: z.string(),
    }),
});

// Remove `logoFile` para o tipo do Firestore, pois não é salvo
type PropertyFormData = z.infer<typeof propertySchema>;
type FirestorePropertyData = Omit<PropertyFormData, 'logoFile'>;


export default function PersonalizationPage() {
    
    const form = useForm<PropertyFormData>({
        resolver: zodResolver(propertySchema),
        defaultValues: async () => {
            const db = await getFirebaseDb();
            const docRef = doc(db, 'properties', 'default');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Mescla os dados do Firestore com os valores padrão para garantir que todos os campos existam
                const data = docSnap.data();
                return {
                    name: data.name || 'Nome Padrão',
                    logoUrl: data.logoUrl || '',
                    colors: data.colors || { primary: '#000000', secondary: '#64748b', accent: '#f59e0b', background: '#f8fafc', card: '#ffffff', text: '#0d172a', textOnPrimary: '#ffffff' },
                    messages: {
                        ...{
                            preCheckInWelcomeTitle: 'Bem-vindo(a)!',
                            preCheckInWelcomeSubtitle: 'Complete seu pré-check-in para agilizar sua chegada.',
                            preCheckInSuccessTitle: 'Tudo pronto!',
                            preCheckInSuccessSubtitle: 'Seu pré-check-in foi concluído com sucesso.',
                            portalWelcomeTitle: 'Olá, {guestName}!',
                            portalWelcomeSubtitle: 'O que podemos fazer por você hoje?',
                            surveySuccessTitle: 'Obrigado!',
                            surveySuccessSubtitle: 'Sua opinião é muito importante para nós.',
                            breakfastBasketClosed: 'Os pedidos para o café da manhã estão encerrados por hoje.',
                            breakfastBasketDefaultMessage: 'Fique tranquilo, uma cesta padrão para {X} pessoa(s) será preparada para você.'
                        },
                        ...data.messages
                    },
                    breakfast: {
                        ...{ type: 'delivery', orderingStartTime: '09:00', orderingEndTime: '18:00' },
                        ...data.breakfast
                    }
                } as PropertyFormData;
            }
            // Retorna um valor padrão completo se o documento não existir
            return {
                name: 'Minha Pousada',
                logoUrl: '',
                colors: { primary: '#000000', secondary: '#64748b', accent: '#f59e0b', background: '#f8fafc', card: '#ffffff', text: '#0d172a', textOnPrimary: '#ffffff' },
                messages: {
                    preCheckInWelcomeTitle: 'Bem-vindo(a)!',
                    preCheckInWelcomeSubtitle: 'Complete seu pré-check-in para agilizar sua chegada.',
                    preCheckInSuccessTitle: 'Tudo pronto!',
                    preCheckInSuccessSubtitle: 'Seu pré-check-in foi concluído com sucesso.',
                    portalWelcomeTitle: 'Olá, {guestName}!',
                    portalWelcomeSubtitle: 'O que podemos fazer por você hoje?',
                    surveySuccessTitle: 'Obrigado!',
                    surveySuccessSubtitle: 'Sua opinião é muito importante para nós.',
                    breakfastBasketClosed: 'Os pedidos para o café da manhã estão encerrados por hoje.',
                    breakfastBasketDefaultMessage: 'Fique tranquilo, uma cesta padrão para {X} pessoa(s) será preparada para você.'
                },
                breakfast: {
                    type: 'delivery',
                    orderingStartTime: '09:00',
                    orderingEndTime: '18:00',
                },
            };
        },
    });

    const { isSubmitting, isDirty, isLoading } = form.formState;
    const breakfastType = form.watch('breakfast.type');

    const onSubmit: SubmitHandler<PropertyFormData> = async (data) => {
        const toastId = toast.loading('Salvando alterações...');
        try {
            const db = await getFirebaseDb();
            let finalData: FirestorePropertyData = { ...data };

            if (data.logoFile) {
                const downloadURL = await uploadFile(data.logoFile, `properties/default/logo_${Date.now()}`);
                finalData.logoUrl = downloadURL;
            }

            // Remove o campo de arquivo antes de salvar
            const { logoFile, ...dataToSave } = finalData;

            await setDoc(doc(db, 'properties', 'default'), dataToSave, { merge: true });
            toast.success('Configurações salvas com sucesso!', { id: toastId });
            form.reset(data); // Reseta o formulário para o novo estado salvo
        } catch (error) {
            console.error(error);
            toast.error('Falha ao salvar as configurações.', { id: toastId, description: (error as Error).message });
        }
    };

    if (isLoading) {
        return <div className="space-y-4 p-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="container mx-auto p-4 md:p-6 space-y-6">
                <Toaster richColors position="top-center" />
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Personalização</h1>
                        <p className="text-muted-foreground">Configure a identidade visual e as mensagens da plataforma.</p>
                    </div>
                    <Button type="submit" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1 space-y-6">
                        {/* Identidade da Marca e Logo */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Identidade da Marca</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                               <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da Pousada</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="logoFile" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Logo</FormLabel>
                                        {form.getValues('logoUrl') && <Image src={form.getValues('logoUrl')} alt="Logo" width={128} height={128} className="my-2 border rounded-md object-contain" />}
                                        <FormControl>
                                            <Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => field.onChange(e.target.files?.[0])} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                            </CardContent>
                        </Card>

                        {/* Configurações do Café da Manhã */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Café da Manhã</CardTitle>
                                <CardDescription>Defina como o café da manhã será oferecido.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField control={form.control} name="breakfast.type" render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Modalidade</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="on-site" /></FormControl><FormLabel className="font-normal">Servido no Salão</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="delivery" /></FormControl><FormLabel className="font-normal">Cesta na Cabana</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )} />
                                {breakfastType === 'delivery' && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <p className="text-sm font-medium text-muted-foreground">Horário para Pedidos da Cesta</p>
                                        <FormField control={form.control} name="breakfast.orderingStartTime" render={({ field }) => ( <FormItem><FormLabel>Abre às</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem> )} />
                                        <FormField control={form.control} name="breakfast.orderingEndTime" render={({ field }) => ( <FormItem><FormLabel>Encerra às</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem> )} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                         {/* Mensagens Customizadas */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Mensagens Customizadas</CardTitle>
                                <CardDescription>Textos exibidos em pontos-chave da jornada do hóspede.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2">Portal do Hóspede</h3>
                                <FormField control={form.control} name="messages.portalWelcomeTitle" render={({ field }) => ( <FormItem><FormLabel>Título Boas-vindas</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Use {"{guestName}"} para inserir o nome do hóspede.</FormDescription></FormItem> )} />
                                <FormField control={form.control} name="messages.portalWelcomeSubtitle" render={({ field }) => ( <FormItem><FormLabel>Subtítulo Boas-vindas</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="messages.breakfastBasketClosed" render={({ field }) => ( <FormItem><FormLabel>Msg. Pedidos de Cesta Encerrados</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="messages.breakfastBasketDefaultMessage" render={({ field }) => ( <FormItem><FormLabel>Msg. Cesta Padrão (Pedidos Encerrados)</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Use {"{X}"} para o n° de hóspedes.</FormDescription></FormItem> )} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    );
}