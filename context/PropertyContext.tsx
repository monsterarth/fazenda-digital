"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, collection, query, orderBy, getDocs, Firestore } from "firebase/firestore";
import { Property, BreakfastMenuCategory, BreakfastMenuItem } from "@/types";
import { getFirebaseDb } from "@/lib/firebase";

interface PropertyContextType {
    property: Property | null;
    loading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

// Função para buscar o cardápio de forma isolada
const fetchBreakfastMenu = async (db: Firestore): Promise<BreakfastMenuCategory[]> => {
    try {
        const menuId = "default_breakfast";
        const categoriesRef = collection(db, "breakfastMenus", menuId, "categories");
        const categoriesQuery = query(categoriesRef, orderBy("order", "asc"));
        
        const snapshot = await getDocs(categoriesQuery);
        if (snapshot.empty) return [];

        // Para cada categoria, busca os itens correspondentes
        const categoriesData = await Promise.all(
            snapshot.docs.map(async (categoryDoc) => {
                const categoryData = categoryDoc.data();
                
                const itemsRef = collection(categoryDoc.ref, "items");
                const itemsQuery = query(itemsRef, orderBy("order", "asc"));
                const itemsSnapshot = await getDocs(itemsQuery);
                
                const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BreakfastMenuItem[];
                
                return { id: categoryDoc.id, ...categoryData, items } as BreakfastMenuCategory;
            })
        );
        
        return categoriesData;

    } catch (error) {
        console.error("Error fetching breakfast menu:", error);
        return []; // Retorna um array vazio em caso de erro
    }
};

export const PropertyProvider = ({ children }: { children: React.ReactNode }) => {
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPropertyAndMenu = async () => {
            try {
                const db = await getFirebaseDb();
                if (!db) throw new Error("Database connection failed");

                // 1. Busca os dados principais da propriedade
                const propertyDocRef = doc(db, 'properties', 'default'); 
                const propertyDoc = await getDoc(propertyDocRef);
                
                if (propertyDoc.exists()) {
                    const propertyData = { id: propertyDoc.id, ...propertyDoc.data() } as Property;

                    // 2. Busca o cardápio do café da manhã da coleção separada
                    const menu = await fetchBreakfastMenu(db);
                    
                    // 3. Anexa o cardápio ao objeto da propriedade
                    if (propertyData.breakfast) {
                        propertyData.breakfast.menu = menu;
                    } else {
                        // Garante que o objeto breakfast exista caso não tenha sido criado no admin
                        propertyData.breakfast = {
                            isAvailable: false,
                            type: 'delivery',
                            orderingStartTime: '00:00',
                            orderingEndTime: '00:00',
                            menu: menu,
                        };
                    }
                    
                    setProperty(propertyData);
                }
            } catch (error) {
                console.error("Error fetching property data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPropertyAndMenu();
    }, []);

    return (
        <PropertyContext.Provider value={{ property, loading }}>
            {children}
        </PropertyContext.Provider>
    );
}

export const useProperty = () => {
    const context = useContext(PropertyContext);
    if(context === undefined){
        throw new Error("useProperty must be used within a PropertyProvider");
    }
    return context;
}