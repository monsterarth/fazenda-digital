// context/NotificationContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Firestore, Timestamp } from 'firebase/firestore';
import { subHours } from 'date-fns';

interface NotificationContextType {
    hasNewRequests: boolean;
    hasNewBookings: boolean;
    clearRequestsNotification: () => void;
    clearBookingsNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const { isAdmin } = useAuth();
    const [db, setDb] = useState<Firestore | null>(null);
    const [hasNewRequests, setHasNewRequests] = useState(false);
    const [hasNewBookings, setHasNewBookings] = useState(false);

    // 1. Inicializa a conexão com o DB
    useEffect(() => {
        const initDb = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
        };
        initDb();
    }, []);

    // 2. Cria os listeners do Firestore
    useEffect(() => {
        if (!db || !isAdmin) return;

        // Listener para Solicitações (Correto)
        const requestsQuery = query(
            collection(db, 'requests'), 
            where('status', '==', 'pending')
        );
        const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
            setHasNewRequests(!snapshot.empty);
        }, (error) => {
            console.error("Erro no listener de solicitações:", error);
        });

        
        // ## INÍCIO DA CORREÇÃO (AGENDAMENTOS) ##
        // 1. Define o período (24h) - (Correto)
        const twentyFourHoursAgo = Timestamp.fromDate(subHours(new Date(), 24));
        
        // 2. Cria a consulta por 'createdAt' - (Correto)
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('createdAt', '>=', twentyFourHoursAgo)
        );

        // 3. O listener agora ativa se houver QUALQUER agendamento novo
        const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
            // REMOVIDO o filtro por status.
            // Qualquer novo agendamento (pendente ou automático) irá disparar.
            setHasNewBookings(!snapshot.empty); // Ou snapshot.size > 0
        }, (error) => {
            console.error("Erro no listener de agendamentos:", error);
        });
        // ## FIM DA CORREÇÃO (AGENDAMENTOS) ##


        // Limpa os listeners ao desmontar
        return () => {
            unsubscribeRequests();
            unsubscribeBookings();
        };
    }, [db, isAdmin]);

    // Funções para limpar manualmente as notificações (sem alterações)
    const clearRequestsNotification = useCallback(() => {
        setHasNewRequests(false);
    }, []);

    const clearBookingsNotification = useCallback(() => {
        setHasNewBookings(false);
    }, []);

    return (
        <NotificationContext.Provider value={{
            hasNewRequests,
            hasNewBookings,
            clearRequestsNotification,
            clearBookingsNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
    }
    return context;
};