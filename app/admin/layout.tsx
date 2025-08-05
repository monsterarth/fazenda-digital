import React from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { getFirebaseDb } from '@/lib/firebase'; // Usando a versão server-side
import { doc, getDoc } from 'firebase/firestore';
import { Property } from '@/types';
import { AuthProvider } from '@/context/AuthContext'; // Vamos criar este contexto simples

async function getPropertyData() {
    try {
        const db = await getFirebaseDb();
        const propertyDoc = await getDoc(doc(db, 'properties', 'default'));
        if (propertyDoc.exists()) {
            return propertyDoc.data() as Property;
        }
    } catch (error) {
        console.error("Failed to fetch property data for admin layout:", error);
    }
    return null;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const property = await getPropertyData();

  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar property={property} />
        <main className="flex-1 p-6 bg-background">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}