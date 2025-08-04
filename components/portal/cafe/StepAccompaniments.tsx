"use client";

import React from 'react';
import { useOrder } from '@/context/OrderContext';
import { BreakfastMenuCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus, ArrowLeft, ArrowRight } from 'lucide-react';

interface StepAccompanimentsProps {
  categories: BreakfastMenuCategory[];
}

export const StepAccompaniments: React.FC<StepAccompanimentsProps> = ({ categories }) => {
    const { 
        setStep, 
        addCollectiveItem, 
        updateCollectiveItemQuantity, 
        getCollectiveItemQuantity 
    } = useOrder();

    return (
        <Card className="shadow-lg border-2 w-full">
            <CardHeader>
                <CardTitle>Acompanhamentos para a Cesta</CardTitle>
                <CardDescription>
                    Selecione os itens que o grupo deseja e indique a quantidade para cada um.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {categories.map((category) => (
                    <div key={category.id}>
                        <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">{category.name}</h3>
                        <div className="space-y-4">
                            {category.items.map((item) => {
                                const quantity = getCollectiveItemQuantity(item.id);
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
                                                        onClick={() => updateCollectiveItemQuantity(item.id, quantity + 1)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => addCollectiveItem(item, category)}
                                                    disabled={!item.available}
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
                ))}
                <div className="mt-8 flex justify-between items-center">
                    <Button 
                        variant="outline"
                        onClick={() => setStep(2)} // Volta para a etapa anterior
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <Button
                        size="lg"
                        onClick={() => setStep(4)} // Avança para a Revisão
                    >
                        Próximo: Revisar Pedido
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};