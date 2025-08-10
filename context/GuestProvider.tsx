"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut, User } from 'firebase/auth';
import { app, getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Stay, PreCheckIn } from '@/types';
import { getCookie, deleteCookie } from 'cookies-next';

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
                        await logout();
                    }
                } catch (error) {
                    console.error("Erro ao processar dados do hóspede:", error);
                    await logout();
                } finally {
                    setIsLoading(false);
                }
            } else {
                const token = getCookie('guest-token');
                if (token && typeof token === 'string') {
                    signInWithCustomToken(auth, token).catch(() => {
                        deleteCookie('guest-token');
                        setIsLoading(false);
                    });
                } else {
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
        throw new Error('useGuest must be used within a GuestProvider');
    }
    return context;
};