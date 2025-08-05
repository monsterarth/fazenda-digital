"use client";

import React from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useOrder } from '@/context/OrderContext';
import { BreakfastMenuCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus, ArrowLeft, ArrowRight, Info } from 'lucide-react';

interface StepAccompanimentsProps {
  categories: BreakfastMenuCategory[];
}

export const StepAccompaniments: React.FC<StepAccompanimentsProps> = ({ categories }) => {
    const { 
        setStep, 
        addCollectiveItem, 
        updateCollectiveItemQuantity, 
        getCollectiveItemQuantity,
        canAddItem
    } = useOrder();
    const { stay } = useGuest();

    const getCategoryLimitMessage = (category: BreakfastMenuCategory): string | null => {
        const numberOfGuests = stay?.numberOfGuests || 1;
        if (category.limitType === 'none' || !category.limitGuestMultiplier) return null;

        const limit = category.limitGuestMultiplier * numberOfGuests;
        if (category.limitType === 'per_item') {
            return `Limite de ${limit} por item para cada hóspede.`;
        }
        if (category.limitType === 'per_category') {
            return `Limite total de ${limit} itens nesta categoria.`;
        }
        return null;
    };

    return (
        <Card className="shadow-lg border-2 w-full">
            <CardHeader>
                <CardTitle>Acompanhamentos para a Cesta</CardTitle>
                <CardDescription>
                    Selecione os itens que o grupo deseja e indique a quantidade para cada um.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {categories.map((category) => {
                    const limitMessage = getCategoryLimitMessage(category);
                    return (
                        <div key={category.id}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 border-b pb-2">
                                <h3 className="text-xl font-bold text-slate-800">{category.name}</h3>
                                {limitMessage && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 sm:mt-0">
                                        <Info className="h-3 w-3" /> {limitMessage}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-4">
                                {category.items.map((item) => {
                                    if (!item.available) return null;
                                    const quantity = getCollectiveItemQuantity(item.id);
                                    const canAddMore = canAddItem(item, category);
                                    
                                    return (
                                        <div 
                                            key={item.id} 
                                            className="flex items-center justify-between p-3 border rounded-lg bg-background"
                                        >
                                            <div>
                                                <p className="font-bold">{item.name}</p>
                                                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {quantity > 0 ? (
                                                    <>
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-8 w-8" 
                                                            onClick={() => updateCollectiveItemQuantity(item.id, quantity - 1)}
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                        <Input 
                                                            readOnly 
                                                            value={quantity} 
                                                            className="w-12 h-8 text-center font-bold" 
                                                        />
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            className="h-8 w-8" 
                                                            onClick={() => addCollectiveItem(item, category)} // addCollectiveItem já tem a lógica de limite
                                                            disabled={!canAddMore}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => addCollectiveItem(item, category)}
                                                        disabled={!canAddMore}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" /> Adicionar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                <div className="mt-8 flex justify-between items-center">
                    <Button 
                        variant="outline"
                        onClick={() => setStep(2)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <Button
                        size="lg"
                        onClick={() => setStep(4)}
                    >
                        Próximo: Revisar Pedido
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};