"use client";

import React, { useState } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useOrder } from '@/context/OrderContext';
import { BreakfastMenuCategory, BreakfastMenuItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndividualChoicesProps {
  categories: BreakfastMenuCategory[];
}

// Componente para a seleção de um hóspede específico
const GuestChoice: React.FC<{
  personId: number;
  categories: BreakfastMenuCategory[];
}> = ({ personId, categories }) => {
    const { getIndividualItem, selectIndividualItem, isPersonComplete } = useOrder();
    const isComplete = isPersonComplete(personId, categories);

    return (
        <AccordionItem value={`person-${personId}`} className="border-2 rounded-lg mb-4 bg-background">
            <AccordionTrigger className={cn("p-4 rounded-t-lg transition-colors hover:bg-muted/50", isComplete && "bg-green-100/80 hover:bg-green-100")}>
                <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isComplete ? "bg-green-600 text-white" : "bg-muted text-muted-foreground")}>
                        <User className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-left">Hóspede {personId}</h3>
                        {isComplete && <p className="text-xs text-green-700 font-medium text-left">Seleção completa</p>}
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-2 space-y-4">
                {categories.map(category => (
                    <div key={category.id} className="border-t pt-4">
                        <h4 className="font-semibold mb-3">{category.name}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {category.items.map(item => {
                                const isSelected = getIndividualItem(personId, category.id)?.itemId === item.id;
                                return (
                                    <Button
                                        key={item.id}
                                        variant={isSelected ? "default" : "outline"}
                                        onClick={() => selectIndividualItem(personId, item, category)}
                                        className="h-auto flex-col p-3 text-center"
                                        disabled={!item.available}
                                    >
                                        <span className="font-bold text-sm whitespace-normal">{item.name}</span>
                                        {item.description && <span className="text-xs font-normal mt-1 opacity-80">{item.description}</span>}
                                        {isSelected && <CheckCircle className="w-4 h-4 mt-2 text-white" />}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </AccordionContent>
        </AccordionItem>
    );
};


export const StepIndividualChoices: React.FC<StepIndividualChoicesProps> = ({ categories }) => {
    const { stay } = useGuest();
    const { setStep, isPersonComplete } = useOrder();
    const { numberOfGuests } = stay || { numberOfGuests: 1 };
    
    // Cria um array [1, 2, ..., numberOfGuests]
    const guests = Array.from({ length: numberOfGuests }, (_, i) => i + 1);

    const allGuestsComplete = guests.every(personId => isPersonComplete(personId, categories));

    return (
        <Card className="shadow-lg border-2 w-full">
            <CardHeader>
                <CardTitle>Escolhas Individuais</CardTitle>
                <CardDescription>
                    Selecione uma opção de cada categoria para cada hóspede.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={["person-1"]} className="w-full">
                    {guests.map((personId) => (
                        <GuestChoice key={personId} personId={personId} categories={categories} />
                    ))}
                </Accordion>
                <div className="mt-6 flex justify-end">
                    <Button
                        size="lg"
                        onClick={() => setStep(3)} // Avança para Acompanhamentos
                        disabled={!allGuestsComplete}
                    >
                        Próximo: Acompanhamentos
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};