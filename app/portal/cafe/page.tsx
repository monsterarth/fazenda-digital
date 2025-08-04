"use client";

import React from 'react';
import { OrderProvider } from '@/context/OrderContext'; // Vamos criar este em breve
import { BreakfastFlow } from '@/components/portal/cafe/BreakfastFlow'; // E este também
import { Toaster } from 'sonner';

export default function BreakfastPage() {
    return (
        <OrderProvider>
            <Toaster richColors position="top-center" />
            <BreakfastFlow />
        </OrderProvider>
    );
}