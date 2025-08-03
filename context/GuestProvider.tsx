"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Stay, Booking } from '@/types';
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
  const [isLoading, setIsLoading] =useState(true);

  const fetchAndSetBookings = useCallback(async (stayData: Stay) => {
    if (!stayData) return stayData;
    try {
      const db = await getFirebaseDb();
      const bookingsQuery = query(collection(db, "bookings"), where("stayId", "==", stayData.id));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      const stayWithBookings = { ...stayData, bookings: bookingsData };
      sessionStorage.setItem('synapse-stay', JSON.stringify(stayWithBookings));
      return stayWithBookings;
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      return stayData;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initializeSession = async () => {
      try {
        const savedStayJSON = sessionStorage.getItem('synapse-stay');
        if (savedStayJSON) {
          const savedStayData = JSON.parse(savedStayJSON);
          const stayWithBookings = await fetchAndSetBookings(savedStayData);
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

  const login = async (token: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        throw new Error("Token inválido ou não encontrado na API.");
      }
      
      const stayData = await response.json();
      const stayWithBookings = await fetchAndSetBookings(stayData);
      setStay(stayWithBookings);
      return true;
    } catch (error) {
      console.error("Erro na função de login:", error);
      logout();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStay(null);
    sessionStorage.removeItem('synapse-stay');
    setIsLoading(false);
  };

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