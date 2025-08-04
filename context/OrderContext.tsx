"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { IndividualOrderItem, CollectiveOrderItem, BreakfastMenuItem, BreakfastMenuCategory } from '@/types';

interface OrderState {
  currentStep: number;
  individualItems: IndividualOrderItem[];
  collectiveItems: CollectiveOrderItem[];
}

interface OrderContextType extends OrderState {
  setStep: (step: number) => void;
  totalCollectiveItems: number;
  addCollectiveItem: (item: BreakfastMenuItem, category: BreakfastMenuCategory) => void;
  updateCollectiveItemQuantity: (itemId: string, newQuantity: number) => void;
  getCollectiveItemQuantity: (itemId: string) => number;
  selectIndividualItem: (personId: number, item: BreakfastMenuItem, category: BreakfastMenuCategory) => void;
  getIndividualItem: (personId: number, categoryId: string) => IndividualOrderItem | undefined;
  isPersonComplete: (personId: number, individualCategories: BreakfastMenuCategory[]) => boolean;
  clearOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
    const { stay } = useGuest();
    const [state, setState] = useState<OrderState>({
        currentStep: 1, // 1: Welcome, 2: Individual, 3: Collective, 4: Review, 5: Success
        individualItems: [],
        collectiveItems: [],
    });

    const setStep = (step: number) => setState(prev => ({ ...prev, currentStep: step }));

    const clearOrder = () => setState(prev => ({ ...prev, individualItems: [], collectiveItems: [] }));
    
    // --- Lógica para Itens Coletivos (Acompanhamentos) ---
    const addCollectiveItem = (item: BreakfastMenuItem, category: BreakfastMenuCategory) => {
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

    const getCollectiveItemQuantity = (itemId: string) => state.collectiveItems.find(i => i.itemId === itemId)?.quantity || 0;

    const totalCollectiveItems = useMemo(() => state.collectiveItems.reduce((total, item) => total + item.quantity, 0), [state.collectiveItems]);

    // --- Lógica para Itens Individuais (Pratos Quentes) ---
    const selectIndividualItem = (personId: number, item: BreakfastMenuItem, category: BreakfastMenuCategory) => {
        setState(prev => {
            const otherItems = prev.individualItems.filter(i => !(i.personId === personId && i.categoryId === category.id));
            const newItem: IndividualOrderItem = { personId, categoryId: category.id, categoryName: category.name, itemId: item.id, itemName: item.name };
            return { ...prev, individualItems: [...otherItems, newItem] };
        });
    };
    
    const getIndividualItem = (personId: number, categoryId: string) => {
        return state.individualItems.find(i => i.personId === personId && i.categoryId === categoryId);
    };
    
    const isPersonComplete = useCallback((personId: number, individualCategories: BreakfastMenuCategory[]): boolean => {
        if (!individualCategories || individualCategories.length === 0) return true;
        return individualCategories.every(cat => 
            state.individualItems.some(item => item.personId === personId && item.categoryId === cat.id)
        );
    }, [state.individualItems]);
    
    const value = {
        ...state,
        setStep,
        totalCollectiveItems,
        addCollectiveItem,
        updateCollectiveItemQuantity,
        getCollectiveItemQuantity,
        selectIndividualItem,
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