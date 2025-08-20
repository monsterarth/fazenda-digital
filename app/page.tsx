// fazenda-digital/app/page.tsx

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { setCookie } from 'cookies-next';
import Link from 'next/link';
import Image from 'next/image';

import { useProperty } from '@/context/PropertyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';

const loginSchema = z.object({
  token: z.string().length(6, "O código deve ter 6 dígitos."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function GuestLoginContent() {
  const { property, loading: propertyLoading } = useProperty();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha na autenticação. Verifique o código.');
      }

      setCookie('guest-token', result.customToken, { maxAge: 60 * 60 * 24 });
      toast.success("Acesso liberado! Redirecionando...", { id: toastId });
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Falha no acesso", {
        id: toastId,
        description: error.message,
      });
      // SE FALHAR, E O TOKEN VEIO DA URL, REDIRECIONA PARA LIMPAR A URL
      if (searchParams.get('token')) {
        router.replace('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl && tokenFromUrl.length === 6) {
      form.setValue('token', tokenFromUrl);
      onSubmit({ token: tokenFromUrl });
    }
  }, [searchParams]);

  if (propertyLoading || searchParams.get('token')) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-brand-dark-green animate-spin" />
        <p className="text-brand-dark-green font-semibold">Validando acesso via QR Code...</p>
      </div>
    );
  }

  return (
    <Card className="z-10 w-full max-w-md bg-white/80 backdrop-blur-sm shadow-xl border-brand-light-green border-2">
      <CardHeader className="text-center">
        {property?.logoUrl && (
          <Image
            priority
            src={property.logoUrl}
            alt={property.name}
            width={96}
            height={96}
            className="mx-auto mb-4 rounded-md shadow-lg"
          />
        )}
        <CardTitle className="text-2xl text-brand-dark-green font-sans-serif">Portal do Hóspede</CardTitle>
        <CardDescription className="text-brand-dark-green/90">
          Experiências para descobrir. Insira seu código de acesso para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                  <FormLabel className="text-brand-dark-green">Código de Acesso</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field}>
                      <InputOTPGroup className="space-x-2">
                        <InputOTPSlot index={0} className="border-brand-mid-green focus-visible:ring-brand-mid-green" />
                        <InputOTPSlot index={1} className="border-brand-mid-green focus-visible:ring-brand-mid-green" />
                        <InputOTPSlot index={2} className="border-brand-mid-green focus-visible:ring-brand-mid-green" />
                      </InputOTPGroup>
                      <InputOTPGroup className="space-x-2">
                        <InputOTPSlot index={3} className="border-brand-mid-green focus-visible:ring-brand-mid-green" />
                        <InputOTPSlot index={4} className="border-brand-mid-green focus-visible:ring-brand-mid-green" />
                        <InputOTPSlot index={5} className="border-brand-mid-green focus-visible:ring-brand-mid-green" />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage className="text-brand-error" />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-brand-dark-green text-white hover:bg-brand-mid-green transition-colors duration-200"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Entrar
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function GuestLoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://od6apn3gvpg0jwyr.public.blob.vercel-storage.com/CAU_0530.jpg"
          alt="Paisagem natural da Fazenda do Rosa"
          layout="fill"
          objectFit="cover"
          quality={100}
          className="pointer-events-none"
        />
        <div className="absolute inset-0 bg-brand-dark-green opacity-50"></div>
      </div>
      <Toaster richColors position="top-center" />
      
      {/* Suspense é necessário para usar useSearchParams */}
      <Suspense fallback={
        <div className="flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-white animate-spin" />
        </div>
      }>
        <GuestLoginContent />
      </Suspense>

      <Link
        href="/admin/login"
        className="absolute bottom-2 right-2 text-white/10 text-xs hover:text-white/50 transition-colors"
        aria-label="Acesso do administrador"
      >
        Admin
      </Link>
    </main>
  );
}