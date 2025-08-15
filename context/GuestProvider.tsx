"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut, User } from 'firebase/auth';
import { app, getFirebaseDb } from '@/lib/firebase';
// ++ IMPORTS ADICIONADOS PARA A SOLUÇÃO ++
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Stay, PreCheckIn, Property } from '@/types'; 
// ++ TIPO BOOKING IMPORTADO ++
import { Booking } from '@/types/scheduling'; 
import { getCookie, deleteCookie } from 'cookies-next';
import { usePathname, useRouter } from 'next/navigation';

interface GuestContextType {
    user: User | null;
    stay: Stay | null;
    // ++ ESTADO BOOKINGS ADICIONADO AO CONTEXTO ++
    bookings: Booking[];
    preCheckIn: PreCheckIn | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

// Função auxiliar para verificar as políticas (sem alterações)
const hasAcceptedLatestPolicies = (stay: Stay, property: Property) => {
    if (!stay.policiesAccepted || !property.policies) return false;
    
    const hasPets = (stay.pets?.length || 0) > 0;
    const { general, pet } = stay.policiesAccepted;
    const { general: generalPolicy, pet: petPolicy } = property.policies;

    const generalAccepted = general && generalPolicy?.lastUpdatedAt && general.toMillis() >= generalPolicy.lastUpdatedAt.toMillis();
    
    if (!hasPets) return !!generalAccepted;
    
    const petAccepted = pet && petPolicy?.lastUpdatedAt && pet.toMillis() >= petPolicy.lastUpdatedAt.toMillis();
    return !!generalAccepted && !!petAccepted;
};

export const GuestProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [stay, setStay] = useState<Stay | null>(null);
    // ++ NOVO ESTADO PARA AGENDAMENTOS ++
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [preCheckIn, setPreCheckIn] = useState<PreCheckIn | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const logout = useCallback(async () => {
        const auth = getAuth(app);
        await signOut(auth);
        deleteCookie('guest-token');
        setUser(null);
        setStay(null);
        // ++ LIMPAR BOOKINGS NO LOGOUT ++
        setBookings([]);
        setPreCheckIn(null);
        // Adicionado para garantir que o redirecionamento aconteça após o logout
        router.push('/portal');
    }, [router]);

    useEffect(() => {
        const auth = getAuth(app);
        
        // Função para cancelar a inscrição do listener de agendamentos
        let unsubscribeBookings = () => {};
        
        const handleUserSession = async (user: User | null) => {
            // Cancela o listener anterior antes de iniciar um novo
            unsubscribeBookings();

            if (user) {
                try {
                    const idTokenResult = await user.getIdTokenResult(true);
                    if (!idTokenResult.claims.isGuest) {
                        await logout();
                        setIsLoading(false);
                        return;
                    }

                    const stayId = idTokenResult.claims.stayId as string;
                    if (!stayId) throw new Error("Stay ID não encontrado no token.");

                    const db = await getFirebaseDb();
                    const stayRef = doc(db, 'stays', stayId);
                    // ## CORREÇÃO CRÍTICA APLICADA: Usando 'main_property' como no seu código original ##
                    const propertyRef = doc(db, 'properties', 'main_property'); 
                    
                    const [staySnap, propertySnap] = await Promise.all([getDoc(stayRef), getDoc(propertyRef)]);

                    if (!staySnap.exists() || !propertySnap.exists()) throw new Error("Dados da estadia ou propriedade não encontrados.");

                    const stayData = { id: staySnap.id, ...staySnap.data() } as Stay;
                    const propertyData = propertySnap.data() as Property;
                    
                    setStay(stayData);
                    setUser(user);

                    if (stayData.preCheckInId) {
                        const preCheckInRef = doc(db, 'preCheckIns', stayData.preCheckInId);
                        const preCheckInSnap = await getDoc(preCheckInRef);
                        if (preCheckInSnap.exists()) {
                            setPreCheckIn({ id: preCheckInSnap.id, ...preCheckInSnap.data() } as PreCheckIn);
                        }
                    }
                    
                    // ++ INÍCIO DA LÓGICA DE AGENDAMENTOS EM TEMPO REAL ++
                    // Listener que observa a coleção 'bookings' em tempo real
                    const bookingsQuery = query(collection(db, 'bookings'), where('stayId', '==', stayId));
                    unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
                        const fetchedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Booking);
                        setBookings(fetchedBookings);
                    }, (error) => {
                        console.error("Erro ao escutar agendamentos:", error);
                        setBookings([]); // Garante que o estado seja limpo em caso de erro
                    });
                    // ++ FIM DA LÓGICA DE AGENDAMENTOS EM TEMPO REAL ++

                    if (!hasAcceptedLatestPolicies(stayData, propertyData) && pathname !== '/portal/termos') {
                        router.push('/portal/termos');
                    }

                } catch (error) {
                    console.error("Erro ao processar sessão do hóspede:", error);
                    await logout();
                } finally {
                    setIsLoading(false);
                }
            } else {
                const token = getCookie('guest-token');
                if (token && typeof token === 'string') {
                    signInWithCustomToken(auth, token).catch(async () => {
                         deleteCookie('guest-token')
                         // Força a atualização da página se o token for inválido
                         router.push('/portal');
                    });
                } else {
                    setIsLoading(false);
                }
            }
        };

        const unsubscribeAuth = onAuthStateChanged(auth, handleUserSession);
        
        // Função de limpeza que será chamada quando o componente for desmontado
        return () => {
            unsubscribeAuth();
            unsubscribeBookings();
        };
    }, [logout, pathname, router]);

    return (
        <GuestContext.Provider value={{ user, stay, bookings, preCheckIn, isAuthenticated: !!user, isLoading, logout }}>
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