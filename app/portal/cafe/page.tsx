"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as firestore from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useGuest } from '@/context/GuestProvider';
import { BreakfastMenuCategory, BreakfastMenuItem } from "@/types";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils'; // <-- CORREÇÃO: Importação do 'cn' adicionada.

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast, Toaster } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, Send, CheckCircle, Info, Phone } from 'lucide-react'; // <-- CORREÇÃO: Ícone 'Phone' adicionado.
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // <-- Agora vai funcionar após a instalação.


// Tipagem para o estado do pedido
interface OrderState {
    items: {
        [itemId: string]: {
            quantity: number;
            name: string;
            categoryName: string;
        }
    };
    generalNotes: string;
    deliveryDate: Date;
}

// --- PÁGINA PRINCIPAL ---
export default function GuestBreakfastPage() {
    const { stay, isAuthenticated, isLoading: isGuestLoading } = useGuest();
    const router = useRouter();
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [menu, setMenu] = useState<BreakfastMenuCategory[]>([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [orderState, setOrderState] = useState<OrderState>({
        items: {},
        generalNotes: '',
        deliveryDate: new Date(),
    });

    // Efeito para proteger a rota e inicializar o DB
    useEffect(() => {
        if (!isGuestLoading && !isAuthenticated) {
            router.push('/portal');
        }
        const initializeDb = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
        };
        initializeDb();
    }, [isAuthenticated, isGuestLoading, router]);

    // Efeito para carregar o cardápio
    useEffect(() => {
        if (!db) return;
        const menuId = "default_breakfast";
        const menuRef = firestore.doc(db, "breakfastMenus", menuId);
        const categoriesQuery = firestore.query(firestore.collection(menuRef, "categories"), firestore.orderBy("order", "asc"));

        const unsubscribe = firestore.onSnapshot(categoriesQuery, async (snapshot) => {
            const categoriesData = await Promise.all(snapshot.docs.map(async (categoryDoc) => {
                const categoryData = categoryDoc.data();
                const itemsQuery = firestore.query(firestore.collection(categoryDoc.ref, "items"), firestore.orderBy("order", "asc"));
                const itemsSnapshot = await firestore.getDocs(itemsQuery);
                const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BreakfastMenuItem));
                return { id: categoryDoc.id, ...categoryData, items } as BreakfastMenuCategory;
            }));
            setMenu(categoriesData);
            setLoadingMenu(false);
        }, (error) => {
            console.error("Error loading menu:", error);
            toast.error("Falha ao carregar o cardápio.");
            setLoadingMenu(false);
        });
        return () => unsubscribe();
    }, [db]);

    const handleQuantityChange = (item: BreakfastMenuItem, categoryName: string, change: number) => {
        setOrderState(prevState => {
            const currentItem = prevState.items[item.id] || { quantity: 0, name: item.name, categoryName };
            const newQuantity = Math.max(0, Math.min(stay?.numberOfGuests || 1, currentItem.quantity + change));
            
            const newItems = { ...prevState.items };
            if (newQuantity === 0) {
                delete newItems[item.id];
            } else {
                newItems[item.id] = { ...currentItem, quantity: newQuantity };
            }
            
            return { ...prevState, items: newItems };
        });
    };

    const handleSubmitOrder = async () => {
        if (!db || !stay) {
            toast.error("Erro: informações da estadia não encontradas.");
            return;
        }
        const toastId = toast.loading("Enviando seu pedido...");

        try {
            const orderData = {
                stayId: firestore.doc(db, 'stays', stay.id),
                deliveryDate: firestore.Timestamp.fromDate(orderState.deliveryDate),
                numberOfGuests: stay.numberOfGuests,
                items: Object.values(orderState.items).map(item => ({
                    itemName: item.name,
                    categoryName: item.categoryName,
                    quantity: item.quantity,
                })),
                generalNotes: orderState.generalNotes,
                status: "pending",
                createdAt: firestore.Timestamp.now(),
            };

            await firestore.addDoc(firestore.collection(db, 'breakfastOrders'), orderData);
            toast.success("Pedido enviado com sucesso!", { id: toastId });
            setCurrentStep(4); // Avança para a tela de sucesso
        } catch (error) {
            console.error("Error submitting order:", error);
            toast.error("Falha ao enviar o pedido.", { id: toastId });
        }
    };
    
    const orderedItems = useMemo(() => Object.values(orderState.items), [orderState.items]);

    if (isGuestLoading || loadingMenu) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
    }
    
    if (!isAuthenticated || !stay) return null;

    // --- RENDERIZAÇÃO DAS ETAPAS ---

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Boas-vindas
                return (
                    <Card>
                        <CardHeader><CardTitle>Pedido do Café da Manhã</CardTitle></CardHeader>
                        <CardContent className="space-y-4 text-center">
                            <p className="text-muted-foreground">Seja bem-vindo(a)! Prepare-se para montar uma cesta de café da manhã deliciosa que será entregue diretamente na sua cabana.</p>
                            <Button onClick={() => setCurrentStep(2)}>Começar <ArrowRight className="ml-2 h-4 w-4" /></Button>
                        </CardContent>
                    </Card>
                );

            case 2: // Seleção dos Itens
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Monte sua Cesta</CardTitle>
                            <CardDescription>Selecione os itens e as quantidades desejadas. O limite por item é o número de hóspedes ({stay.numberOfGuests}).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" defaultValue={menu.map(c => c.id)} className="w-full">
                                {menu.map(category => (
                                    <AccordionItem value={category.id} key={category.id}>
                                        <AccordionTrigger className="text-lg font-medium">{category.name}</AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4 pt-2">
                                                {category.items.filter(item => item.available).map(item => (
                                                    <div key={item.id} className="flex justify-between items-center">
                                                        <div>
                                                            <Label htmlFor={item.id} className="font-medium">{item.name}</Label>
                                                            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, category.name, -1)}>-</Button>
                                                            <span className="w-10 text-center font-bold">{orderState.items[item.id]?.quantity || 0}</span>
                                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, category.name, 1)}>+</Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                            <div className="flex justify-between mt-8">
                                <Button variant="outline" onClick={() => setCurrentStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                                <Button onClick={() => setCurrentStep(3)}>Revisar Pedido <ArrowRight className="ml-2 h-4 w-4" /></Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case 3: // Revisão do Pedido
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Revise seu Pedido</CardTitle>
                            <CardDescription>Confirme os itens da sua cesta antes de finalizar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {orderedItems.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">Sua cesta está vazia.</p>
                            ) : (
                                <div className="space-y-4">
                                    {menu.map(category => {
                                        const itemsInCategory = orderedItems.filter(item => item.categoryName === category.name);
                                        if (itemsInCategory.length === 0) return null;
                                        return (
                                            <div key={category.id}>
                                                <h3 className="font-semibold text-md mb-2">{category.name}</h3>
                                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                    {itemsInCategory.map(item => <li key={item.name}>{item.quantity}x {item.name}</li>)}
                                                </ul>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                             <div className="mt-6 space-y-2">
                                <Label htmlFor="generalNotes">Observações Gerais</Label>
                                <Textarea id="generalNotes" placeholder="Alguma alergia ou pedido especial? (Ex: sem cebola, ponto da carne, etc)" value={orderState.generalNotes} onChange={(e) => setOrderState(s => ({...s, generalNotes: e.target.value}))}/>
                            </div>
                            <div className="flex justify-between mt-8">
                                <Button variant="outline" onClick={() => setCurrentStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                                <Button onClick={handleSubmitOrder} disabled={orderedItems.length === 0}><Send className="mr-2 h-4 w-4" /> Enviar Pedido</Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            
            case 4: // Sucesso
                 return (
                    <Card className="text-center">
                        <CardHeader>
                            <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                            <CardTitle className="text-3xl mt-4">Pedido Enviado!</CardTitle>
                            <CardDescription>
                                Recebemos seu pedido de café da manhã e nossa equipe já está se preparando para encantá-lo(a).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Button asChild>
                                <a href="https://wa.me/5531991096590" target="_blank" rel="noopener noreferrer">
                                    <Phone className="mr-2 h-4 w-4" /> Falar com a Recepção
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                );

            default:
                return null;
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
             <Toaster richColors position="top-center" />
             <div className="max-w-2xl mx-auto">
                {renderStepContent()}
             </div>
        </div>
    );
}