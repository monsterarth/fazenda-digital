"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getFirebaseDb } from '@/lib/firebase'; // Apenas para buscar dados da propriedade
import { doc, getDoc } from 'firebase/firestore';
import { Property } from '@/types';
import { useGuest } from '@/context/GuestProvider'; // ++ Importa o useGuest

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';
import Image from 'next/image';

const loginSchema = z.object({
  token: z.string().length(6, "O código deve ter 6 dígitos."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function GuestLoginPage() {
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { login } = useGuest(); // ++ Pega a função de login do nosso contexto

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { token: "" },
    });

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const db = await getFirebaseDb();
                const docRef = doc(db, 'properties', 'default');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) { setProperty(docSnap.data() as Property); }
            } catch (error) { console.error("Failed to fetch property", error); } 
            finally { setLoading(false); }
        };
        fetchProperty();
    }, []);

    const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
        setLoading(true);
        const toastId = toast.loading("Verificando acesso...");

        try {
            const response = await fetch('/api/auth/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: data.token }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Falha na autenticação.');
            }

            // ++ A MUDANÇA CRÍTICA:
            // Usamos a função login do contexto. Ela irá atualizar o estado
            // do GuestProvider (isAuthenticated, user, stay) de forma síncrona.
            await login(result.customToken);

            toast.success("Acesso liberado! Redirecionando...", { id: toastId });
            
            // Agora, quando o redirecionamento acontecer, o GuestProvider já terá
            // o estado `isAuthenticated: true`, e o layout não irá te jogar de volta.
            router.push('/portal/dashboard'); 

        } catch (error: any) {
            toast.error("Falha no acesso", {
                id: toastId,
                description: error.message,
            });
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
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
                                                    <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                                                    <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                                Entrar
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
    );
}