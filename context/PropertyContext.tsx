"use client";

import { Property } from "@/types";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";

interface PropertyContextType {
    property: Property | null;
    loading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: React.ReactNode }) => {
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ## INÍCIO DA CORREÇÃO DE ROBUSTEZ ##
        let isMounted = true;

        const fetchProperty = async () => {
            try {
                const db = await getFirebaseDb();
                const propertyDocRef = doc(db, 'properties', 'main'); 
                const propertyDoc = await getDoc(propertyDocRef);
                if (propertyDoc.exists() && isMounted) {
                    setProperty({ id: propertyDoc.id, ...propertyDoc.data() } as Property);
                }
            } catch (error) {
                console.error("Error fetching property:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchProperty();

        return () => {
            isMounted = false;
        };
        // ## FIM DA CORREÇÃO DE ROBUSTEZ ##
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