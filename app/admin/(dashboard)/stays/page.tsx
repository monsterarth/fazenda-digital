// app/admin/(dashboard)/stays/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { PreCheckIn, Stay, Cabin, Property, BreakfastOrder } from '@/types';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, FileCheck2, PlusCircle, Archive, History } from 'lucide-react'; // Ícones adicionados
import { PendingCheckInsList } from '@/components/admin/stays/pending-checkins-list';
import { StaysList } from '@/components/admin/stays/stays-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subDays } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button'; // Importe do Button
import { useModalStore } from '@/hooks/use-modal-store'; // Importe do Modal Store

export default function ManageStaysPage() {
    const { isAdmin } = useAuth();
    const { onOpen } = useModalStore(); // Hook para abrir os modais
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    
    const [pendingCheckIns, setPendingCheckIns] = useState<PreCheckIn[]>([]);
    const [activeStays, setActiveStays] = useState<Stay[]>([]);
    const [checkedOutStays, setCheckedOutStays] = useState<Stay[]>([]);
    const [breakfastOrders, setBreakfastOrders] = useState<BreakfastOrder[]>([]);
    const [cabins, setCabins] = useState<Cabin[]>([]);
    const [property, setProperty] = useState<Property | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }

        const initializeListeners = async () => {
            setLoading(true);
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);

            if (!firestoreDb) {
                toast.error("Falha ao conectar ao banco de dados.");
                setLoading(false);
                return;
            }

            const unsubscribers: firestore.Unsubscribe[] = [];

            const qCheckIns = firestore.query(firestore.collection(firestoreDb, 'preCheckIns'), firestore.where('status', '==', 'pendente'));
            unsubscribers.push(firestore.onSnapshot(qCheckIns, (snapshot) => {
                setPendingCheckIns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreCheckIn)));
            }));

            const qStays = firestore.query(firestore.collection(firestoreDb, 'stays'), firestore.where('status', '==', 'active'), firestore.orderBy('checkInDate', 'asc'));
            unsubscribers.push(firestore.onSnapshot(qStays, (snapshot) => {
                setActiveStays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stay)));
                setLoading(false);
            }));
            
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
            
            const qCabins = firestore.query(firestore.collection(firestoreDb, 'cabins'), firestore.orderBy('posicao', 'asc'));
            unsubscribers.push(firestore.onSnapshot(qCabins, (snapshot) => {
                setCabins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cabin)));
            }));

            unsubscribers.push(firestore.onSnapshot(firestore.collection(firestoreDb, 'properties'), (snapshot) => {
                if (!snapshot.empty) {
                    setProperty({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Property);
                }
            }));
            
            const todayStr = new Date().toISOString().split('T')[0];
            const qBreakfast = firestore.query(firestore.collection(firestoreDb, 'breakfastOrders'), firestore.where('deliveryDate', '==', todayStr));
            unsubscribers.push(firestore.onSnapshot(qBreakfast, (snapshot) => {
                setBreakfastOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BreakfastOrder)));
            }));

            return () => unsubscribers.forEach(unsub => unsub());
        };

        initializeListeners();
    }, [isAdmin]);

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-8">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Estadias</h1>
                    <p className="text-muted-foreground">Valide pré-check-ins e acompanhe as estadias ativas.</p>
                </div>
                
                {/* --- ÁREA DOS BOTÕES --- */}
                <div className="flex items-center gap-3">
                    {/* Botão Legado Discreto */}
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => onOpen('createStayLegacy')}
                    >
                        <History className="mr-2 h-4 w-4" />
                        Modo Legado
                    </Button>

                    {/* Botão Principal Novo */}
                    <Button 
                        onClick={() => onOpen('createStay', { cabins: cabins })} // <--- ALTERAÇÃO AQUI
                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    >
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Nova Estadia Rápida
                    </Button>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : (
                <>
                    <Tabs defaultValue="active">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="active">Estadias Ativas ({activeStays.length})</TabsTrigger>
                            <TabsTrigger value="pending">Pendentes ({pendingCheckIns.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active">
                             <Card className="shadow-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Users className="text-green-600"/> Estadias Ativas e Futuras</CardTitle>
                                    <CardDescription>Hóspedes com estadias já confirmadas no sistema.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <StaysList stays={activeStays} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="pending">
                             <Card className="shadow-md">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><FileCheck2 className="text-yellow-600"/> Pré-Check-ins Pendentes</CardTitle>
                                    <CardDescription>Hóspedes que preencheram o formulário e aguardam validação.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <PendingCheckInsList pendingCheckIns={pendingCheckIns} cabins={cabins} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}