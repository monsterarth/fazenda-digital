"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Stay, Booking } from '@/types';
import { Loader2 } from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface GuestContextType {
  stay: Stay | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [stay, setStay] = useState<Stay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para buscar agendamentos, agora reutilizável
  const fetchAndSetBookings = useCallback(async (stayData: Stay) => {
    if (!stayData) return stayData;
    try {
      const db = await getFirebaseDb();
      const bookingsQuery = query(collection(db, "bookings"), where("stayId", "==", stayData.id));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      
      const stayWithBookings = { ...stayData, bookings: bookingsData };
      
      setStay(stayWithBookings);
      sessionStorage.setItem('synapse-stay', JSON.stringify(stayWithBookings)); // Atualiza a sessão
      return stayWithBookings;

    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      return stayData; // Retorna os dados originais em caso de erro
    }
  }, []);


  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      try {
        const savedStayJSON = sessionStorage.getItem('synapse-stay');
        if (savedStayJSON) {
          const savedStay = JSON.parse(savedStayJSON);
          // Agora, sempre que recarregar a sessão, buscamos os agendamentos.
          await fetchAndSetBookings(savedStay);
        }
      } catch (error) {
        console.error("Failed to parse stay from sessionStorage", error);
        sessionStorage.removeItem('synapse-stay');
      } finally {
        setIsLoading(false);
      }
    };
    initializeSession();
  }, [fetchAndSetBookings]);

  const login = async (token: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Token inválido ou estadia não ativa.");
      }

      const stayData: Stay = await response.json();
      
      // Usa a função centralizada para buscar agendamentos
      await fetchAndSetBookings(stayData);

      return true;
    } catch (error) {
      console.error(error);
      logout();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStay(null);
    sessionStorage.removeItem('synapse-stay');
  };

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
    );
  }

  return (
    <GuestContext.Provider value={{ stay, isAuthenticated: !!stay, isLoading, login, logout }}>
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = (): GuestContextType => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};