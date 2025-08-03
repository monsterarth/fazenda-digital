"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  token: z.string().min(6, "O token deve ter 6 caracteres."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function GuestLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: isGuestLoading } = useGuest();
  const { property, loading: isPropertyLoading } = useProperty();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/portal/dashboard');
    }
  }, [isAuthenticated, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      token: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    // A conversão para toUpperCase() foi removida daqui.
    const success = await login(data.token); 
    if (success) {
      toast.success('Login realizado com sucesso! Redirecionando...');
    } else {
      toast.error('Token inválido ou expirado. Verifique o código e tente novamente.');
      form.reset();
    }
    setIsSubmitting(false);
  };

  const pageIsLoading = isGuestLoading || isPropertyLoading;

  if (pageIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if(isAuthenticated) {
    return null;
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            {property?.logoUrl && (
              <Image
                src={property.logoUrl}
                alt={`Logo de ${property.name}`}
                width={80}
                height={80}
                className="mx-auto mb-4 rounded-md object-cover"
              />
            )}
            <CardTitle className="text-2xl">Acesse sua Estadia</CardTitle>
            <CardDescription>
              Use o token de acesso que enviamos para seu WhatsApp ou e-mail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Token de Acesso</FormLabel>
                      <FormControl>
                        <div className="flex justify-center">
                          <InputOTP maxLength={6} {...field} onComplete={form.handleSubmit(onSubmit)}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </FormControl>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Entrar
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}