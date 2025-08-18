// context/AuthContext.tsx

"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';

interface AuthContextType {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
    // ++ INÍCIO DA ADIÇÃO ++
    getIdToken: () => Promise<string | null>;
    // ++ FIM DA ADIÇÃO ++
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            
            if (currentUser) {
                try {
                    const idTokenResult = await currentUser.getIdTokenResult(true);
                    setIsAdmin(idTokenResult.claims.admin === true);
                } catch (error) {
                    console.error("Erro ao verificar permissões de admin:", error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ++ INÍCIO DA ADIÇÃO ++
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
    // ++ FIM DA ADIÇÃO ++


    return (
        // ++ INÍCIO DA ALTERAÇÃO ++
        <AuthContext.Provider value={{ user, isAdmin, loading, getIdToken }}>
        // ++ FIM DA ALTERAÇÃO ++
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