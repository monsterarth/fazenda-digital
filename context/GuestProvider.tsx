"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Stay, Booking, PreCheckIn, Property } from '@/types';
import { getFirebaseDb, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

interface GuestContextType {
  stay: Stay | null;
  preCheckIn: PreCheckIn | null;
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
  
  const router = useRouter();
  const pathname = usePathname();

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
          const savedStayData: Stay = JSON.parse(savedStayJSON);
          
          if (savedStayData.policiesAccepted) {
            if (savedStayData.policiesAccepted.general) {
                const { seconds, nanoseconds } = savedStayData.policiesAccepted.general as any;
                savedStayData.policiesAccepted.general = new Timestamp(seconds, nanoseconds);
            }
            if (savedStayData.policiesAccepted.pet) {
                const { seconds, nanoseconds } = savedStayData.policiesAccepted.pet as any;
                savedStayData.policiesAccepted.pet = new Timestamp(seconds, nanoseconds);
            }
          }
          
          const [stayWithBookings, preCheckInData, propertyDoc] = await Promise.all([
            fetchAndSetBookings(savedStayData),
            fetchPreCheckIn(savedStayData),
            getDoc(doc(db, "properties", "main_property"))
          ]);
          
          if (isMounted) {
            setStay(stayWithBookings);
            setPreCheckIn(preCheckInData);

            const isGuestPortal = pathname.startsWith('/portal');

            if (isGuestPortal && propertyDoc.exists()) {
              const property = propertyDoc.data() as Property;
              const hasPets = (preCheckInData?.pets?.length || 0) > 0;
              
              const generalPolicyLastUpdated = property.policies?.general?.lastUpdatedAt;
              const petPolicyLastUpdated = property.policies?.pet?.lastUpdatedAt;
              const accepted = stayWithBookings.policiesAccepted;

              const needsGeneral = !accepted?.general || (generalPolicyLastUpdated && accepted.general.toMillis() < generalPolicyLastUpdated.toMillis());
              const needsPet = hasPets && (!accepted?.pet || (petPolicyLastUpdated && accepted.pet.toMillis() < petPolicyLastUpdated.toMillis()));

              if ((needsGeneral || needsPet) && pathname !== '/portal/termos' && pathname !== '/portal') {
                router.replace('/portal/termos');
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize session", error);
        sessionStorage.removeItem('synapse-stay');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    initializeSession();
    return () => { isMounted = false; };
  }, [fetchAndSetBookings, fetchPreCheckIn, pathname, router]);

  const logout = () => {
    setStay(null);
    setPreCheckIn(null);
    sessionStorage.removeItem('synapse-stay');
    router.push('/portal');
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