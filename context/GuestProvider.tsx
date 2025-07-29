"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Stay } from '@/types';
import { Loader2 } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true); // Começa como true para verificar a sessão

  useEffect(() => {
    // Ao carregar o provider, verifica se há uma sessão salva no sessionStorage
    try {
      const savedStay = sessionStorage.getItem('synapse-stay');
      if (savedStay) {
        setStay(JSON.parse(savedStay));
      }
    } catch (error) {
      console.error("Failed to parse stay from sessionStorage", error);
      sessionStorage.removeItem('synapse-stay');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (token: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Faz a chamada para nossa API de login
      const response = await fetch(`/api/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error("Token inválido ou estadia não ativa.");
      }

      const stayData: Stay = await response.json();
      setStay(stayData);
      // Salva a sessão no sessionStorage para persistência
      sessionStorage.setItem('synapse-stay', JSON.stringify(stayData));
      return true;
    } catch (error) {
      console.error(error);
      logout(); // Limpa qualquer estado inválido
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStay(null);
    sessionStorage.removeItem('synapse-stay');
  };

  // Exibe um loader global enquanto verifica a sessão inicial
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