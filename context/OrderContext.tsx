"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { IndividualOrderItem, CollectiveOrderItem, BreakfastMenuItem, BreakfastMenuCategory, Flavor } from '@/types';
import { toast } from 'sonner';

interface OrderState {
  currentStep: number;
  individualItems: IndividualOrderItem[];
  collectiveItems: CollectiveOrderItem[];
}

// ++ INÍCIO DA CORREÇÃO ++
interface OrderContextType extends OrderState {
  setStep: (step: number) => void;
  selections: { // Adiciona o objeto 'selections'
    individualItems: IndividualOrderItem[];
    collectiveItems: CollectiveOrderItem[];
  };
  // Itens Coletivos
  totalCollectiveItems: number;
  addCollectiveItem: (item: BreakfastMenuItem, category: BreakfastMenuCategory) => void;
  updateCollectiveItemQuantity: (itemId: string, newQuantity: number) => void;
  getCollectiveItemQuantity: (itemId: string) => number;
  canAddItem: (item: BreakfastMenuItem, category: BreakfastMenuCategory) => boolean;
  // Itens Individuais
  selectIndividualItem: (personId: number, item: BreakfastMenuItem | 'NONE', category: BreakfastMenuCategory) => void;
  selectFlavor: (personId: number, categoryId: string, itemId: string, flavor: Flavor) => void;
  getIndividualItem: (personId: number, categoryId: string) => IndividualOrderItem | undefined;
  isPersonComplete: (personId: number, individualCategories: BreakfastMenuCategory[]) => boolean;
  clearOrder: () => void;
}
// ++ FIM DA CORREÇÃO ++

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
    const { stay } = useGuest();
    const [state, setState] = useState<OrderState>({
        currentStep: 1,
        individualItems: [],
        collectiveItems: [],
    });

    const setStep = (step: number) => setState(prev => ({ ...prev, currentStep: step }));
    const clearOrder = () => setState(prev => ({ ...prev, individualItems: [], collectiveItems: [] }));
    
    // --- Lógica para Itens Coletivos (Acompanhamentos) ---
    const getCollectiveItemQuantity = (itemId: string) => state.collectiveItems.find(i => i.itemId === itemId)?.quantity || 0;
    const totalCollectiveItems = useMemo(() => state.collectiveItems.reduce((total, item) => total + item.quantity, 0), [state.collectiveItems]);

    const canAddItem = useCallback((item: BreakfastMenuItem, category: BreakfastMenuCategory): boolean => {
        const numberOfGuests = stay?.numberOfGuests || 1;
        if (category.limitType === 'none') return true;
        const limit = category.limitGuestMultiplier * numberOfGuests;
        if (category.limitType === 'per_item') {
            const currentQuantity = getCollectiveItemQuantity(item.id);
            return currentQuantity < limit;
        }
        if (category.limitType === 'per_category') {
            const totalInCategory = state.collectiveItems
                .filter(i => category.items.some(catItem => catItem.id === i.itemId))
                .reduce((total, current) => total + current.quantity, 0);
            return totalInCategory < limit;
        }
        return true;
    }, [state.collectiveItems, stay?.numberOfGuests]);

    const addCollectiveItem = (item: BreakfastMenuItem, category: BreakfastMenuCategory) => {
        if (!canAddItem(item, category)) {
            toast.warning("Limite de itens atingido", { description: `Você já atingiu o limite para esta categoria.`});
            return;
        }
        setState(prev => {
            const existing = prev.collectiveItems.find(i => i.itemId === item.id);
            if (existing) {
                return { ...prev, collectiveItems: prev.collectiveItems.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i) };
            }
            return { ...prev, collectiveItems: [...prev.collectiveItems, { itemId: item.id, itemName: item.name, categoryName: category.name, quantity: 1 }] };
        });
    };
    
    const updateCollectiveItemQuantity = (itemId: string, newQuantity: number) => {
        setState(prev => {
            if (newQuantity <= 0) {
                return { ...prev, collectiveItems: prev.collectiveItems.filter(i => i.itemId !== itemId) };
            }
            return { ...prev, collectiveItems: prev.collectiveItems.map(i => i.itemId === itemId ? { ...i, quantity: newQuantity } : i) };
        });
    };

    // --- Lógica para Itens Individuais (Pratos Quentes) ---
    const selectIndividualItem = (personId: number, item: BreakfastMenuItem | 'NONE', category: BreakfastMenuCategory) => {
        setState(prev => {
            const otherItems = prev.individualItems.filter(i => !(i.personId === personId && i.categoryId === category.id));
            let newItem: IndividualOrderItem;
            if (item === 'NONE') {
                newItem = { personId, categoryId: category.id, categoryName: category.name, itemId: 'NONE', itemName: 'Nenhuma opção' };
            } else {
                 newItem = { personId, categoryId: category.id, categoryName: category.name, itemId: item.id, itemName: item.name };
            }
            return { ...prev, individualItems: [...otherItems, newItem] };
        });
    };

    const selectFlavor = (personId: number, categoryId: string, itemId: string, flavor: Flavor) => {
        setState(prev => ({
            ...prev,
            individualItems: prev.individualItems.map(i => 
                (i.personId === personId && i.categoryId === categoryId && i.itemId === itemId) 
                ? { ...i, flavorId: flavor.id, flavorName: flavor.name } 
                : i
            )
        }));
    };
    
    const getIndividualItem = (personId: number, categoryId: string) => {
        return state.individualItems.find(i => i.personId === personId && i.categoryId === categoryId);
    };
    
    const isPersonComplete = useCallback((personId: number, individualCategories: BreakfastMenuCategory[]): boolean => {
        if (!individualCategories || individualCategories.length === 0) return true;
        
        return individualCategories.every(cat => {
            const selection = state.individualItems.find(item => item.personId === personId && item.categoryId === cat.id);
            if (!selection) return false;
            if (selection.itemId === 'NONE') return true;
            const selectedItemFromMenu = cat.items.find(i => i.id === selection.itemId);
            if (selectedItemFromMenu && selectedItemFromMenu.flavors.length > 0) {
                return !!selection.flavorId;
            }
            return true;
        });
    }, [state.individualItems]);
    
    const value = {
        ...state,
        setStep,
        // ++ INÍCIO DA CORREÇÃO ++
        selections: { // Adiciona o objeto 'selections' ao valor do contexto
            individualItems: state.individualItems,
            collectiveItems: state.collectiveItems,
        },
        // ++ FIM DA CORREÇÃO ++
        totalCollectiveItems,
        addCollectiveItem,
        updateCollectiveItemQuantity,
        getCollectiveItemQuantity,
        canAddItem,
        selectIndividualItem,
        selectFlavor,
        getIndividualItem,
        isPersonComplete,
        clearOrder,
    };

    return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};