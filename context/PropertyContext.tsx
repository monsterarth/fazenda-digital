// context/PropertyContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
// IMPORTAMOS OS TIPOS DIRETAMENTE, INCLUINDO O PropertyColors E BreakfastMenuCategory
import { Property, PropertyColors, BreakfastMenuCategory } from '@/types';

interface PropertyContextType {
  property: Property | null;
  loading: boolean;
  themeColors: PropertyColors | null;
  setThemeColors: React.Dispatch<React.SetStateAction<PropertyColors | null>>;
  breakfastMenu: BreakfastMenuCategory[]; // ADICIONADO
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeColors, setThemeColors] = useState<PropertyColors | null>(null);
  const [breakfastMenu, setBreakfastMenu] = useState<BreakfastMenuCategory[]>([]); // ADICIONADO

  useEffect(() => {
    const fetchAndSubscribeProperty = async () => {
      try {
        const db = await getFirebaseDb();
        // CORREÇÃO: O ID do documento principal da propriedade foi ajustado.
        const propertyRef = doc(db, 'properties', 'default'); 

        const unsubscribe = onSnapshot(propertyRef, (docSnap) => {
          if (docSnap.exists()) {
            const propertyData = { id: docSnap.id, ...docSnap.data() } as Property;
            setProperty(propertyData);
            if (propertyData.colors) {
              setThemeColors(propertyData.colors);
            }
            // ADICIONADO: Extrai o menu do café para o contexto
            if (propertyData.breakfast?.menu) {
              setBreakfastMenu(propertyData.breakfast.menu);
            } else {
              setBreakfastMenu([]);
            }
          } else {
            console.error("Documento da propriedade 'default' não encontrado.");
            setProperty(null);
            setThemeColors(null);
            setBreakfastMenu([]); // ADICIONADO: Reseta o menu se a propriedade não for encontrada
          }
          setLoading(false);
        }, (error) => {
          console.error("Erro ao escutar as alterações da propriedade:", error);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Erro ao configurar o listener da propriedade:", error);
        setLoading(false);
      }
    };

    const unsubscribePromise = fetchAndSubscribeProperty();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    };
  }, []);

  return (
    // ADICIONADO: breakfastMenu agora faz parte do valor do contexto
    <PropertyContext.Provider value={{ property, loading, themeColors, setThemeColors, breakfastMenu }}>
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