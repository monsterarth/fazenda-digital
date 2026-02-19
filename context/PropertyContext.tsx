//context\PropertyContext.tsx

"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { getFirebaseDb, app } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { Property, BreakfastMenuCategory, BreakfastMenuItem } from '@/types';

interface PropertyContextType {
    property: Property | null;
    breakfastMenu: BreakfastMenuCategory[];
    loading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
    const [property, setProperty] = useState<Property | null>(null);
    const [breakfastMenu, setBreakfastMenu] = useState<BreakfastMenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            const db = await getFirebaseDb();
            if (!db) { setLoading(false); return; }

            // 1. Busca os dados públicos da propriedade (deve sempre funcionar).
            try {
                const propertyRef = doc(db, 'properties', 'default');
                const propertyDoc = await getDoc(propertyRef);
                if (propertyDoc.exists()) {
                    setProperty(propertyDoc.data() as Property);
                }
            } catch (error) {
                console.error("Failed to load public property data:", error);
            }

            // 2. Busca dados privados somente se as condições forem atendidas.
            if (currentUser) {
                const idTokenResult = await currentUser.getIdTokenResult();
                // Apenas tenta buscar o cardápio se o usuário for um hóspede.
                if (idTokenResult.claims.isGuest === true) {
                    try {
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
                    } catch (error) {
                        console.error("Failed to load breakfast menu for guest:", error);
                        setBreakfastMenu([]);
                    }
                } else {
                    // Garante que o menu esteja vazio para não-hóspedes (como admins).
                    setBreakfastMenu([]);
                }
            } else {
                // Garante que o menu esteja vazio para usuários deslogados.
                setBreakfastMenu([]);
            }

            setLoading(false);
        };
        
        fetchAllData();
    }, [currentUser]);

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