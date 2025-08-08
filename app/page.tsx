"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { setCookie } from 'cookies-next';

import { useProperty } from '@/context/PropertyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';
import Image from 'next/image';

const loginSchema = z.object({
  token: z.string().length(6, "O código deve ter 6 dígitos."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function GuestLoginPage() {
    const { property, loading: propertyLoading } = useProperty();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { token: "" },
    });

    const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
        setIsSubmitting(true);
        const toastId = toast.loading("Verificando acesso...");

        try {
            const response = await fetch('/api/auth/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: data.token }),
            });

            // É crucial ler o corpo da resposta como JSON.
            const result = await response.json();

            // Verificamos se a resposta da API foi um sucesso (status 2xx).
            if (!response.ok) {
                // Se não foi, lançamos um erro com a mensagem vinda da API.
                // Isso garante que o 'catch' exibirá o erro correto.
                throw new Error(result.error || 'Falha na autenticação. Verifique o código.');
            }

            // SE CHEGOU AQUI, O LOGIN FOI UM SUCESSO!
            // 1. Salva o token customizado em um cookie para ser usado pelo Firebase no cliente.
            setCookie('guest-token', result.customToken, { maxAge: 60 * 60 * 24 }); // Expira em 1 dia

            // 2. Informa o usuário do sucesso e redireciona.
            toast.success("Acesso liberado! Redirecionando...", { id: toastId });
            
            // 3. Redireciona para o painel do hóspede.
            router.push('/portal/dashboard'); 

        } catch (error: any) {
            // Este bloco agora captura erros de rede ou os erros que lançamos acima.
            console.error("Login error:", error);
            toast.error("Falha no acesso", {
                id: toastId,
                description: error.message, // Exibe a mensagem de erro correta.
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (propertyLoading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Toaster richColors position="top-center" />
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    {property?.logoUrl && <Image src={property.logoUrl} alt={property.name} width={96} height={96} className="mx-auto mb-4 rounded-md" />}
                    <CardTitle className="text-2xl">Portal do Hóspede</CardTitle>
                    <CardDescription>Insira seu código de acesso para continuar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="token"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col items-center">
                                        <FormLabel>Código de Acesso</FormLabel>
                                        <FormControl>
                                            <InputOTP maxLength={6} {...field}>
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={0} />
                                                    <InputOTPSlot index={1} />
                                                    <InputOTPSlot index={2} />
                                                    <InputOTPSlot index={3} />
                                                    <InputOTPSlot index={4} />
                                                    <InputOTPSlot index={5} />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                                Entrar
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
    );
}