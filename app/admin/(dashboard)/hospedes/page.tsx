"use client";

import { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase'; // Padrão seguro
import { collection, query, orderBy, onSnapshot, Firestore } from 'firebase/firestore'; 
import { Guest } from '@/types';
import { GuestsList } from '@/components/admin/guests/guests-list';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function GuestsPage() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState<Firestore | null>(null);

    useEffect(() => {
        let unsubscribe: () => void;

        const init = async () => {
            try {
                const firestoreDb = await getFirebaseDb();
                setDb(firestoreDb);

                if (!firestoreDb) {
                    toast.error("Erro de conexão.");
                    setLoading(false);
                    return;
                }

                // Query em tempo real
                const q = query(collection(firestoreDb, 'guests'), orderBy('name', 'asc'));
                
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const guestsData = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            // Converte Timestamps para number/Date se necessário no front
                            // O Firestore Client SDK já lida bem com isso, mas é bom garantir
                            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
                            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now(),
                            lastStay: data.lastStay?.toMillis ? data.lastStay.toMillis() : null
                        } as unknown as Guest;
                    });
                    setGuests(guestsData);
                    setLoading(false);
                }, (error) => {
                    console.error("Erro no listener de hóspedes:", error);
                    toast.error("Falha ao carregar lista.");
                    setLoading(false);
                });

            } catch (error) {
                console.error("Erro ao inicializar:", error);
                setLoading(false);
            }
        };

        init();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando base de hóspedes...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        Base de Hóspedes
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie o histórico e perfis dos seus clientes.
                    </p>
                </div>
                <div className="bg-primary/10 px-4 py-2 rounded-lg">
                    <span className="text-2xl font-bold text-primary">{guests.length}</span>
                    <span className="ml-2 text-sm text-primary/80">cadastros</span>
                </div>
            </header>

            {/* A lista agora recebe os dados carregados pelo cliente */}
            <GuestsList initialGuests={guests} />
        </div>
    );
}