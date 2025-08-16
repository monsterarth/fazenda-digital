// app/admin/(dashboard)/settings/personalizacao/page.tsx

"use client";

import React, { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { getFirebaseDb, uploadFile } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useProperty } from '@/context/PropertyContext';

// Imports dos componentes de UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Palette, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label'; // <-- CORREÇÃO: Label importado

// Esquema de validação simplificado
const propertySchema = z.object({
    name: z.string().min(1, "O nome da propriedade é obrigatório."),
    logoUrl: z.string().url().or(z.literal('')),
    logoFile: z.instanceof(File).optional(),
    colors: z.object({
        primary: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Deve ser uma cor hexadecimal válida."),
        background: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Deve ser uma cor hexadecimal válida."),
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
    }).passthrough(), // Usamos passthrough para não dar erro em campos extras
    breakfast: z.object({
        type: z.enum(['delivery', 'on-site']),
        orderingStartTime: z.string(),
        orderingEndTime: z.string(),
    }),
});

type PropertyFormData = z.infer<typeof propertySchema>;

// --- COMPONENTE DE PREVIEW (WYSIWYG) ---
const ThemePreview = () => (
    <Card className="w-full">
        <CardHeader>
            <CardTitle>Preview em Tempo Real</CardTitle>
            <CardDescription>Veja como suas cores serão aplicadas nos componentes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6 border-t bg-background text-foreground rounded-b-md">
            <h3 className="text-lg font-semibold text-foreground">Exemplo de Título</h3>
            <p className="text-sm text-muted-foreground">
                Este é um parágrafo de exemplo para mostrar a cor do texto. Ele contém <a href="#" className="text-primary underline">um link</a> para demonstrar a cor principal.
            </p>
            <div className="flex flex-wrap gap-2">
                <Button>Botão Primário</Button>
                <Button variant="secondary">Botão Secundário</Button>
                <Button variant="outline">Borda</Button>
            </div>
            <Card className="bg-card text-card-foreground">
                <CardHeader><CardTitle>Card de Exemplo</CardTitle></CardHeader>
                <CardContent><p>Este é um card. Usado para agrupar informações no portal.</p></CardContent>
            </Card>
            <div className="flex items-center space-x-2">
                <Switch id="airplane-mode" />
                <Label htmlFor="airplane-mode">Modo Avião</Label>
            </div>
             <Badge>Badge</Badge>
        </CardContent>
    </Card>
);

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
export default function PersonalizationPage() {
    const { property, loading: isPropertyLoading, setThemeColors } = useProperty();

    const form = useForm<PropertyFormData>({
        resolver: zodResolver(propertySchema),
    });

    useEffect(() => {
        if (property) {
            form.reset({
                name: property.name || '',
                logoUrl: property.logoUrl || '',
                colors: {
                    primary: property.colors?.primary || '#97A25F',
                    background: property.colors?.background || '#F7FDF2',
                },
                messages: property.messages || {},
                breakfast: property.breakfast || { type: 'delivery', orderingStartTime: '09:00', orderingEndTime: '18:00' },
            });
        }
    }, [property, form.reset]);

    const { isSubmitting, isDirty } = form.formState;

    const onSubmit: SubmitHandler<PropertyFormData> = async (data) => {
        const toastId = toast.loading('Salvando alterações...');
        try {
            const db = await getFirebaseDb();
            const { logoFile, ...dataToSave } = data;

            if (logoFile) {
                const downloadURL = await uploadFile(logoFile, `properties/main_property/logo_${Date.now()}`);
                dataToSave.logoUrl = downloadURL;
            }

            await setDoc(doc(db, 'properties', 'main_property'), dataToSave, { merge: true });

            toast.success('Configurações salvas com sucesso!', { id: toastId });
            form.reset(dataToSave);
        } catch (error) {
            console.error(error);
            toast.error('Falha ao salvar as configurações.', { id: toastId, description: (error as Error).message });
        }
    };
    
    const handleColorChange = (colorName: 'primary' | 'background', value: string) => {
        form.setValue(`colors.${colorName}`, value, { shouldDirty: true });
        if (setThemeColors) {
            setThemeColors(currentColors => ({
                ...currentColors!,
                [colorName]: value
            }));
        }
    };

    if (isPropertyLoading) {
        return <div className="space-y-4 p-6"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="container mx-auto p-4 md:p-6 space-y-6">
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

                <Tabs defaultValue="appearance">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="appearance"><Settings className="mr-2 h-4 w-4" /> Aparência</TabsTrigger>
                        <TabsTrigger value="colors"><Palette className="mr-2 h-4 w-4" /> Cores</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="appearance">
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
                           <div className="lg:col-span-1 space-y-6">
                                <Card>
                                    <CardHeader><CardTitle>Identidade da Marca</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome da Pousada</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        {/* CORREÇÃO: Removido o 'value' do field do input de arquivo */}
                                        <FormField control={form.control} name="logoFile" render={({ field: { onChange, onBlur, name, ref } }) => (
                                            <FormItem>
                                                <FormLabel>Logo</FormLabel>
                                                {form.getValues('logoUrl') && <Image src={form.getValues('logoUrl')} alt="Logo" width={128} height={128} className="my-2 border rounded-md object-contain" />}
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        accept="image/png, image/jpeg, image/svg+xml"
                                                        onBlur={onBlur}
                                                        name={name}
                                                        ref={ref}
                                                        onChange={(e) => onChange(e.target.files?.[0])}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
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
                                         {form.watch('breakfast.type') === 'delivery' && (
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
                           </div>
                       </div>
                    </TabsContent>

                    <TabsContent value="colors">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Editor de Cores</CardTitle>
                                    <CardDescription>Escolha as cores base da sua marca. As outras tonalidades serão calculadas automaticamente.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField control={form.control} name="colors.primary" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cor Principal</FormLabel>
                                            <FormDescription>Usada em botões, links e destaques.</FormDescription>
                                            <div className="flex items-center gap-2">
                                                <Input type="color" value={field.value} onChange={(e) => handleColorChange('primary', e.target.value)} className="p-1 h-10 w-14" />
                                                <Input value={field.value} onChange={(e) => handleColorChange('primary', e.target.value)} />
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="colors.background" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cor de Fundo</FormLabel>
                                            <FormDescription>A cor de fundo principal do portal.</FormDescription>
                                            <div className="flex items-center gap-2">
                                                <Input type="color" value={field.value} onChange={(e) => handleColorChange('background', e.target.value)} className="p-1 h-10 w-14" />
                                                <Input value={field.value} onChange={(e) => handleColorChange('background', e.target.value)} />
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                            <ThemePreview />
                        </div>
                    </TabsContent>
                </Tabs>
            </form>
        </Form>
    );
}