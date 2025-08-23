"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Guide, Cabin } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Download, X, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Componente para renderizar cada guia como um card/ícone clicável
const GuideCard = ({ guide, onClick }: { guide: Guide, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className="flex flex-col items-center justify-center text-center p-4 aspect-square transition-transform transform hover:scale-105 active:scale-95 cursor-pointer bg-background rounded-2xl shadow-md border"
    >
        <div className="flex items-center justify-center w-16 h-16 mb-3 rounded-2xl bg-primary/10">
            <FileText className="h-8 w-8 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground leading-tight">{guide.title}</span>
    </div>
);

export default function GuiasPage() {
    const { stay, isLoading: isGuestLoading } = useGuest();
    const router = useRouter();
    const [guides, setGuides] = useState<Guide[]>([]);
    const [cabin, setCabin] = useState<Cabin | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [viewingGuide, setViewingGuide] = useState<Guide | null>(null);

    useEffect(() => {
        if (isGuestLoading) return;
        if (!stay) {
            router.push('/portal');
            return;
        }

        const fetchData = async () => {
            const db = await getFirebaseDb();
            if (!db) {
                setLoading(false);
                return;
            }

            const guidesQuery = firestore.query(firestore.collection(db, 'guides'));
            const unsubGuides = firestore.onSnapshot(guidesQuery, (snapshot) => {
                setGuides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guide)));
            });

            const cabinRef = firestore.doc(db, 'cabins', stay.cabinId);
            const cabinSnap = await firestore.getDoc(cabinRef);
            if (cabinSnap.exists()) {
                setCabin(cabinSnap.data() as Cabin);
            }

            setLoading(false);

            return () => unsubGuides();
        };

        fetchData();
    }, [stay, isGuestLoading, router]);

    const sortedAndFilteredGuides = useMemo(() => {
        const general = guides.filter(g => g.scope === 'general');
        const specific = guides.filter(g => {
            if (g.scope !== 'specific' || !cabin?.equipment) return false;
            return cabin.equipment.some(eq => eq.type === g.equipmentType && eq.model === g.equipmentModel);
        });
        // Retorna um único array com os guias gerais primeiro
        return [...general, ...specific];
    }, [guides, cabin]);

    if (loading || isGuestLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="flex-shrink-0" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Voltar</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Guias e Manuais</h1>
                    <p className="text-muted-foreground">Informações úteis para sua estadia.</p>
                </div>
            </div>

            {/* Nova grade de guias */}
            {sortedAndFilteredGuides.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sortedAndFilteredGuides.map(guide => (
                        <GuideCard key={guide.id} guide={guide} onClick={() => setViewingGuide(guide)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">Nenhum guia disponível no momento.</p>
                </div>
            )}

            {/* Modal de visualização de PDF otimizado */}
            <Dialog open={!!viewingGuide} onOpenChange={(isOpen) => !isOpen && setViewingGuide(null)}>
                <DialogContent className="p-0 border-0 w-screen h-screen max-w-full sm:max-w-4xl sm:h-[90vh] rounded-none sm:rounded-lg flex flex-col">
                    <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background rounded-t-lg">
                        <DialogTitle>{viewingGuide?.title}</DialogTitle>
                        <Button variant="ghost" size="icon" onClick={() => setViewingGuide(null)} className="rounded-full">
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogHeader>
                    <div className="flex-1 h-full">
                        {/* Adiciona #toolbar=0 para tentar ocultar a UI do visualizador de PDF */}
                        <iframe 
                            src={`${viewingGuide?.fileUrl}#toolbar=0&navpanes=0`}
                            className="w-full h-full"
                            title={viewingGuide?.title}
                        />
                    </div>
                    <DialogFooter className="p-4 border-t bg-background rounded-b-lg">
                        <Button asChild>
                            <Link href={viewingGuide?.fileUrl || ''} target="_blank" download>
                                <Download className="mr-2 h-4 w-4"/>
                                Baixar PDF
                            </Link>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
