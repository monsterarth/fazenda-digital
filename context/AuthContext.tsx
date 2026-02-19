// context/AuthContext.tsx

"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';

// ++ ADICIONADO: Definição das novas roles
export type UserRole = 
  | "super_admin"
  | "recepcao"
  | "marketing"
  | "cafe"
  | "manutencao"
  | "guarita"
  | null;

interface AuthContextType {
    user: User | null;
    isAdmin: boolean; // Mantido para compatibilidade com AuthGuard
    userRole: UserRole; // ++ ADICIONADO: A role granular
    loading: boolean;
    getIdToken: () => Promise<string | null>;
}

// CORREÇÃO: Adicionado 'export' aqui
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>(null); // ++ ADICIONADO
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            
            if (currentUser) {
                try {
                    // Força a atualização do token para pegar claims recentes
                    const idTokenResult = await currentUser.getIdTokenResult(true);
                    
                    // ++ LÓGICA DE ROLE ATUALIZADA ++
                    // Lê a nova claim 'role'
                    const role = (idTokenResult.claims.role as UserRole) || null;
                    setUserRole(role);

                    // O usuário é considerado "admin" (para acesso ao painel)
                    // se ele tiver CIMAQUER role definida.
                    // Isso substitui a antiga claim 'admin: true'
                    setIsAdmin(!!role);
                    // -- FIM DA LÓGICA ATUALIZADA --

                } catch (error) {
                    console.error("Erro ao verificar permissões de admin:", error);
                    setIsAdmin(false);
                    setUserRole(null); // ++ ADICIONADO
                }
            } else {
                setIsAdmin(false);
                setUserRole(null); // ++ ADICIONADO
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getIdToken = useCallback(async (): Promise<string | null> => {
        if (!user) {
            return null;
        }
        try {
            return await user.getIdToken();
        } catch (error) {
            console.error("Erro ao obter ID token:", error);
            return null;
        }
    }, [user]);


    return (
        // ++ ATUALIZADO: Passa 'userRole' no value
        <AuthContext.Provider value={{ user, isAdmin, userRole, loading, getIdToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};