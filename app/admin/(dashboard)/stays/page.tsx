// fazenda-digital/app/admin/(dashboard)/stays/page.tsx

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { PreCheckIn, Stay, Cabin, Property, BreakfastOrder } from '@/types';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Users, FileCheck2 } from 'lucide-react';
import { CreateStayDialog } from '@/components/admin/stays/create-stay-dialog';
import { PendingCheckInsList } from '@/components/admin/stays/pending-checkins-list';
import { StaysList } from '@/components/admin/stays/stays-list';
import { EditStayDialog } from '@/components/admin/stays/edit-stay-dialog';
import { useAuth } from '@/context/AuthContext';
import { CommunicationsCenter } from '@/components/admin/stays/communications-center'; // IMPORTADO
import { subDays } from 'date-fns';

export default function ManageStaysPage() {
    const { isAdmin } = useAuth();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    
    // Estados para os dados
    const [pendingCheckIns, setPendingCheckIns] = useState<PreCheckIn[]>([]);
    const [activeStays, setActiveStays] = useState<Stay[]>([]);
    const [checkedOutStays, setCheckedOutStays] = useState<Stay[]>([]);
    const [breakfastOrders, setBreakfastOrders] = useState<BreakfastOrder[]>([]);
    const [cabins, setCabins] = useState<Cabin[]>([]);
    const [property, setProperty] = useState<Property | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    // Estados para os modais
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStay, setSelectedStay] = useState<Stay | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }

        const initializeApp = async () => {
            setLoading(true);
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);

            if (!firestoreDb) {
                toast.error("Falha ao conectar ao banco de dados.");
                setLoading(false);
                return;
            }

            const unsubscribers: firestore.Unsubscribe[] = [];

            // Fetch Property
            unsubscribers.push(firestore.onSnapshot(firestore.collection(firestoreDb, 'properties'), (snapshot) => {
                if (!snapshot.empty) {
                    setProperty({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Property);
                }
            }));
            
            // Fetch Pending Check-ins
            const qCheckIns = firestore.query(firestore.collection(firestoreDb, 'preCheckIns'), firestore.where('status', '==', 'pendente'));
            unsubscribers.push(firestore.onSnapshot(qCheckIns, (snapshot) => {
                setPendingCheckIns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreCheckIn)));
            }));

            // Fetch Active Stays
            const qStays = firestore.query(firestore.collection(firestoreDb, 'stays'), firestore.where('status', '==', 'active'), firestore.orderBy('checkInDate', 'asc'));
            unsubscribers.push(firestore.onSnapshot(qStays, (snapshot) => {
                setActiveStays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stay)));
                setLoading(false);
            }));

            // Fetch Recently Checked-out Stays (for feedback)
            const sevenDaysAgo = subDays(new Date(), 7);
            const qCheckedOut = firestore.query(
                firestore.collection(firestoreDb, 'stays'), 
                firestore.where('status', '==', 'checked_out'),
                firestore.where('checkOutDate', '>=', sevenDaysAgo.toISOString().split('T')[0]),
                firestore.orderBy('checkOutDate', 'desc')
            );
            unsubscribers.push(firestore.onSnapshot(qCheckedOut, (snapshot) => {
                setCheckedOutStays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stay)));
            }));

            // Fetch today's breakfast orders
            const todayStr = new Date().toISOString().split('T')[0];
            const qBreakfast = firestore.query(firestore.collection(firestoreDb, 'breakfastOrders'), firestore.where('deliveryDate', '==', todayStr));
            unsubscribers.push(firestore.onSnapshot(qBreakfast, (snapshot) => {
                setBreakfastOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BreakfastOrder)));
            }));
            
            // Fetch Cabins
            const qCabins = firestore.query(firestore.collection(firestoreDb, 'cabins'), firestore.orderBy('posicao', 'asc'));
            unsubscribers.push(firestore.onSnapshot(qCabins, (snapshot) => {
                setCabins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cabin)));
            }));

            return () => unsubscribers.forEach(unsub => unsub());
        };

        initializeApp();
    }, [isAdmin]);

    const handleOpenEditModal = (stay: Stay) => {
        setSelectedStay(stay);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedStay(null);
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-8">
            <Toaster richColors position="top-center" />
            
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Estadias</h1>
                    <p className="text-muted-foreground">Crie novas estadias ou valide pré-check-ins pendentes.</p>
                </div>
                <Button size="lg" onClick={() => setIsCreateModalOpen(true)}>
                    <PlusCircle className="mr-2 h-5 w-5"/> Criar Estadia Manualmente
                </Button>
            </header>

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : (
                <div className="flex flex-col gap-8">

                    {/* NOVO COMPONENTE INTEGRADO */}
                    <CommunicationsCenter 
                        db={db}
                        activeStays={activeStays}
                        checkedOutStays={checkedOutStays}
                        breakfastOrders={breakfastOrders}
                        cabins={cabins}
                        property={property}
                    />

                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileCheck2 className="text-yellow-600"/> Pré-Check-ins Pendentes</CardTitle>
                            <CardDescription>Hóspedes que preencheram o formulário e aguardam validação.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PendingCheckInsList db={db} pendingCheckIns={pendingCheckIns} cabins={cabins} />
                        </CardContent>
                    </Card>
                    
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users className="text-green-600"/> Estadias Ativas e Futuras</CardTitle>
                            <CardDescription>Hóspedes com estadias já confirmadas no sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StaysList 
                                activeStays={activeStays}
                                onEditStay={handleOpenEditModal}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            <CreateStayDialog isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} cabins={cabins} db={db} />

            {selectedStay && db && (
                <EditStayDialog 
                    isOpen={isEditModalOpen} 
                    onClose={handleCloseEditModal} 
                    stay={selectedStay} 
                    cabins={cabins} 
                    db={db}
                    property={property}
                />
            )}
        </div>
    );
}