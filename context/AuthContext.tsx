"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
// Loader2 is no longer needed here
// import { Loader2 } from 'lucide-react';

interface AuthContextType {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAdmin: false,
    loading: true,
});

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
                    const idTokenResult = await currentUser.getIdTokenResult();
                    const userIsAdmin = idTokenResult.claims.admin === true;
                    setIsAdmin(userIsAdmin);
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

    // ++ CORREÇÃO: Removido o bloco "if (loading)" que renderizava UI. ++
    // O Provider agora SEMPRE renderiza seus children, garantindo que o server e o client
    // renderizem a mesma estrutura inicial, o que resolve o erro de hidratação.
    return (
        <AuthContext.Provider value={{ user, isAdmin, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    return useContext(AuthContext);
};