// app/admin/(dashboard)/hospedes/page.tsx

"use client"; // Converte a página para um Componente de Cliente

import React, { useState, useEffect } from 'react';
import { Guest } from '@/types/guest';
import { GuestsList } from '@/components/admin/guests/guests-list';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function GuestsPage() {
    const { isAdmin } = useAuth();
    const [guests, setGuests] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }

        const initializeListener = async () => {
            const db = await getFirebaseDb();
            const guestsRef = firestore.collection(db, 'guests');
            const q = firestore.query(guestsRef, firestore.orderBy('name', 'asc'));

            const unsubscribe = firestore.onSnapshot(q, (querySnapshot) => {
                const guestsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Guest));
                setGuests(guestsData);
                setLoading(false);
            });

            // Função de limpeza para remover o listener
            return () => unsubscribe();
        };

        initializeListener();
    }, [isAdmin]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        );
    }
    
    return <GuestsList initialGuests={guests} />;
}