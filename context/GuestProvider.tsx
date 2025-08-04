"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Stay, Booking } from '@/types';
// CORREÇÃO: Importações corretas do Firebase
import { getFirebaseDb, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface GuestContextType {
  stay: Stay | null;
  isAuthenticated: boolean;
  isLoading: boolean; // CORREÇÃO: Adicionado isLoading
  setStay: (stay: Stay | null) => void; // CORREÇÃO: Adicionado setStay
  logout: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [stay, setStay] = useState<Stay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // CORREÇÃO: Função para buscar bookings movida para o provider
  const fetchAndSetBookings = useCallback(async (stayData: Stay): Promise<Stay> => {
    if (!stayData || !stayData.id) return stayData;
    
    try {
      const bookingsQuery = query(collection(db, "bookings"), where("stayId", "==", stayData.id));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      return { ...stayData, bookings: bookingsData };
    } catch (error) {
      console.error("Failed to fetch bookings for stay:", error);
      return { ...stayData, bookings: [] }; // Retorna com bookings vazios em caso de erro
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initializeSession = async () => {
      try {
        const savedStayJSON = sessionStorage.getItem('synapse-stay');
        if (savedStayJSON) {
          const savedStayData = JSON.parse(savedStayJSON);
          const stayWithBookings = await fetchAndSetBookings(savedStayData); // CORREÇÃO: Busca os bookings
          if (isMounted) {
            setStay(stayWithBookings);
          }
        }
      } catch (error) {
        console.error("Failed to parse stay from sessionStorage", error);
        sessionStorage.removeItem('synapse-stay');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    initializeSession();
    return () => {
      isMounted = false;
    };
  }, [fetchAndSetBookings]);

  const logout = () => {
    setStay(null);
    sessionStorage.removeItem('synapse-stay');
    window.location.href = '/portal'; // Redireciona para a página de login
  };

  return (
    <GuestContext.Provider value={{ stay, isAuthenticated: !!stay, isLoading, setStay, logout }}>
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = (): GuestContextType => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest deve ser usado dentro de um GuestProvider');
  }
  return context;
};