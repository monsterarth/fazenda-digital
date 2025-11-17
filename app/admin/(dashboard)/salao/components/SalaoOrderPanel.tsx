// app/admin/salao/components/SalaoOrderPanel.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, query, where, onSnapshot,
  serverTimestamp, getDocs, doc, updateDoc, limit,
  writeBatch // ++ CORREÇÃO: Importação adicionada
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { BreakfastMenuItem, BreakfastMenuCategory, Flavor, Timestamp } from '@/types/index';
import { KitchenOrderItem, KitchenOrder } from '@/types/cafe';
import { Loader2, Send, Plus, Minus, CheckCircle, Clock, XCircle, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Props {
  tableId: string | null;
  onTableClosed: () => void;
}

// Item da comanda interna antes de ser enviada
interface ComandaItem extends KitchenOrderItem {
  id: string; // ID único do item (itemId + flavorId)
}

// Função helper para converter Timestamp
const timestampToMillis = (timestamp: Timestamp | undefined | null): number => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'object' && 'toMillis' in timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return (timestamp as any).seconds * 1000;
  }
  return 0;
};

const getTodayString = () => new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'America/Sao_Paulo',
}).format(new Date());

/**
 * Painel que contém a lógica de tomada de pedidos (comanda)
 * para a mesa selecionada.
 */
