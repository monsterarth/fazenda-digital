"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Stay, Booking, PreCheckIn } from '@/types';
import { getFirebaseDb, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface GuestContextType {
  stay: Stay | null;
  preCheckIn: PreCheckIn | null; // Adicionado para guardar os dados do pré-check-in
  isAuthenticated: boolean;
  isLoading: boolean;
  setStay: (stay: Stay | null) => void;
  logout: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [stay, setStay] = useState<Stay | null>(null);
  const [preCheckIn, setPreCheckIn] = useState<PreCheckIn | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAndSetBookings = useCallback(async (stayData: Stay): Promise<Stay> => {
    if (!stayData?.id) return stayData;
    try {
      const bookingsQuery = query(collection(db, "bookings"), where("stayId", "==", stayData.id));
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      return { ...stayData, bookings: bookingsData };
    } catch (error) {
      console.error("Failed to fetch bookings for stay:", error);
      return { ...stayData, bookings: [] };
    }
  }, []);

  const fetchPreCheckIn = useCallback(async (stayData: Stay): Promise<PreCheckIn | null> => {
    if (!stayData?.preCheckInId) return null;
    try {
      const preCheckInRef = doc(db, "preCheckIns", stayData.preCheckInId);
      const preCheckInDoc = await getDoc(preCheckInRef);
      return preCheckInDoc.exists() ? { id: preCheckInDoc.id, ...preCheckInDoc.data() } as PreCheckIn : null;
    } catch (error) {
      console.error("Failed to fetch pre-check-in data:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initializeSession = async () => {
      setIsLoading(true);
      try {
        const savedStayJSON = sessionStorage.getItem('synapse-stay');
        if (savedStayJSON) {
          const savedStayData = JSON.parse(savedStayJSON);
          
          // Busca todos os dados necessários em paralelo para otimizar
          const [stayWithBookings, preCheckInData] = await Promise.all([
            fetchAndSetBookings(savedStayData),
            fetchPreCheckIn(savedStayData)
          ]);
          
          if (isMounted) {
            setStay(stayWithBookings);
            setPreCheckIn(preCheckInData);
          }
        }
      } catch (error) {
        console.error("Failed to initialize session from sessionStorage", error);
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
  }, [fetchAndSetBookings, fetchPreCheckIn]);

  const logout = () => {
    setStay(null);
    setPreCheckIn(null); // Limpa o preCheckIn no logout
    sessionStorage.removeItem('synapse-stay');
    window.location.href = '/portal';
  };

  return (
    <GuestContext.Provider value={{ stay, preCheckIn, isAuthenticated: !!stay, isLoading, setStay, logout }}>
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