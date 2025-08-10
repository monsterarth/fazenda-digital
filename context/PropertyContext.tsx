"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Property, BreakfastMenuCategory, BreakfastMenuItem } from '@/types';
// ++ Importa o useGuest para saber o status de autenticação do hóspede
import { useGuest } from './GuestProvider'; 

interface PropertyContextType {
    property: Property | null;
    breakfastMenu: BreakfastMenuCategory[];
    loading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
    // ++ Usa o hook do GuestProvider para saber se o hóspede está logado e carregando
    const { isAuthenticated, isLoading: isGuestLoading } = useGuest(); 
    const [property, setProperty] = useState<Property | null>(null);
    const [breakfastMenu, setBreakfastMenu] = useState<BreakfastMenuCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const db = await getFirebaseDb();
                if (!db) throw new Error("DB connection failed");

                // 1. Busca os dados públicos da propriedade (sempre)
                const propertyRef = doc(db, 'properties', 'default');
                const propertyDoc = await getDoc(propertyRef);
                if (propertyDoc.exists()) {
                    setProperty(propertyDoc.data() as Property);
                }

                // 2. ++ LÓGICA CONDICIONAL PARA O CARDÁPIO ++
                // Só tenta buscar o cardápio se a autenticação do hóspede foi verificada
                // e confirmada como bem-sucedida.
                if (!isGuestLoading && isAuthenticated) {
                    const menuRef = doc(db, "breakfastMenus", "default_breakfast");
                    const categoriesQuery = query(collection(menuRef, "categories"), orderBy("order", "asc"));
                    const categoriesSnapshot = await getDocs(categoriesQuery);
                    
                    const categoriesData = await Promise.all(categoriesSnapshot.docs.map(async (categoryDoc) => {
                        const itemsQuery = query(collection(categoryDoc.ref, "items"), orderBy("order", "asc"));
                        const itemsSnapshot = await getDocs(itemsQuery);
                        const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BreakfastMenuItem);
                        return { id: categoryDoc.id, ...categoryDoc.data(), items } as BreakfastMenuCategory;
                    }));
                    
                    setBreakfastMenu(categoriesData);
                } else {
                    // Se o usuário não estiver logado, garante que o menu esteja vazio.
                    setBreakfastMenu([]);
                }

            } catch (error) {
                console.error("Error loading property context data:", error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchAllData();
    // ++ A dependência agora é o status de autenticação do hóspede
    }, [isAuthenticated, isGuestLoading]); 

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