export function SalaoOrderPanel({ tableId, onTableClosed }: Props) {
  const { user } = useAuth();

  const [pratosQuentes, setPratosQuentes] = useState<BreakfastMenuCategory[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [comandaItems, setComandaItems] = useState<Map<string, ComandaItem>>(new Map());
  const [existingOrders, setExistingOrders] = useState<KitchenOrder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Carrega o cardápio (apenas uma vez, ao montar)
  useEffect(() => {
    async function fetchMenu() {
      if (!db) return;
      setLoadingMenu(true);
      try {
        const categoriesRef = collection(db, 'breakfastMenus', 'default_breakfast', 'categories');
        const q = query(categoriesRef, where("type", "==", "individual")); 
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          toast.error("Erro Crítico: Cardápio 'individual' não encontrado.");
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
            if (itemDoc.data().available) { 
              items.push({ id: itemDoc.id, ...itemDoc.data() } as BreakfastMenuItem)
            }
          });
          
          menu.push({ 
            ...categoryData, id: categoryDoc.id, 
            items: items.sort((a,b) => a.order - b.order) 
          });
        }
        setPratosQuentes(menu.sort((a, b) => a.order - b.order)); 
      } catch (err: any) {
        toast.error("Falha ao carregar o cardápio.", { description: err.message });
      } finally {
        setLoadingMenu(false);
      }
    }
    fetchMenu();
  }, []);

  // 2. Ouve pedidos da mesa selecionada (depende de tableId)
  useEffect(() => {
    if (!db || !tableId) {
      setExistingOrders([]);
      setLoadingHistory(false);
      return () => {}; // Retorna função de limpeza vazia
    }
    
    setLoadingHistory(true);
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
      setExistingOrders(
        orders.sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt))
      );
      setLoadingHistory(false);
    }, (err) => {
      toast.error(`Erro ao buscar histórico da ${tableId}.`);
      setLoadingHistory(false);
    });

    return () => unsubscribe(); // Limpa o listener ao trocar de mesa
  }, [tableId]);

  // Ação: Enviar comanda para a cozinha
  const handleSendOrder = async () => {
    if (!tableId) return;
    if (comandaItems.size === 0) return toast.info("Adicione pelo menos um item.");
    if (!user) return toast.error("Você não está logado.");

    setIsSubmitting(true);
    const toastId = toast.loading("Enviando para a cozinha...");

    const newOrder: Omit<KitchenOrder, 'id'> = {
      table: tableId,
      items: Array.from(comandaItems.values()).map(({ id, ...rest }) => rest),
      status: 'pending',
      createdAt: serverTimestamp() as any,
      createdBy: user.displayName || user.email || 'Admin',
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
  // ++ FUNÇÃO CORRIGIDA ++
  const handleCloseTable = async () => {
    if (!tableId) return;
    
    setIsSubmitting(true); 
    const toastId = toast.loading(`Encerrando ${tableId}...`);

    try {
      // 1. Encontra o documento da mesa em 'breakfastTables' (se existir)
      const tablesRef = collection(db, 'breakfastTables');
      const q = query(
        tablesRef,
        where("date", "==", getTodayString()),
        where("tableName", "==", tableId),
        limit(1)
      );
      const tableSnapshot = await getDocs(q);
      
      // 2. Encontra todos os hóspedes ATIVOS ('attended') nesta mesa
      const batch = writeBatch(db); // (Importação corrigida)
      const attendeesAtTableRef = collection(db, 'breakfastAttendees');
      const qGuests = query(attendeesAtTableRef, 
        where('date', '==', getTodayString()), 
        where('table', '==', tableId),
        where('status', '==', 'attended')
      );
      const guestsSnapshot = await getDocs(qGuests);

      // 3. Marca a mesa como 'closed'
      if (!tableSnapshot.empty) {
        const tableDocId = tableSnapshot.docs[0].id;
        const docRef = doc(db, 'breakfastTables', tableDocId);
        batch.update(docRef, { status: 'closed' });
      }

      // 4. Finaliza todos os hóspedes encontrados (muda status para 'finished')
      guestsSnapshot.forEach(guestDoc => {
        batch.update(guestDoc.ref, { status: 'finished', table: null });
      });
      
      // 5. Commita o batch (Mesa e Hóspedes)
      await batch.commit();

      // 6. Define a mensagem de sucesso com base se havia hóspedes
      // (Lógica 'allAttendees' removida e substituída por 'guestsSnapshot')
      const hasGuests = !guestsSnapshot.empty; 
      if (!hasGuests && existingOrders.length === 0) {
         toast.info(`Mesa ${tableId} (avulsa) fechada.`, { id: toastId });
      } else {
         toast.success(`${tableId} encerrada. Hóspedes foram finalizados.`, { id: toastId });
      }

      onTableClosed(); // Avisa o painel principal para des-selecionar
      
    } catch (err: any) {
      toast.error("Falha ao encerrar a mesa.", { id: toastId, description: err.message });
    } finally {
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

  // --- Renderização do Painel ---

  if (!tableId) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-center text-brand-mid-green p-10">
        <Utensils className="h-16 w-16 mb-4" />
        <h3 className="text-xl font-semibold text-brand-dark-green">Nenhuma mesa selecionada</h3>
        <p>Selecione uma mesa no painel à esquerda para ver detalhes, adicionar pedidos ou encerrá-la.</p>
      </div>
    );
  }

  if (loadingMenu) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="ml-3 text-brand-mid-green">Carregando cardápio...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho do Painel */}
      <header className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-bold text-brand-dark-green truncate">
          {tableId}
        </h2>
        <Button variant="destructive" size="sm" onClick={handleCloseTable} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <XCircle className="h-4 w-4 mr-2" />
          Encerrar Mesa
        </Button>
      </header>

      {/* Conteúdo dividido: 50% Cardápio/Comanda, 50% Histórico */}
      <div className="flex flex-col xl:flex-row flex-grow min-h-0">
        
        {/* Coluna 1: Cardápio e Nova Comanda */}
        <ScrollArea className="w-full xl:w-1/2 h-1/2 xl:h-full">
          <div className="p-4 space-y-4">
            {/* Nova Comanda (Sticky) */}
            <Card className="sticky top-0 z-10 shadow-md">
              <CardHeader>
                <CardTitle>Nova Comanda</CardTitle>
              </CardHeader>
              <CardContent>
                {comandaArray.length === 0 ? (
                  <p className="text-sm text-brand-mid-green">Selecione itens do cardápio abaixo.</p>
                ) : (
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                    {comandaArray.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-brand-dark-green">{item.itemName}</p>
                          {item.flavorName && <p className="text-sm text-brand-mid-green">{item.flavorName}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => removeFromComanda(item.id)}><Minus className="h-4 w-4" /></Button>
                          <span className="font-bold w-6 text-center">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => {
                            const category = pratosQuentes.find(c => c.items.some(i => i.id === item.itemId));
                            const originalItem = category?.items.find(i => i.id === item.itemId);
                            const originalFlavor = originalItem?.flavors.find(f => f.name === item.flavorName);
                            if (originalItem) addToComanda(originalItem, originalFlavor);
                          }}><Plus className="h-4 w-4" /></Button>
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
            
            <Separator />

            {/* Cardápio de Pratos Quentes */}
            <Card>
              <CardHeader><CardTitle>Cardápio (Pratos Quentes)</CardTitle></CardHeader>
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
          </div>
        </ScrollArea>

        {/* Coluna 2: Histórico de Pedidos da Mesa */}
        <ScrollArea className="w-full xl:w-1/2 h-1/2 xl:h-full border-t xl:border-t-0 xl:border-l">
          <div className="p-4 space-y-4">
            <h3 className="text-xl font-semibold text-brand-dark-green">Pedidos Enviados (Hoje)</h3>
            {loadingHistory ? (
              <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-brand-primary" /></div>
            ) : existingOrders.length === 0 ? (
              <p className="text-sm text-brand-mid-green text-center p-4">Nenhum pedido enviado para esta mesa hoje.</p>
            ) : (
              existingOrders.map((order) => (
                <Card key={order.id} className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-brand-dark-green flex justify-between items-center">
                      Pedido
                      {order.status === 'pending' ? <Badge variant="secondary"><Clock className="h-3 w-3 mr-1"/> Pendente</Badge> 
                      : order.status === 'delivered' ? <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1"/> Entregue</Badge>
                      : <Badge><Utensils className="h-3 w-3 mr-1"/> Em Preparo</Badge>}
                    </CardTitle>
                    <CardDescription>
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
        </ScrollArea>
      </div>
    </div>
  );
}