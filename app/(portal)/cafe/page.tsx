"use client";

import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { BreakfastFlow } from '@/components/guest/cafe/BreakfastFlow';
import { Toaster } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Coffee } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function BreakfastPageWrapper() {
  return (
    <OrderProvider>
      <Toaster richColors position="top-center" />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <BreakfastPage />
      </Suspense>
    </OrderProvider>
  );
}

function BreakfastPage() {
  const router = useRouter();
  const { currentStep } = useOrder();
  const [showWarning, setShowWarning] = useState(false);

  const handleBack = () => {
    if (currentStep > 1 && currentStep < 5) {
      setShowWarning(true);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-brand-light-green text-brand-dark-green flex flex-col items-center p-4 md:p-8">
      {/* Cabeçalho da página com o botão de voltar */}
      <div className="w-full max-w-5xl flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-brand-dark-green hover:bg-brand-mid-green/20"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-3xl font-bold text-brand-dark-green flex items-center gap-2">
          <Coffee className="h-7 w-7 text-brand-primary" />
          Café da Manhã
        </h1>
      </div>

      {/* Conteúdo principal do fluxo de pedidos */}
      <div className="w-full max-w-5xl">
        <BreakfastFlow />
      </div>

      {/* Diálogo de aviso ao tentar voltar */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="bg-white/90 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-brand-dark-green">Atenção!</AlertDialogTitle>
            <AlertDialogDescription className="text-brand-mid-green">
              Ao voltar, você perderá todas as suas seleções para a cesta de café da manhã. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-brand-light-green text-brand-dark-green border-brand-mid-green/40">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.back()} className="bg-brand-dark-green text-white hover:bg-brand-primary">Voltar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}