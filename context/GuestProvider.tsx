"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut, User } from 'firebase/auth';
import { app, getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Stay, PreCheckIn } from '@/types';
import { getCookie, deleteCookie } from 'cookies-next';
import { toast } from 'sonner';

interface GuestContextType {
    user: User | null;
    stay: Stay | null;
    preCheckIn: PreCheckIn | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [stay, setStay] = useState<Stay | null>(null);
    const [preCheckIn, setPreCheckIn] = useState<PreCheckIn | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(async () => {
        const auth = getAuth(app);
        await signOut(auth);
        deleteCookie('guest-token');
        setUser(null);
        setStay(null);
        setPreCheckIn(null);
    }, []);

    useEffect(() => {
        const auth = getAuth(app);
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Se onAuthStateChanged nos der um usuário, o login foi um sucesso.
                // Agora, buscamos os dados associados.
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
                                if (stayData.preCheckInId) {
                                    const preCheckInRef = doc(db, 'preCheckIns', stayData.preCheckInId);
                                    const preCheckInSnap = await getDoc(preCheckInRef);
                                    if (preCheckInSnap.exists()) {
                                        setPreCheckIn({ id: preCheckInSnap.id, ...preCheckInSnap.data() } as PreCheckIn);
                                    }
                                }
                            }
                        }
                        setUser(user);
                    } else {
                        // O usuário logado não é um hóspede, então limpamos o estado.
                        await logout();
                    }
                } catch (error) {
                    console.error("Erro ao processar dados do hóspede:", error);
                    await logout();
                } finally {
                    // Finalizamos o carregamento após processar o usuário.
                    setIsLoading(false);
                }
            } else {
                // Se não há usuário, verificamos se há um token no cookie para tentar o login.
                const token = getCookie('guest-token');
                if (token && typeof token === 'string') {
                    try {
                        // Tentamos o login. Se funcionar, o onAuthStateChanged irá disparar novamente,
                        // desta vez com um objeto 'user', e o bloco acima será executado.
                        // Não mudamos isLoading aqui, pois estamos aguardando o próximo disparo.
                        await signInWithCustomToken(auth, token);
                         // Uma vez que o login é feito, removemos o cookie para uso único.
                        deleteCookie('guest-token');
                    } catch (error) {
                        // O token era inválido. Limpamos e finalizamos o carregamento.
                        console.error("Token do cookie inválido:", error);
                        deleteCookie('guest-token');
                        setIsLoading(false);
                    }
                } else {
                    // Não há usuário e não há token. O estado é "não logado".
                    setIsLoading(false);
                }
            }
        });

        return () => unsubscribe();
    }, [logout]);

    return (
        <GuestContext.Provider value={{ user, stay, preCheckIn, isAuthenticated: !!user, isLoading, logout }}>
            {children}
        </GuestContext.Provider>
    );
};

export const useGuest = () => {
    const context = useContext(GuestContext);
    if (context === undefined) {
        throw new Error('useGuest deve ser usado dentro de um GuestProvider');
    }
    return context;
};