"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Stay } from '@/types';

interface GuestContextType {
  stay: Stay | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setStay: (stay: Stay | null) => void;
  logout: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [stay, setStay] = useState<Stay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedStayJSON = sessionStorage.getItem('synapse-stay');
      if (savedStayJSON) {
        const potentialStay = JSON.parse(savedStayJSON);
        if (potentialStay && potentialStay.id) {
          setStay(potentialStay);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      sessionStorage.removeItem('synapse-stay');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = () => {
    setStay(null);
    sessionStorage.removeItem('synapse-stay');
    window.location.href = '/portal';
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