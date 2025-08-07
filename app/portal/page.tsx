"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useProperty } from '@/context/PropertyContext';
import { Stay, Booking } from '@/types';
import { useGuest } from '@/context/GuestProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Toaster, toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// ## INÍCIO DA CORREÇÃO: Schema atualizado para aceitar apenas 6 números ##
const loginSchema = z.object({ 
  token: z.string().regex(/^\d{6}$/, "O token deve conter exatamente 6 números."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function GuestLoginPage() {
  const router = useRouter();
  const { property, loading: isPropertyLoading } = useProperty();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setStay } = useGuest();

  useEffect(() => {
    const savedStayJSON = sessionStorage.getItem('synapse-stay');
    if (savedStayJSON) {
      router.replace('/portal/dashboard');
    }
  }, [router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { token: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.token }),
      });
      const stayData = await response.json();
      if (!response.ok) throw new Error(stayData.error || 'Falha no login.');

      const db = await getFirebaseDb();
      const bookingsQuery = query(collection(db, "bookings"), where("stayId", "==", stayData.id));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      
      const stayWithBookings: Stay = { ...stayData, bookings: bookingsData };
      
      setStay(stayWithBookings);
      sessionStorage.setItem('synapse-stay', JSON.stringify(stayWithBookings));

      toast.success('Login bem-sucedido! Redirecionando...');
      router.push('/portal/dashboard');

    } catch (error: any) {
      toast.error(error.message);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPropertyLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            {property?.logoUrl && <Image src={property.logoUrl} alt={`Logo de ${property.name}`} width={80} height={80} className="mx-auto mb-4 rounded-md object-cover" />}
            <CardTitle className="text-2xl">Acesse sua Estadia</CardTitle>
            <CardDescription>Use o token de acesso de 6 dígitos.</CardDescription>
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
                          {/* ## INÍCIO DA CORREÇÃO: Removida a propriedade 'pattern' ## */}
                          <InputOTP 
                            maxLength={6} 
                            {...field}
                            onComplete={form.handleSubmit(onSubmit)}
                          >
                          {/* ## FIM DA CORREÇÃO ## */}
                            <InputOTPGroup>
                              <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </FormControl>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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