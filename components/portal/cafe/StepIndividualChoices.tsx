"use client";

import React from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useOrder } from '@/context/OrderContext';
import { BreakfastMenuCategory, BreakfastMenuItem, Flavor } from '@/types';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, CheckCircle, ArrowRight, XCircle, Sparkles, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface StepIndividualChoicesProps {
  categories: BreakfastMenuCategory[];
}

// Sub-componente para seleção de sabores
const FlavorSelector: React.FC<{
    personId: number,
    category: BreakfastMenuCategory,
    item: BreakfastMenuItem,
}> = ({ personId, category, item }) => {
    const { selectFlavor, getIndividualItem } = useOrder();
    const currentSelection = getIndividualItem(personId, category.id);
    
    if (!item.flavors || item.flavors.length === 0) return null;

    return (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h5 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500"/>Escolha o Sabor / Preparo:</h5>
            <div className="grid grid-cols-2 gap-2">
                {item.flavors.map(flavor => {
                    if (!flavor.available) return null;
                    const isSelected = currentSelection?.flavorId === flavor.id;
                    return (
                        <Button
                            key={flavor.id}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => selectFlavor(personId, category.id, item.id, flavor)}
                        >
                            {flavor.name}
                            {isSelected && <CheckCircle className="w-4 h-4 ml-2" />}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
};


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
            <AccordionContent className="p-4 pt-2 space-y-6">
                {categories.map(category => {
                    const currentSelection = getIndividualItem(personId, category.id);
                    const selectedItemFromMenu = currentSelection?.itemId ? category.items.find(i => i.id === currentSelection.itemId) : null;
                    
                    return (
                        <div key={category.id} className="border-t pt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><ChefHat className="w-4 h-4"/>{category.name}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {category.items.map(item => {
                                    if (!item.available) return null;
                                    const isSelected = currentSelection?.itemId === item.id;
                                    return (
                                        <div key={item.id} className={cn("border-2 rounded-lg p-2 text-center cursor-pointer", isSelected ? "border-primary" : "border-transparent")} onClick={() => selectIndividualItem(personId, item, category)}>
                                            {item.imageUrl && <Image src={item.imageUrl} alt={item.name} width={100} height={100} className="w-full h-20 object-cover rounded-md mb-2"/>}
                                            <p className="font-bold text-sm">{item.name}</p>
                                            {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                                            {isSelected && <CheckCircle className="w-4 h-4 mt-2 text-primary mx-auto" />}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* Renderiza o seletor de sabores se um item com sabores for selecionado */}
                            {selectedItemFromMenu && <FlavorSelector personId={personId} category={category} item={selectedItemFromMenu} />}

                             <Button
                                variant="ghost"
                                size="sm"
                                className={cn("w-full mt-4 text-muted-foreground", currentSelection?.itemId === 'NONE' && "bg-destructive/10 text-destructive")}
                                onClick={() => selectIndividualItem(personId, 'NONE', category)}
                            >
                                <XCircle className="w-4 h-4 mr-2" /> Não quero esta opção
                            </Button>
                        </div>
                    );
                })}
            </AccordionContent>
        </AccordionItem>
    );
};


export const StepIndividualChoices: React.FC<StepIndividualChoicesProps> = ({ categories }) => {
    const { stay } = useGuest();
    const { setStep, isPersonComplete } = useOrder();
    const { numberOfGuests } = stay || { numberOfGuests: 1 };
    
    const guests = Array.from({ length: numberOfGuests }, (_, i) => i + 1);
    const allGuestsComplete = guests.every(personId => isPersonComplete(personId, categories));

    return (
        <Card className="shadow-lg border-2 w-full">
            <CardHeader>
                <CardTitle>Escolhas Individuais</CardTitle>
                <CardDescription>
                    Selecione uma opção de cada categoria para cada hóspede, ou marque a opção "Não quero".
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
                        onClick={() => setStep(3)}
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