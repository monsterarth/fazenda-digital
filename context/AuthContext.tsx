"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // **A MUDANÇA CRÍTICA:** A lógica agora é atômica.
            if (currentUser) {
                setUser(currentUser);
                try {
                    // Força a atualização do token para obter os claims mais recentes.
                    const idTokenResult = await currentUser.getIdTokenResult(true);
                    // Define o status de admin com base no custom claim.
                    setIsAdmin(idTokenResult.claims.admin === true);
                } catch (error) {
                    console.error("Erro ao verificar permissões de admin:", error);
                    setIsAdmin(false); // Failsafe em caso de erro.
                }
            } else {
                // Se não há usuário, zera todos os estados.
                setUser(null);
                setIsAdmin(false);
            }
            // O 'loading' só se torna falso DEPOIS que todas as verificações (usuário e admin) terminaram.
            setLoading(false);
        });

        // Limpa o listener ao desmontar.
        return () => unsubscribe();
    }, []);

    // O loader em tela cheia foi removido daqui para evitar erros de hidratação.
    // O PrivateRoute cuidará da UI de carregamento.
    return (
        <AuthContext.Provider value={{ user, isAdmin, loading }}>
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