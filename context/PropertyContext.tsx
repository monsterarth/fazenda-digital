// context/PropertyContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
// IMPORTAMOS OS TIPOS DIRETAMENTE, INCLUINDO O PropertyColors CORRIGIDO
import { Property, PropertyColors } from '@/types';

interface PropertyContextType {
  property: Property | null;
  loading: boolean;
  themeColors: PropertyColors | null;
  setThemeColors: React.Dispatch<React.SetStateAction<PropertyColors | null>>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeColors, setThemeColors] = useState<PropertyColors | null>(null);

  useEffect(() => {
    const fetchAndSubscribeProperty = async () => {
      try {
        const db = await getFirebaseDb();
        const propertyRef = doc(db, 'properties', 'main_property');

        const unsubscribe = onSnapshot(propertyRef, (docSnap) => {
          if (docSnap.exists()) {
            const propertyData = { id: docSnap.id, ...docSnap.data() } as Property;
            setProperty(propertyData);
            if (propertyData.colors) {
              // Agora os tipos são compatíveis e o erro some
              setThemeColors(propertyData.colors);
            }
          } else {
            console.error("Documento da propriedade 'main_property' não encontrado.");
            setProperty(null);
            setThemeColors(null);
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
    <PropertyContext.Provider value={{ property, loading, themeColors, setThemeColors }}>
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