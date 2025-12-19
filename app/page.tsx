"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { setCookie } from 'cookies-next';
import Link from 'next/link';
import Image from 'next/image';
import { getDoc, doc } from 'firebase/firestore'; // Importação do Firestore
import { getFirebaseDb } from '@/lib/firebase';   // Sua função de conexão

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { Loader2, KeyRound, Clock, Home } from 'lucide-react';

import { checkStayStatusAction, StayStatusResponse } from '@/app/actions/check-stay-status';
import { PreCheckinForm } from '@/components/pre-checkin-form';
import { Property } from '@/types'; // Importar tipo Property

const loginSchema = z.object({
  token: z.string().length(6, "O código deve ter 6 dígitos."),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ViewState = 'LOADING' | 'LOGIN' | 'FORM' | 'WAITING' | 'ENDED';

function GuestPortalContent() {
  const [propertyData, setPropertyData] = useState<Property | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  
  const [view, setView] = useState<ViewState>('LOGIN');
  const [stayData, setStayData] = useState<any>(null);
  const [currentToken, setCurrentToken] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { token: "" },
  });

  // --- CARREGAR PROPRIEDADE DIRETAMENTE ---
  useEffect(() => {
    const loadProperty = async () => {
        try {
            const db = await getFirebaseDb();
            // Tenta buscar 'main_property', se falhar tenta 'default'
            let snap = await getDoc(doc(db, 'properties', 'main_property'));
            
            if (!snap.exists()) {
                console.warn("main_property não encontrado, tentando 'default'...");
                snap = await getDoc(doc(db, 'properties', 'default'));
            }

            if (snap.exists()) {
                console.log("Propriedade carregada:", snap.data()); // Debug
                setPropertyData({ id: snap.id, ...snap.data() } as Property);
            } else {
                console.error("Nenhuma configuração de propriedade encontrada.");
            }
        } catch (error) {
            console.error("Erro ao carregar propriedade:", error);
        } finally {
            setLoadingProperty(false);
        }
    };
    loadProperty();
  }, []);

  const handleTokenProcessing = async (token: string) => {
    if(!token || token.length < 6) return;

    setIsProcessing(true);
    setCurrentToken(token);
    const toastId = toast.loading("Verificando código...");

    try {
      const status: StayStatusResponse = await checkStayStatusAction(token);

      if (!status.valid) {
        toast.error(status.message || "Código inválido", { id: toastId });
        setIsProcessing(false);
        return;
      }

      toast.dismiss(toastId);

      switch (status.action) {
        case 'GO_TO_FORM':
          setStayData(status.stayData);
          setView('FORM');
          break;
        case 'SHOW_WAITING':
          setStayData(status.stayData);
          setView('WAITING');
          break;
        case 'SHOW_ENDED':
          setView('ENDED');
          break;
        case 'DO_LOGIN':
          await performLogin(token);
          break;
        default:
          toast.error("Status desconhecido.");
      }
    } catch (error) {
      console.error("Erro ao verificar token:", error);
      toast.error("Erro de conexão.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const performLogin = async (token: string) => {
    const toastId = toast.loading("Entrando...");
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setCookie('guest-token', result.customToken, { maxAge: 60 * 60 * 24 });
      toast.success("Bem-vindo!", { id: toastId });
      router.push('/dashboard');
    } catch (error: any) {
      toast.error("Falha ao entrar", { id: toastId, description: error.message });
    }
  };

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl && tokenFromUrl.length >= 3) {
      form.setValue('token', tokenFromUrl);
      setTimeout(() => handleTokenProcessing(tokenFromUrl), 500);
    }
  }, [searchParams]);

  if (loadingProperty) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-white p-8 bg-black/40 rounded-lg backdrop-blur-md">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="font-semibold text-lg shadow-black drop-shadow-md">Carregando...</p>
      </div>
    );
  }

  // Fallback seguro se não carregar nada
  const safeProperty = propertyData || { 
    id: 'default', 
    name: 'Portal do Hóspede', 
    logoUrl: '', 
    messages: { preCheckInSuccessTitle: 'Sucesso', preCheckInSuccessSubtitle: 'Dados enviados' },
    policies: { general: { content: "Erro ao carregar políticas." }, pet: { content: "" } }
  } as any;

  // 1. TELA: FORMULÁRIO PRE-CHECK-IN
  if (view === 'FORM') {
    return (
      <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 duration-500 p-4">
        {/* Passamos a propriedade carregada diretamente do banco */}
        <div className="bg-white/95 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
             <PreCheckinForm property={safeProperty} prefilledData={stayData} token={currentToken} />
        </div>
      </div>
    );
  }

  // 2. TELA: AGUARDANDO VALIDAÇÃO
  if (view === 'WAITING') {
    return (
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl border-yellow-400 border-t-4 animate-in fade-in zoom-in-95">
        <CardHeader className="text-center">
            <div className="mx-auto bg-yellow-100 p-3 rounded-full w-fit mb-2">
                <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl text-gray-800">Cadastro Recebido!</CardTitle>
            <CardDescription className="text-base text-gray-600">
                Olá, <strong>{stayData?.guestName?.split(' ')[0]}</strong>.
            </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-600">
                  Já recebemos seus dados para a <strong>{stayData?.cabinName}</strong>.<br/>
                  Aguarde a liberação na recepção para acessar o portal.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Verificar Status Agora
            </Button>
        </CardContent>
      </Card>
    );
  }

  // 3. TELA: ESTADIA ENCERRADA
  if (view === 'ENDED') {
    return (
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl animate-in fade-in zoom-in-95">
        <CardHeader className="text-center">
            <div className="mx-auto bg-gray-100 p-3 rounded-full w-fit mb-2">
                <Home className="h-8 w-8 text-gray-500" />
            </div>
            <CardTitle>Estadia Encerrada</CardTitle>
            <CardDescription>Obrigado pela visita!</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <Button asChild className="w-full">
                <Link href="/">Voltar ao Início</Link>
            </Button>
        </CardContent>
      </Card>
    );
  }

  // 4. TELA: LOGIN PADRÃO (INICIAL)
  return (
    <Card className="w-full max-w-md bg-white/90 backdrop-blur-md shadow-2xl border-t-4 border-green-600 animate-in fade-in zoom-in-95">
      <CardHeader className="text-center pb-2">
        {safeProperty.logoUrl ? (
          <div className="flex justify-center mb-4">
             <Image src={safeProperty.logoUrl} alt={safeProperty.name} width={100} height={100} className="rounded-lg shadow-sm" />
          </div>
        ) : (
           <div className="h-16 w-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
             <KeyRound className="h-8 w-8 text-green-700"/>
           </div>
        )}
        <CardTitle className="text-2xl font-bold text-gray-800">Portal do Hóspede</CardTitle>
        <CardDescription className="text-gray-600 font-medium">
          Insira seu código de acesso para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => handleTokenProcessing(data.token))} className="space-y-6">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem className="flex flex-col items-center">
                  <FormLabel className="text-green-800 font-semibold mb-2">Código de Acesso</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field} disabled={isProcessing}>
                      <InputOTPGroup className="gap-2">
                        {[0,1,2,3,4,5].map(i => (
                            <InputOTPSlot 
                                key={i} 
                                index={i} 
                                className="h-12 w-10 text-xl border-2 border-gray-300 focus:border-green-600 focus:ring-green-600 rounded-md bg-white text-gray-800" 
                            />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold h-12 text-lg shadow-md transition-all mt-2"
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "ACESSAR"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <main 
      className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: `url('https://od6apn3gvpg0jwyr.public.blob.vercel-storage.com/CAU_0530.jpg')`,
        backgroundColor: '#1a1a1a'
      }}
    >
      {/* Overlay escuro para garantir leitura */}
      <div className="absolute inset-0 bg-black/60 z-0 pointer-events-none"></div>

      <Toaster richColors position="top-center" />
      
      {/* Conteúdo com z-index para flutuar sobre o overlay */}
      <div className="relative z-10 w-full flex justify-center py-10">
        <Suspense fallback={
           <div className="flex flex-col items-center gap-3 text-white bg-black/30 p-6 rounded-xl backdrop-blur-sm">
              <Loader2 className="h-10 w-10 animate-spin" />
              <span className="font-medium">Iniciando Portal...</span>
           </div>
        }>
          <GuestPortalContent />
        </Suspense>
      </div>

      <div className="fixed bottom-4 right-4 z-20">
        <Link
          href="/admin/login"
          className="text-white/40 text-xs hover:text-white hover:underline transition-colors"
        >
          Área Administrativa
        </Link>
      </div>
    </main>
  );
}