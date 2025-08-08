"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Property, BreakfastMenuItem } from '@/types';
import { useAuth } from './AuthContext'; // Importa nosso hook seguro

interface PropertyContextType {
    property: Property | null;
    breakfastMenu: BreakfastMenuItem[];
    loading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

// Função auxiliar para buscar o menu, agora dentro do escopo do arquivo
const fetchBreakfastMenu = async (): Promise<BreakfastMenuItem[]> => {
    try {
        const db = await getFirebaseDb();
        if (!db) throw new Error("DB connection failed");
        
        const menuCollection = collection(db, 'cafeMenu');
        const q = query(menuCollection, orderBy('posicao', 'asc'));
        const menuSnapshot = await getDocs(q);
        
        return menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BreakfastMenuItem));
    } catch (error) {
        // O erro de permissão será capturado aqui e logado, mas não quebrará a aplicação.
        console.error("Error fetching breakfast menu:", error);
        return [];
    }
};

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
    // Agora é seguro chamar useAuth em qualquer lugar.
    const { isAdmin } = useAuth(); 
    
    const [property, setProperty] = useState<Property | null>(null);
    const [breakfastMenu, setBreakfastMenu] = useState<BreakfastMenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // ++ EFEITO 1: Busca dados PÚBLICOS. Roda sempre.
    useEffect(() => {
        const fetchPublicData = async () => {
            setLoading(true);
            try {
                const db = await getFirebaseDb();
                if (!db) throw new Error("DB connection failed");

                const propertyRef = doc(db, 'properties', 'default');
                const propertyDoc = await getDoc(propertyRef);
                if (propertyDoc.exists()) {
                    setProperty(propertyDoc.data() as Property);
                }
            } catch (error) {
                console.error("Error loading property data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPublicData();
    }, []);

    // ++ EFEITO 2: Busca dados PRIVADOS. Roda apenas se o usuário for admin.
    useEffect(() => {
        const fetchAdminData = async () => {
            if (isAdmin) {
                const menu = await fetchBreakfastMenu();
                setBreakfastMenu(menu);
            } else {
                // Garante que o menu esteja vazio se o usuário não for admin
                setBreakfastMenu([]);
            }
        };
        fetchAdminData();
    }, [isAdmin]); // A dependência é o status de admin

    return (
        <PropertyContext.Provider value={{ property, loading, breakfastMenu }}>
            {children}
        </PropertyContext.Provider>
    );
};

export const useProperty = () => {
    const context = useContext(PropertyContext);
    if (context === undefined) {
        throw new Error('useProperty must be used within a PropertyProvider');
    }
    return context;
};