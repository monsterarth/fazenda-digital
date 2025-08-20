"use client";

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { getFirebaseDb, uploadFile } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { Property, MessageLog } from '@/types';
import { toast, Toaster } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Save, ClipboardCopy } from 'lucide-react';

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
        // Novos modelos para WhatsApp
        whatsappPreCheckIn: z.string().min(1, "Modelo de mensagem é obrigatório."),
        whatsappWelcome: z.string().min(1, "Modelo de mensagem é obrigatório."),
        whatsappBreakfastReminder: z.string().min(1, "Modelo de mensagem é obrigatório."),
        whatsappFeedbackRequest: z.string().min(1, "Modelo de mensagem é obrigatório."),
    }),
    breakfast: z.object({
        type: z.enum(['delivery', 'on-site']),
        orderingStartTime: z.string(),
        orderingEndTime: z.string(),
    }),
});

type PropertyFormData = z.infer<typeof propertySchema>;

export default function PersonalizationPage() {
    const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
    
    const form = useForm<PropertyFormData>({
        resolver: zodResolver(propertySchema),
        defaultValues: async () => {
            const db = await getFirebaseDb();
            const docRef = doc(db, 'properties', 'default');
            const docSnap = await getDoc(docRef);
            const data = docSnap.exists() ? docSnap.data() : {};

            return {
                name: data.name || 'Minha Pousada',
                logoUrl: data.logoUrl || '',
                colors: data.colors || { primary: '#000000', secondary: '#64748b', accent: '#f59e0b', background: '#f8fafc', card: '#ffffff', text: '#0d172a', textOnPrimary: '#ffffff' },
                messages: {
                    preCheckInWelcomeTitle: data.messages?.preCheckInWelcomeTitle || 'Bem-vindo(a)!',
                    preCheckInWelcomeSubtitle: data.messages?.preCheckInWelcomeSubtitle || 'Complete seu pré-check-in para agilizar sua chegada.',
                    preCheckInSuccessTitle: data.messages?.preCheckInSuccessTitle || 'Tudo pronto!',
                    preCheckInSuccessSubtitle: data.messages?.preCheckInSuccessSubtitle || 'Seu pré-check-in foi concluído com sucesso.',
                    portalWelcomeTitle: data.messages?.portalWelcomeTitle || 'Olá, {guestName}!',
                    portalWelcomeSubtitle: data.messages?.portalWelcomeSubtitle || 'O que podemos fazer por você hoje?',
                    surveySuccessTitle: data.messages?.surveySuccessTitle || 'Obrigado!',
                    surveySuccessSubtitle: data.messages?.surveySuccessSubtitle || 'Sua opinião é muito importante para nós.',
                    breakfastBasketClosed: data.messages?.breakfastBasketClosed || 'Os pedidos para o café da manhã estão encerrados por hoje.',
                    breakfastBasketDefaultMessage: data.messages?.breakfastBasketDefaultMessage || 'Fique tranquilo, uma cesta padrão para {X} pessoa(s) será preparada para você.',
                    whatsappPreCheckIn: data.messages?.whatsappPreCheckIn || `Olá! 👋\n\nEstamos ansiosos pela sua chegada à {propertyName}! Para agilizar sua entrada, por favor, realize seu pré-check-in online:\n\n👉 {preCheckInLink}`,
                    whatsappWelcome: data.messages?.whatsappWelcome || `Seja muito bem-vindo(a) à {propertyName}, {guestName}! ✨\n\n🔑 Seu Portal do Hóspede (código {token}):\n👉 {portalLink}\n\n📶 Wi-Fi: {wifiSsid}\n🔒 Senha: {wifiPassword}\n\nTenha uma ótima estadia!`,
                    whatsappBreakfastReminder: data.messages?.whatsappBreakfastReminder || `Olá, {guestName}! 🥐\nLembrete amigável para pedir sua cesta de café da manhã para amanhã até as {deadline} hoje.\n👉 {portalLink}`,
                    whatsappFeedbackRequest: data.messages?.whatsappFeedbackRequest || `Olá, {guestName}!\n\nFoi um prazer recebê-lo(a). Gostaríamos muito de saber como foi sua experiência. Poderia nos avaliar?\n\n👉 {feedbackLink}`,
                },
                breakfast: {
                    type: data.breakfast?.type || 'delivery',
                    orderingStartTime: data.breakfast?.orderingStartTime || '09:00',
                    orderingEndTime: data.breakfast?.orderingEndTime || '18:00',
                }
            } as PropertyFormData;
        },
    });

    const { isSubmitting, isDirty, isLoading } = form.formState;
    const breakfastType = form.watch('breakfast.type');

    useEffect(() => {
        const fetchLogs = async () => {
            const db = await getFirebaseDb();
            const q = query(collection(db, "messageLogs"), orderBy("copiedAt", "desc"), limit(10));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageLog));
                setMessageLogs(logs);
            });
            return () => unsubscribe();
        };
        fetchLogs();
    }, []);

    const onSubmit: SubmitHandler<PropertyFormData> = async (data) => {
        const toastId = toast.loading('Salvando alterações...');
        try {
            const db = await getFirebaseDb();
            const { logoFile, ...dataToSave } = data;
            if (logoFile) {
                const downloadURL = await uploadFile(logoFile, `properties/default/logo_${Date.now()}`);
                dataToSave.logoUrl = downloadURL;
            }
            await setDoc(doc(db, 'properties', 'default'), dataToSave, { merge: true });
            toast.success('Configurações salvas com sucesso!', { id: toastId });
            form.reset(dataToSave);
        } catch (error) {
            console.error(error);
            toast.error('Falha ao salvar as configurações.', { id: toastId, description: (error as Error).message });
        }
    };

    const handleCopyAgain = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            toast.success("Mensagem copiada novamente!");
        });
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
                        <h1 className="text-3xl font-bold tracking-tight">Aparência e Textos</h1>
                        <p className="text-muted-foreground">Configure a identidade e as comunicações da sua propriedade.</p>
                    </div>
                    <Button type="submit" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>

                <Tabs defaultValue="mensagens" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="identidade">Identidade</TabsTrigger>
                        <TabsTrigger value="mensagens">Modelos de Mensagem</TabsTrigger>
                        <TabsTrigger value="sistema">Textos do Sistema</TabsTrigger>
                    </TabsList>

                    <TabsContent value="identidade">
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
                    </TabsContent>
                    
                    <TabsContent value="mensagens">
                        <Card>
                            <CardHeader>
                                <CardTitle>Modelos para Comunicação (WhatsApp)</CardTitle>
                                <CardDescription>Edite os textos padrão para envio manual aos hóspedes. Use as variáveis entre chaves {"{}"} para personalização automática.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                <FormField control={form.control} name="messages.whatsappPreCheckIn" render={({ field }) => (
                                    <FormItem><FormLabel>Mensagem de Pré-Check-in</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormDescription>Variáveis: {"{propertyName}"}, {"{preCheckInLink}"}</FormDescription><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="messages.whatsappWelcome" render={({ field }) => (
                                    <FormItem><FormLabel>Mensagem de Boas-Vindas</FormLabel><FormControl><Textarea {...field} rows={6} /></FormControl><FormDescription>Variáveis: {"{propertyName}"}, {"{guestName}"}, {"{token}"}, {"{portalLink}"}, {"{wifiSsid}"}, {"{wifiPassword}"}</FormDescription><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="messages.whatsappBreakfastReminder" render={({ field }) => (
                                    <FormItem><FormLabel>Lembrete de Café da Manhã</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormDescription>Variáveis: {"{guestName}"}, {"{deadline}"}, {"{portalLink}"}</FormDescription><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="messages.whatsappFeedbackRequest" render={({ field }) => (
                                    <FormItem><FormLabel>Pedido de Avaliação</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormDescription>Variáveis: {"{propertyName}"}, {"{guestName}"}, {"{feedbackLink}"}</FormDescription><FormMessage /></FormItem>
                                )} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sistema">
                        <Card>
                            <CardHeader><CardTitle>Textos do Sistema</CardTitle><CardDescription>Textos exibidos em pontos-chave da jornada do hóspede dentro da plataforma.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2">Portal do Hóspede</h3>
                                <FormField control={form.control} name="messages.portalWelcomeTitle" render={({ field }) => ( <FormItem><FormLabel>Título Boas-vindas</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Use {"{guestName}"} para inserir o nome do hóspede.</FormDescription></FormItem> )} />
                                <FormField control={form.control} name="messages.portalWelcomeSubtitle" render={({ field }) => ( <FormItem><FormLabel>Subtítulo Boas-vindas</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="messages.breakfastBasketClosed" render={({ field }) => ( <FormItem><FormLabel>Msg. Pedidos de Cesta Encerrados</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="messages.breakfastBasketDefaultMessage" render={({ field }) => ( <FormItem><FormLabel>Msg. Cesta Padrão (Pedidos Encerrados)</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Use {"{X}"} para o n° de hóspedes.</FormDescription></FormItem> )} />
                            
                                <h3 className="font-semibold text-lg border-b pb-2 pt-4">Pré-Check-in</h3>
                                <FormField control={form.control} name="messages.preCheckInWelcomeTitle" render={({ field }) => ( <FormItem><FormLabel>Título de Boas-vindas</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="messages.preCheckInWelcomeSubtitle" render={({ field }) => ( <FormItem><FormLabel>Subtítulo de Boas-vindas</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="messages.preCheckInSuccessTitle" render={({ field }) => ( <FormItem><FormLabel>Título de Sucesso</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="messages.preCheckInSuccessSubtitle" render={({ field }) => ( <FormItem><FormLabel>Subtítulo de Sucesso</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />

                                <h3 className="font-semibold text-lg border-b pb-2 pt-4">Pesquisa de Satisfação</h3>
                                <FormField control={form.control} name="messages.surveySuccessTitle" render={({ field }) => ( <FormItem><FormLabel>Título de Sucesso</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                <FormField control={form.control} name="messages.surveySuccessSubtitle" render={({ field }) => ( <FormItem><FormLabel>Subtítulo de Sucesso</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Mensagens Copiadas</CardTitle>
                        <CardDescription>Recupere aqui as últimas 10 mensagens geradas pelo Centro de Comunicações.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {messageLogs.length > 0 ? messageLogs.map(log => (
                                <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg">
                                    <div className="space-y-1">
                                        <p className="font-semibold">{log.guestName} <span className="font-normal text-muted-foreground">- {log.type}</span></p>
                                        <p className="text-xs text-muted-foreground">Copiado por {log.actor} {formatDistanceToNow(log.copiedAt.toDate(), { addSuffix: true, locale: ptBR })}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleCopyAgain(log.content)}><ClipboardCopy className="mr-2 h-4 w-4"/> Copiar Novamente</Button>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem copiada recentemente.</p>}
                        </div>
                    </CardContent>
                </Card>

            </form>
        </Form>
    );
}