"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut, User } from 'firebase/auth';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
// ++ Importa o tipo PreCheckIn
import { Stay, PreCheckIn } from '@/types'; 
import { deleteCookie } from 'cookies-next';
import { toast } from 'sonner';

// ++ INÍCIO DA CORREÇÃO ++
interface GuestContextType {
    user: User | null;
    stay: Stay | null;
    preCheckIn: PreCheckIn | null; // Adiciona 'preCheckIn' ao tipo do contexto
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (customToken: string) => Promise<void>;
    logout: () => void;
    setStay: (stay: Stay) => void; // Adiciona 'setStay' ao tipo do contexto
}
// ++ FIM DA CORREÇÃO ++

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [stay, setStay] = useState<Stay | null>(null);
    const [preCheckIn, setPreCheckIn] = useState<PreCheckIn | null>(null); // ++ Adiciona o estado para preCheckIn
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(async () => {
        setIsLoading(true);
        const auth = getAuth();
        await signOut(auth);
        deleteCookie('guest-token');
        setUser(null);
        setStay(null);
        setPreCheckIn(null); // ++ Limpa o preCheckIn no logout
        setIsLoading(false);
    }, []);
    
    // A função 'login' não precisa de alterações, pois o useEffect principal já busca o preCheckIn
    const login = useCallback(async (customToken: string) => {
        const auth = getAuth();
        const userCredential = await signInWithCustomToken(auth, customToken);
        const loggedInUser = userCredential.user;

        if (loggedInUser) {
            const idTokenResult = await loggedInUser.getIdTokenResult();
            const stayId = idTokenResult.claims.stayId as string;
            
            if (stayId) {
                const db = await getFirebaseDb();
                const stayRef = doc(db, 'stays', stayId);
                const staySnap = await getDoc(stayRef);
                if (staySnap.exists()) {
                    setStay({ id: staySnap.id, ...staySnap.data() } as Stay);
                }
            }
            setUser(loggedInUser);
        }
    }, []);

    // Este useEffect agora também é responsável por buscar o preCheckIn
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const idTokenResult = await user.getIdTokenResult(true);
                    if (idTokenResult.claims.isGuest) {
                        const stayId = idTokenResult.claims.stayId as string;
                        if (stayId) {
                            const db = await getFirebaseDb();
                            const stayRef = doc(db, 'stays', stayId);
                            const staySnap = await getDoc(stayRef);
                            
                            if (staySnap.exists()) {
                                const stayData = { id: staySnap.id, ...staySnap.data() } as Stay;
                                setStay(stayData);

                                // ++ INÍCIO DA LÓGICA PARA BUSCAR O PRE-CHECK-IN ++
                                if (stayData.preCheckInId) {
                                    const preCheckInRef = doc(db, 'preCheckIns', stayData.preCheckInId);
                                    const preCheckInSnap = await getDoc(preCheckInRef);
                                    if (preCheckInSnap.exists()) {
                                        setPreCheckIn({ id: preCheckInSnap.id, ...preCheckInSnap.data() } as PreCheckIn);
                                    }
                                }
                                // ++ FIM DA LÓGICA ++
                            }
                        }
                        setUser(user);
                    } else {
                        await logout();
                    }
                } catch(error) {
                    console.error("Erro ao verificar autenticação do hóspede:", error);
                    toast.error("Sua sessão é inválida. Por favor, faça login novamente.");
                    await logout();
                }
            } else {
                setUser(null);
                setStay(null);
                setPreCheckIn(null); // ++ Limpa o preCheckIn se não houver usuário
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [logout]);

    return (
        <GuestContext.Provider value={{ user, stay, preCheckIn, isAuthenticated: !!user, isLoading, login, logout, setStay }}>
            {children}
        </GuestContext.Provider>
    );
};

export const useGuest = () => {
    const context = useContext(GuestContext);
    if (context === undefined) {
        throw new Error('useGuest must be used within a GuestProvider');
    }
    return context;
};