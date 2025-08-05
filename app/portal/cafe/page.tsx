"use client";

import React, { Suspense } from 'react';
import { OrderProvider } from '@/context/OrderContext';
import { BreakfastFlow } from '@/components/portal/cafe/BreakfastFlow';
import { Toaster } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function BreakfastPage() {
    return (
        <OrderProvider>
            <Toaster richColors position="top-center" />
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <BreakfastFlow />
            </Suspense>
        </OrderProvider>
    );
}