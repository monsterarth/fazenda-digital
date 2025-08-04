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
      // --- CORREÇÃO ADICIONADA AQUI ---
      // Usar a variável de ambiente para um URL absoluto previne erros 404 no ambiente de produção (Vercel).
      // Certifique-se de que NEXT_PUBLIC_URL está definida no seu .env.local e nas variáveis de ambiente da Vercel.
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/portal/login`, {
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
