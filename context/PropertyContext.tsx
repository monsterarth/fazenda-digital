"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { Property } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

interface PropertyContextType {
    property: Property | null;
    loading: boolean;
}

const PropertyContext = createContext<PropertyContextType>({
    property: null,
    loading: true,
});

export const useProperty = () => useContext(PropertyContext);

// Função auxiliar para aplicar as cores como variáveis CSS
const applyTheme = (colors: Property['colors']) => {
    const root = document.documentElement;
    root.style.setProperty('--background', `hsl(from ${colors.background} h s l)`);
    root.style.setProperty('--foreground', `hsl(from ${colors.text} h s l)`);
    root.style.setProperty('--card', `hsl(from ${colors.card} h s l)`);
    root.style.setProperty('--card-foreground', `hsl(from ${colors.text} h s l)`);
    root.style.setProperty('--popover', `hsl(from ${colors.card} h s l)`);
    root.style.setProperty('--popover-foreground', `hsl(from ${colors.text} h s l)`);
    root.style.setProperty('--primary', `hsl(from ${colors.primary} h s l)`);
    root.style.setProperty('--primary-foreground', `hsl(from ${colors.textOnPrimary} h s l)`);
    root.style.setProperty('--secondary', `hsl(from ${colors.secondary} h s l)`);
    root.style.setProperty('--secondary-foreground', `hsl(from ${colors.textOnPrimary} h s l)`);
    root.style.setProperty('--muted', `hsl(from ${colors.secondary} h s 0.9)`);
    root.style.setProperty('--muted-foreground', `hsl(from ${colors.secondary} h s 0.6)`);
    root.style.setProperty('--accent', `hsl(from ${colors.accent} h s l)`);
    root.style.setProperty('--accent-foreground', `hsl(from ${colors.textOnPrimary} h s l)`);
    root.style.setProperty('--border', `hsl(from ${colors.secondary} h s 0.8)`);
    root.style.setProperty('--input', `hsl(from ${colors.secondary} h s 0.8)`);
    root.style.setProperty('--ring', `hsl(from ${colors.primary} h s l)`);
};

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProperty = async () => {
            const db = await getFirebaseDb();
            const docRef = doc(db, 'properties', 'default');
            
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as Property;
                    setProperty(data);
                    applyTheme(data.colors);
                } else {
                    // Lidar com o caso em que não há configurações (talvez um tema padrão)
                    console.error("Documento de personalização 'properties/default' não encontrado.");
                }
                setLoading(false);
            }, (error) => {
                console.error("Erro ao buscar dados de personalização:", error);
                setLoading(false);
            });

            return () => unsubscribe();
        };

        fetchProperty();
    }, []);

    // Renderiza um skeleton em tela cheia enquanto o tema está carregando para evitar piscar
    if (loading) {
        return (
            <div className="w-full h-screen">
                <Skeleton className="w-full h-full" />
            </div>
        );
    }
    
    return (
        <PropertyContext.Provider value={{ property, loading }}>
            {children}
        </PropertyContext.Provider>
    );
};