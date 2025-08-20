// fazenda-digital/app/admin/(dashboard)/stays/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { PreCheckIn, Stay, Cabin, Property } from '@/types';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Users, FileCheck2 } from 'lucide-react';
import { CreateStayDialog } from '@/components/admin/stays/create-stay-dialog';
import { PendingCheckInsList } from '@/components/admin/stays/pending-checkins-list';
import { StaysList } from '@/components/admin/stays/stays-list';
import { EditStayDialog } from '@/components/admin/stays/edit-stay-dialog';
import { useAuth } from '@/context/AuthContext';
import { useReactToPrint } from 'react-to-print';
import { ThermalCoupon } from '@/components/admin/stays/thermal-coupon';

export default function ManageStaysPage() {
    const { isAdmin } = useAuth();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [pendingCheckIns, setPendingCheckIns] = useState<PreCheckIn[]>([]);
    const [activeStays, setActiveStays] = useState<Stay[]>([]);
    const [cabins, setCabins] = useState<Cabin[]>([]);
    const [properties, setProperties] = useState<Property[]>([]); // Estado para propriedade
    const [loading, setLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStayForModal, setSelectedStayForModal] = useState<Stay | null>(null);

    // --- LÓGICA DE IMPRESSÃO REINTEGRADA ---
    const [selectedStayForPrint, setSelectedStayForPrint] = useState<Stay | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const componentRef = useRef<HTMLDivElement>(null);

    const print = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Cupom-${selectedStayForPrint?.guestName || 'Hospede'}`,
    });

    const handlePrint = (stayToPrint: Stay) => {
        setSelectedStayForPrint(stayToPrint);
        const url = `${window.location.origin}/?token=${stayToPrint.token}`;
        setQrCodeUrl(url);
        setTimeout(() => print(), 100);
    };
    // --- FIM DA LÓGICA DE IMPRESSÃO ---

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

            // Unsubscribe listeners
            const unsubscribers: firestore.Unsubscribe[] = [];

            // Fetch Properties
            const qProperties = firestore.query(firestore.collection(firestoreDb, 'properties'));
            unsubscribers.push(firestore.onSnapshot(qProperties, (snapshot) => {
                const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
                setProperties(propsData);
            }));
            
            // Fetch Pending Check-ins
            const qCheckIns = firestore.query(firestore.collection(firestoreDb, 'preCheckIns'), firestore.where('status', '==', 'pendente'));
            unsubscribers.push(firestore.onSnapshot(qCheckIns, (snapshot) => {
                const checkInsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreCheckIn));
                setPendingCheckIns(checkInsData);
            }));

            // Fetch Active Stays
            const qStays = firestore.query(firestore.collection(firestoreDb, 'stays'), firestore.where('status', '==', 'active'), firestore.orderBy('checkInDate', 'asc'));
            unsubscribers.push(firestore.onSnapshot(qStays, (snapshot) => {
                const staysData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stay));
                setActiveStays(staysData);
                setLoading(false); // Apenas o principal loader
            }));

            // Fetch Cabins
            const qCabins = firestore.query(firestore.collection(firestoreDb, 'cabins'), firestore.orderBy('posicao', 'asc'));
            unsubscribers.push(firestore.onSnapshot(qCabins, (snapshot) => {
                const cabinsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cabin));
                setCabins(cabinsData);
            }));

            return () => unsubscribers.forEach(unsub => unsub());
        };

        initializeApp();
    }, [isAdmin]);

    const handleOpenEditModal = (stay: Stay) => {
        setSelectedStayForModal(stay);
        setIsEditModalOpen(true);
    };

    const memoizedActiveStays = useMemo(() => activeStays, [activeStays]);
    
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
                                activeStays={memoizedActiveStays}
                                onEditStay={handleOpenEditModal}
                                onPrintStay={handlePrint} // Passando a função de impressão para a lista
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            <CreateStayDialog isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} cabins={cabins} db={db} />

            {selectedStayForModal && db && (
                <EditStayDialog isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} stay={selectedStayForModal} cabins={cabins} db={db} />
            )}

            {/* Componente de impressão oculto */}
            <div style={{ display: 'none' }}>
                {selectedStayForPrint && (
                    <ThermalCoupon
                        ref={componentRef}
                        stay={selectedStayForPrint}
                        qrUrl={qrCodeUrl}
                        propertyName={properties.length > 0 ? properties[0].name : "Synapse"}
                        propertyLogoUrl={properties.length > 0 ? properties[0].logoUrl : undefined}
                    />
                )}
            </div>
        </div>
    );
}