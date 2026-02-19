// hooks/useTabNotifier.ts

"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';

export const useTabNotifier = () => {
    const { hasNewRequests, hasNewBookings } = useNotification();
    const pathname = usePathname();

    const originalTitleRef = useRef(document.title);
    const originalFaviconRef = useRef('/favicon.ico');
    const faviconElRef = useRef<HTMLLinkElement | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        originalTitleRef.current = document.title;
        
        // ## INÍCIO DA CORREÇÃO ##
        // Especifica o tipo <HTMLLinkElement> para o querySelector.
        // Isso garante que 'el' tenha a propriedade 'href'.
        const el = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        // ## FIM DA CORREÇÃO ##

        if (el) {
            faviconElRef.current = el;
            originalFaviconRef.current = el.href;
        }
    }, []);

    useEffect(() => {
        const onSolicitacoesPage = pathname.startsWith('/admin/solicitacoes');
        const onAgendamentosPage = pathname.startsWith('/admin/agendamentos');
        
        const shouldNotifyRequests = hasNewRequests && !onSolicitacoesPage;
        const shouldNotifyBookings = hasNewBookings && !onAgendamentosPage;
        
        const hasActiveNotification = shouldNotifyRequests || shouldNotifyBookings;
        const message = shouldNotifyRequests ? "(!) Nova Solicitação" : "(!) Novo Agendamento";

        const stopNotifying = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            document.title = originalTitleRef.current;
            if (faviconElRef.current) {
                faviconElRef.current.href = originalFaviconRef.current;
            }
        };

        const startNotifying = () => {
            stopNotifying();
            if (faviconElRef.current) {
                faviconElRef.current.href = '/favicon-alert.ico';
            }
            intervalRef.current = setInterval(() => {
                document.title = document.title === originalTitleRef.current 
                    ? message 
                    : originalTitleRef.current;
            }, 1000);
        };

        const handleVisibilityChange = () => {
            if (document.hidden && hasActiveNotification) {
                startNotifying();
            } else {
                stopNotifying();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (document.hidden && hasActiveNotification) {
            startNotifying();
        } else {
            stopNotifying();
        }

        return () => {
            stopNotifying();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };

    }, [hasNewRequests, hasNewBookings, pathname]);
};