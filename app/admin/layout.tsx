import React from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Property } from '@/types';
import { AuthProvider } from '@/context/AuthContext';
import PrivateRoute from '@/components/admin/private-route';

// 1. O Layout (Server Component) busca os dados iniciais
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

// O componente cliente que irá conter a lógica de autenticação e o layout visual
function AdminLayoutClient({ children, property }: { children: React.ReactNode, property: Property | null }) {
    return (
        <AuthProvider>
            <PrivateRoute>
                <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                    <Sidebar property={property} />
                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </PrivateRoute>
        </AuthProvider>
    );
}

// 2. O export default continua sendo um Server Component
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const property = await getPropertyData();

    return <AdminLayoutClient property={property}>{children}</AdminLayoutClient>;
}