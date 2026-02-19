// app/salao/mesas/[tableId]/page.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs, 
  doc,      
  updateDoc,
  limit,    
} from 'firebase/firestore';
import { useAuth, UserRole } from '@/context/AuthContext';
// ++ CORREÇÃO: Removida a importação 'getTimestampInMillis' que não existe ++
import { BreakfastMenuItem, BreakfastMenuCategory, Flavor, Timestamp } from '@/types/index';
import { KitchenOrderItem, KitchenOrder } from '@/types/cafe';
import { Loader2, ArrowLeft, Send, Plus, Minus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { SalaoAuthGuard } from '../../components/SalaoAuthGuard';

// Roles que podem acessar esta página
const ALLOWED_ROLES: UserRole[] = ['cafe', 'super_admin'];

// Item da comanda interna antes de ser enviada
interface ComandaItem extends KitchenOrderItem {
  id: string; // ID único do item (itemId + flavorId)
}

// ++ CORREÇÃO: Função helper ADICIONADA DE VOLTA ao arquivo ++
/**
 * Converte o tipo Timestamp (que é uma união) para um número de milissegundos.
 */
const timestampToMillis = (timestamp: Timestamp | undefined | null): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') {
    return timestamp; // Já é um número (millis)
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime(); // É um objeto Date
  }
  // É um objeto FirestoreTimestamp
  if (typeof timestamp === 'object' && 'toMillis' in timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  // Fallback para o formato com seconds/nanoseconds (embora não esteja no seu tipo principal)
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
     return (timestamp as any).seconds * 1000;
  }
  return 0;
};

// (Função helper de data para o dia de hoje)
const getTodayString = () => new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'America/Sao_Paulo',
}).format(new Date());


