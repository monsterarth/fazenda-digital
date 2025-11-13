// ARQUIVO: context/NotificationContext.tsx
// (Note: Esta é a Solução Robusta)

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseDb } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  Firestore,
  Timestamp,
  // --- 1. INÍCIO DAS ADIÇÕES ---
  getDocs,
  writeBatch,
  doc,
  // --- FIM DAS ADIÇÕES ---
} from 'firebase/firestore';
// 'subHours' não é mais necessário, pois não ouvimos 'createdAt'
// import { subHours } from 'date-fns';

interface NotificationContextType {
  hasNewRequests: boolean;
  hasNewBookings: boolean;
  clearRequestsNotification: () => void;
  clearBookingsNotification: () => void;
}

const NotificationContext =
  createContext<NotificationContextType | undefined>(undefined);

// --- 2. ADIÇÃO: Tipos de log que o Admin deve 'ler' ---
const BOOKING_LOG_TYPES = [
  'booking_requested', // Hóspede solicitou (manual)
  'booking_confirmed', // Hóspede agendou (automático)
  'booking_changed_by_guest', // Hóspede alterou o horário
  'booking_cancelled_by_guest', // Hóspede cancelou
];
// (Logs gerados pelo admin, como 'booking_declined',
// não precisam ser lidos, pois o próprio admin os criou)

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

    // --- Listener de Solicitações (Correto, sem alteração) ---
    const requestsQuery = query(
      collection(db, 'requests'),
      where('status', '==', 'pending'),
    );
    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      setHasNewRequests(!snapshot.empty);
    }, (error) => {
      console.error('Erro no listener de solicitações:', error);
    });

    // --- 3. INÍCIO DA CORREÇÃO (Listener de Agendamentos) ---
    //
    // O Listener agora escuta a coleção 'activity_logs'
    // procurando por logs de agendamento que NÃO ESTÃO LIDOS.
    //
    const bookingsQuery = query(
      collection(db, 'activity_logs'),
      where('read', '==', false), // <-- A MUDANÇA PRINCIPAL
      where('type', 'in', BOOKING_LOG_TYPES), // <-- O Filtro
    );

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      // Se a snapshot não estiver vazia, há notificações não lidas
      setHasNewBookings(!snapshot.empty);
    }, (error) => {
      console.error('Erro no listener de agendamentos:', error);
    });
    // --- FIM DA CORREÇÃO ---

    // Limpa os listeners ao desmontar
    return () => {
      unsubscribeRequests();
      unsubscribeBookings();
    };
  }, [db, isAdmin]);

  // --- 4. INÍCIO DA CORREÇÃO (Funções de Limpeza) ---
  // (A 'clearRequestsNotification' permanece a mesma por enquanto,
  // pois a lógica dela é baseada na coleção 'requests' e não nos logs)
  const clearRequestsNotification = useCallback(() => {
    setHasNewRequests(false);
    // (Idealmente, esta função também deveria marcar os logs de 'request_created'
    // como 'read: true', mas isso fica para uma próxima etapa)
  }, []);

  //
  // 'clearBookingsNotification' agora é uma AÇÃO DE ESCRITA no DB.
  //
  const clearBookingsNotification = useCallback(async () => {
    // 1. Se o db não estiver pronto, ou já estiver limpo, não faz nada.
    if (!db || !hasNewBookings) return;

    // 2. Otimisticamente, limpa a UI
    setHasNewBookings(false);

    // 3. Busca todos os logs de agendamento não lidos
    const q = query(
      collection(db, 'activity_logs'),
      where('read', '==', false),
      where('type', 'in', BOOKING_LOG_TYPES),
    );

    try {
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      // 4. Cria um batch para marcar todos como 'read: true'
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        const docRef = doc(db, 'activity_logs', docSnap.id);
        batch.update(docRef, { read: true });
      });

      // 5. Executa o batch
      await batch.commit();
    } catch (error) {
      console.error('Falha ao marcar logs de agendamento como lidos:', error);
      // Se falhar, reativa a notificação para tentar de novo
      setHasNewBookings(true);
    }
  }, [db, hasNewBookings]);
  // --- FIM DA CORREÇÃO ---

  return (
    <NotificationContext.Provider
      value={{
        hasNewRequests,
        hasNewBookings,
        clearRequestsNotification,
        clearBookingsNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotification deve ser usado dentro de um NotificationProvider',
    );
  }
  return context;
};