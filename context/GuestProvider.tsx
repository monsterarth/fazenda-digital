"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut, User } from 'firebase/auth';
import { app, getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Stay, PreCheckIn, Property } from '@/types'; 
import { Booking } from '@/types/scheduling'; 
import { getCookie, deleteCookie } from 'cookies-next';
import { usePathname, useRouter } from 'next/navigation';
import { getFirstName } from '@/lib/utils'; // 1. IMPORTANDO A FUNÇÃO DE FORMATAÇÃO

// Este tipo local adiciona os campos que faltam sem precisar alterar arquivos globais.
type EnrichedBooking = Booking & {
    serviceId?: string;
    serviceName?: string;
};

interface GuestContextType {
    user: User | null;
    stay: Stay | null;
    bookings: EnrichedBooking[]; 
    preCheckIn: PreCheckIn | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => void;
    firstName: string; // 2. ADICIONANDO O PRIMEIRO NOME AO TIPO DO CONTEXTO
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

const hasAcceptedLatestPolicies = (stay: Stay, property: Property) => {
    if (!stay.policiesAccepted || !property.policies) return false;
    
    const hasPets = (stay.pets?.length || 0) > 0;
    const { general, pet } = stay.policiesAccepted;
    const { general: generalPolicy, pet: petPolicy } = property.policies;

    const getMillis = (val: any) => typeof val === 'object' && typeof val.toMillis === 'function' ? val.toMillis() : val;
    const generalAccepted = general && generalPolicy?.lastUpdatedAt && getMillis(general) >= getMillis(generalPolicy.lastUpdatedAt);
    
    if (!hasPets) return !!generalAccepted;
    
    const petAccepted = pet && petPolicy?.lastUpdatedAt && getMillis(pet) >= getMillis(petPolicy.lastUpdatedAt);
    return !!generalAccepted && !!petAccepted;
};

export const GuestProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [stay, setStay] = useState<Stay | null>(null);
    const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
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
        setBookings([]);
        setPreCheckIn(null);
        router.push('/portal');
    }, [router]);

    useEffect(() => {
        const auth = getAuth(app);
        
        let unsubscribeBookings = () => {};
        
        const handleUserSession = async (user: User | null) => {
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
                    const propertyRef = doc(db, 'properties', 'main_property'); 
                    
                    const [staySnap, propertySnap] = await Promise.all([getDoc(stayRef), getDoc(propertyRef)]);

                    if (!staySnap.exists() || !propertySnap.exists()) throw new Error("Dados da estadia ou propriedade não encontrados.");

                    const stayData = { id: staySnap.id, ...staySnap.data() } as Stay;
                    const propertyData = propertySnap.data() as Property;
                    
                    if (stayData.cabinId) {
                        const cabinRef = doc(db, "cabins", stayData.cabinId);
                        const cabinSnap = await getDoc(cabinRef);
                        if (cabinSnap.exists()) {
                           const cabinDataFromDb = cabinSnap.data();
                           stayData.cabin = {
                             id: cabinSnap.id,
                             name: cabinDataFromDb.name,
                             wifiSsid: cabinDataFromDb.wifiSsid,
                             wifiPassword: cabinDataFromDb.wifiPassword
                           };
                        }
                    }

                    setStay(stayData);
                    setUser(user);

                    if (stayData.preCheckInId) {
                        const preCheckInRef = doc(db, 'preCheckIns', stayData.preCheckInId);
                        const preCheckInSnap = await getDoc(preCheckInRef);
                        if (preCheckInSnap.exists()) {
                            setPreCheckIn({ id: preCheckInSnap.id, ...preCheckInSnap.data() } as PreCheckIn);
                        }
                    }
                    
                    const bookingsQuery = query(collection(db, 'bookings'), where('stayId', '==', stayId));
                    unsubscribeBookings = onSnapshot(bookingsQuery, async (snapshot) => {
                        const fetchedBookings = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
                            const bookingData = { id: docSnapshot.id, ...docSnapshot.data() } as EnrichedBooking;
                            
                            if (bookingData.serviceId) {
                                const serviceRef = doc(db, 'services', bookingData.serviceId);
                                const serviceSnap = await getDoc(serviceRef);
                                if (serviceSnap.exists()) {
                                    bookingData.serviceName = serviceSnap.data().name;
                                }
                            }
                            return bookingData;
                        }));
                        setBookings(fetchedBookings);
                    }, (error) => {
                        console.error("Erro ao escutar agendamentos:", error);
                        setBookings([]);
                    });

                    if (!hasAcceptedLatestPolicies(stayData, propertyData) && pathname !== '/termos') {
                        router.push('/termos');
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
                         router.push('/portal');
                    });
                } else {
                    setIsLoading(false);
                }
            }
        };

        const unsubscribeAuth = onAuthStateChanged(auth, handleUserSession);
        
        return () => {
            unsubscribeAuth();
            unsubscribeBookings();
        };
    }, [logout, pathname, router]);
    
    // 3. CALCULANDO O PRIMEIRO NOME COM useMemo PARA EVITAR RECÁLCULOS
    const firstName = useMemo(() => getFirstName(stay?.guestName), [stay]);

    return (
        // 4. DISPONIBILIZANDO O firstName PARA OS COMPONENTES FILHOS
        <GuestContext.Provider value={{ user, stay, bookings, preCheckIn, isAuthenticated: !!user, isLoading, logout, firstName }}>
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