function MesaComandaPage() {
  const router = useRouter();
  const params = useParams();
  const tableId = decodeURIComponent(params.tableId as string);
  
  const { user } = useAuth();
  
  const [pratosQuentes, setPratosQuentes] = useState<BreakfastMenuCategory[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const [comandaItems, setComandaItems] = useState<Map<string, ComandaItem>>(new Map());
  const [existingOrders, setExistingOrders] = useState<KitchenOrder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Carrega o cardápio do /breakfastMenus
  useEffect(() => {
    async function fetchMenu() {
      if (!db) return;
      setLoadingMenu(true);
      try {
        const categoriesRef = collection(db, 'breakfastMenus', 'default_breakfast', 'categories');
        const q = query(categoriesRef, where("type", "==", "individual")); 
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          toast.error("Erro Crítico: Nenhuma categoria 'individual' encontrada no cardápio.");
          setLoadingMenu(false);
          return;
        }

        const menu: BreakfastMenuCategory[] = [];
        
        for (const categoryDoc of snapshot.docs) {
          const categoryData = categoryDoc.data() as Omit<BreakfastMenuCategory, 'id' | 'items'>;
          
          const itemsRef = collection(db, 'breakfastMenus', 'default_breakfast', 'categories', categoryDoc.id, 'items');
          const itemsSnapshot = await getDocs(itemsRef);
          
          const items: BreakfastMenuItem[] = [];
          itemsSnapshot.forEach(itemDoc => {
            //
            if (itemDoc.data().available) { 
                 items.push({ id: itemDoc.id, ...itemDoc.data() } as BreakfastMenuItem)
            }
          });
          
          menu.push({ 
            ...categoryData, 
            id: categoryDoc.id, 
            items: items.sort((a,b) => a.order - b.order) 
          });
        }
        
        setPratosQuentes(menu.sort((a, b) => a.order - b.order)); 
      } catch (err: any) {
        console.error("Falha ao carregar cardápio:", err);
        toast.error("Falha ao carregar o cardápio.", { description: err.message });
      } finally {
        setLoadingMenu(false);
      }
    }
    fetchMenu();
  }, []);

  // Ouve pedidos já enviados para esta mesa
  useEffect(() => {
    if (!db) return;
    const todayStr = getTodayString();
    const startOfDay = new Date(todayStr);
    startOfDay.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'kitchenOrders'),
      where('table', '==', tableId),
      where('createdAt', '>=', startOfDay)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders: KitchenOrder[] = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as KitchenOrder);
      });
      // ++ CORREÇÃO: Usando a função helper local
      setExistingOrders(
        orders.sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt))
      );
      setLoadingHistory(false);
    }, (err) => {
      toast.error("Erro ao buscar histórico da mesa.");
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [tableId]);

  // Ação: Enviar comanda para a cozinha
  const handleSendOrder = async () => {
    if (comandaItems.size === 0) return toast.info("Adicione pelo menos um item.");
    if (!user) return toast.error("Você não está logado.");

    setIsSubmitting(true);
    const toastId = toast.loading("Enviando para a cozinha...");

    const newOrder: Omit<KitchenOrder, 'id'> = {
      table: tableId,
      items: Array.from(comandaItems.values()).map(({ id, ...rest }) => rest),
      status: 'pending',
      createdAt: serverTimestamp() as any,
      createdBy: user.displayName || user.email || 'Garçom',
    };

    try {
      await addDoc(collection(db, 'kitchenOrders'), newOrder);
      toast.success("Pedido enviado!", { id: toastId });
      setComandaItems(new Map()); // Limpa a comanda
    } catch (err: any) {
      toast.error("Falha ao enviar o pedido.", { id: toastId, description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ação: Encerrar a mesa
  const handleCloseTable = async () => {
    setIsSubmitting(true); 
    const toastId = toast.loading("Encerrando a mesa...");

    try {
      const todayStr = getTodayString();
      const tablesRef = collection(db, 'breakfastTables');
      const q = query(
        tablesRef,
        where("date", "==", todayStr),
        where("tableName", "==", tableId),
        limit(1)
      );
      
      const tableSnapshot = await getDocs(q);
      
      if (tableSnapshot.empty) {
         toast.success("Mesa (avulsa) encerrada.", { id: toastId });
         router.push('/salao/mesas');
         return;
      }

      const tableDocId = tableSnapshot.docs[0].id;
      const docRef = doc(db, 'breakfastTables', tableDocId);
      await updateDoc(docRef, { status: 'closed' });
      
      toast.success("Mesa encerrada com sucesso.", { id: toastId });
      router.push('/salao/mesas'); 
      
    } catch (err: any) {
      toast.error("Falha ao encerrar a mesa.", { id: toastId, description: err.message });
      setIsSubmitting(false);
    }
  };

  // Funções de controle da comanda (adicionar/remover item)
  const addToComanda = (item: BreakfastMenuItem, flavor?: Flavor) => {
    const id = flavor ? `${item.id}-${flavor.id}` : item.id;
    const existing = comandaItems.get(id);
    const newItem: ComandaItem = {
      id: id, itemId: item.id, itemName: item.name,
      flavorName: flavor?.name,
      quantity: (existing?.quantity || 0) + 1,
    };
    setComandaItems(new Map(comandaItems.set(id, newItem)));
  };
  const removeFromComanda = (id: string) => {
    const existing = comandaItems.get(id);
    if (!existing) return;
    if (existing.quantity > 1) {
      const updatedItem = { ...existing, quantity: existing.quantity - 1 };
      setComandaItems(new Map(comandaItems.set(id, updatedItem)));
    } else {
      const newMap = new Map(comandaItems);
      newMap.delete(id);
      setComandaItems(newMap);
    }
  };
  const comandaArray = useMemo(() => Array.from(comandaItems.values()), [comandaItems]);
  // --- Fim das Funções de Ação ---


  // Loader principal
  if (loadingMenu) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="flex items-center p-4 bg-white shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => router.push('/salao/mesas')}>
            <ArrowLeft className="h-5 w-5 text-brand-dark-green" />
          </Button>
          <h1 className="text-2xl font-bold text-brand-dark-green ml-2 truncate">{tableId}</h1>
        </header>
        <div className="flex justify-center items-center flex-grow">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          <span className="ml-2 text-brand-mid-green">Carregando cardápio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between p-4 sticky top-0 bg-white shadow-sm z-10">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push('/salao/mesas')} disabled={isSubmitting}>
            <ArrowLeft className="h-5 w-5 text-brand-dark-green" />
          </Button>
          <h1 className="text-2xl font-bold text-brand-dark-green ml-2 truncate">
            {tableId}
          </h1>
        </div>
        <Button variant="destructive" size="sm" onClick={handleCloseTable} disabled={isSubmitting}>
          <XCircle className="h-4 w-4 mr-2" />
          Encerrar Mesa
        </Button>
      </header>

      {/* Conteúdo (dividido: cardápio e histórico) */}
      <div className="flex flex-col lg:flex-row flex-grow">
        
        {/* Coluna 1: Cardápio e Nova Comanda */}
        <div className="w-full lg:w-1/2 p-4 space-y-4">
          
          {/* Nova Comanda */}
          <Card className="sticky top-[76px]">
            <CardHeader>
              <CardTitle>Nova Comanda</CardTitle>
            </CardHeader>
            <CardContent>
              {comandaArray.length === 0 ? (
                <p className="text-sm text-brand-mid-green">Selecione itens do cardápio abaixo.</p>
              ) : (
                <div className="space-y-3">
                  {comandaArray.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-brand-dark-green">{item.itemName}</p>
                        {item.flavorName && <p className="text-sm text-brand-mid-green">{item.flavorName}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => removeFromComanda(item.id)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-bold w-6 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => {
                           const category = pratosQuentes.find(c => c.items.some(i => i.id === item.itemId));
                           const originalItem = category?.items.find(i => i.id === item.itemId);
                           const originalFlavor = originalItem?.flavors.find(f => f.name === item.flavorName);
                           if (originalItem) addToComanda(originalItem, originalFlavor);
                        }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <Button className="w-full rounded-t-none" size="lg" onClick={handleSendOrder} disabled={isSubmitting || comandaArray.length === 0}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar para Cozinha
            </Button>
          </Card>

          {/* Cardápio de Pratos Quentes */}
          {pratosQuentes.length === 0 && !loadingMenu ? (
             <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Erro no Cardápio</CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-brand-mid-green">O cardápio de pratos quentes (tipo 'individual') não foi encontrado em <code className="text-xs">/breakfastMenus/default_breakfast/categories</code>. Verifique a configuração no Firestore.</p>
                </CardContent>
             </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Cardápio (Pratos Quentes)</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {pratosQuentes.map((category) => (
                    <AccordionItem value={category.id} key={category.id}>
                      <AccordionTrigger className="text-lg font-medium text-brand-dark-green">{category.name}</AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        {category.items.map((item) => (
                          <div key={item.id}>
                            {item.flavors && item.flavors.length > 0 ? (
                              <Accordion type="single" collapsible>
                                <AccordionItem value={item.id}>
                                  <AccordionTrigger className="text-base font-normal">{item.name}</AccordionTrigger>
                                  <AccordionContent className="pl-4 space-y-2">
                                    {item.flavors.map((flavor) => (
                                      <Button key={flavor.id} variant="outline" className="w-full justify-between" onClick={() => addToComanda(item, flavor)}>
                                        {flavor.name} <Plus className="h-4 w-4" />
                                      </Button>
                                    ))}
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            ) : (
                              <Button variant="outline" className="w-full justify-between" onClick={() => addToComanda(item)}>
                                {item.name} <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna 2: Histórico de Pedidos da Mesa */}
        <div className="w-full lg:w-1/2 p-4 border-t lg:border-t-0 lg:border-l border-gray-200 space-y-4">
          <h2 className="text-xl font-semibold text-brand-dark-green">Pedidos Enviados (Hoje)</h2>
          {loadingHistory ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-brand-primary" /></div>
          ) : existingOrders.length === 0 ? (
            <p className="text-sm text-brand-mid-green">Nenhum pedido enviado para esta mesa hoje.</p>
          ) : (
            existingOrders.map((order) => (
              <Card key={order.id} className="bg-white">
                <CardHeader>
                  <CardTitle className="text-lg text-brand-dark-green flex justify-between items-center">
                    Pedido {order.status === 'pending' ? <Badge variant="secondary"><Clock className="h-3 w-3 mr-1"/> Pendente</Badge> : <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1"/> Entregue</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {/* ++ CORREÇÃO: Usando a função helper local */}
                    Enviado por {order.createdBy} às {new Date(timestampToMillis(order.createdAt)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-brand-dark-green">{item.quantity}x {item.itemName} {item.flavorName && `(${item.flavorName})`}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function MesaComandaPageWrapper() {
  return (
    <SalaoAuthGuard allowedRoles={ALLOWED_ROLES}>
      <MesaComandaPage />
    </SalaoAuthGuard>
  );
}