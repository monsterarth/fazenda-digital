"use client";

import React from 'react';
import { useOrder } from '@/context/OrderContext';
import { useGuest } from '@/context/GuestProvider';
import { BreakfastMenuCategory } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Edit, ShoppingBasket, User } from 'lucide-react';

interface OrderSidebarProps {
  individualCategories: BreakfastMenuCategory[];
  collectiveCategories: BreakfastMenuCategory[];
}

export const OrderSidebar: React.FC<OrderSidebarProps> = ({ individualCategories, collectiveCategories }) => {
    const { setStep, currentStep, individualItems, collectiveItems, isPersonComplete } = useOrder();
    const { stay } = useGuest();
    const numberOfGuests = stay?.numberOfGuests || 0;

    const renderIndividualSummary = () => {
        if (individualCategories.length === 0) return null;
        
        return (
            <div>
                <h4 className="font-semibold text-sm mb-2">Escolhas por Hóspede</h4>
                {Array.from({ length: numberOfGuests }, (_, i) => i + 1).map(personId => {
                    const complete = isPersonComplete(personId, individualCategories);
                    return (
                        <div key={personId} className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span className="flex items-center gap-1.5">
                                <User className="w-3 h-3"/> Hóspede {personId}
                            </span>
                            {complete ? 
                                <span className="flex items-center gap-1 text-green-600 font-medium"><Check className="w-3 h-3"/> Completo</span> : 
                                <span>Pendente</span>
                            }
                        </div>
                    );
                })}
                 {currentStep !== 2 && (
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setStep(2)}>
                        <Edit className="w-3 h-3 mr-1"/> Editar escolhas
                    </Button>
                 )}
            </div>
        );
    };

    const renderCollectiveSummary = () => {
        if (collectiveCategories.length === 0) return null;
        
        return (
            <div>
                 <h4 className="font-semibold text-sm mb-2">Itens na Cesta</h4>
                 {collectiveItems.length > 0 ? (
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                        {collectiveItems.map(item => (
                            <li key={item.itemId}>{item.quantity}x {item.itemName}</li>
                        ))}
                    </ul>
                 ) : <p className="text-xs text-muted-foreground">Nenhum item adicionado.</p>
                 }
                 {currentStep !== 3 && (
                    <Button variant="link" size="sm" className="p-0 h-auto mt-1" onClick={() => setStep(3)}>
                         <Edit className="w-3 h-3 mr-1"/> Editar acompanhamentos
                    </Button>
                 )}
            </div>
        );
    };

    return (
        <Card className="sticky top-24 shadow-lg border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <ShoppingBasket /> Resumo da Cesta
                </CardTitle>
                <CardDescription>
                    Seu pedido para o café de amanhã.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {renderIndividualSummary()}
                {individualCategories.length > 0 && collectiveCategories.length > 0 && <Separator />}
                {renderCollectiveSummary()}
            </CardContent>
        </Card>
    );
};