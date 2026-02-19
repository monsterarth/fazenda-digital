"use client";

import React, { useMemo } from 'react';
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

// Sub-componente FlavorSelector (sem alterações)
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


// Componente GuestChoice (sem alterações)
const GuestChoice: React.FC<{
  personId: number;
  guestName: string;
  categories: BreakfastMenuCategory[];
}> = ({ personId, guestName, categories }) => {
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
                        <h3 className="text-lg font-bold text-left">{guestName}</h3>
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
                                        <div 
                                            key={item.id} 
                                            className={cn("group border-2 rounded-lg p-3 text-center cursor-pointer transition-all duration-200", isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/50")} 
                                            onClick={() => selectIndividualItem(personId, item, category)}
                                        >
                                            {item.imageUrl && (
                                                <div className="w-full h-20 md:h-32 overflow-hidden rounded-md mb-2 relative">
                                                    <Image 
                                                        src={item.imageUrl} 
                                                        alt={item.name} 
                                                        fill
                                                        sizes="(max-width: 768px) 50vw, 33vw"
                                                        className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                                                    />
                                                </div>
                                            )}
                                            <p className="font-bold text-sm">{item.name}</p>
                                            {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                                            {isSelected && <CheckCircle className="w-4 h-4 mt-2 text-primary mx-auto" />}
                                        </div>
                                    );
                                })}
                            </div>
                            
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
    const { stay, preCheckIn } = useGuest();
    const { setStep, isPersonComplete, individualItems } = useOrder();
    
    const numberOfGuests = stay?.numberOfGuests || 1;

    const guestNames = useMemo(() => {
        const names: string[] = [];
        if (stay?.guestName) names.push(stay.guestName);
        if (preCheckIn?.companions) names.push(...preCheckIn.companions.map(c => c.fullName));
        while (names.length < numberOfGuests) names.push(`Hóspede ${names.length + 1}`);
        return names.slice(0, numberOfGuests);
    }, [preCheckIn, stay?.guestName, numberOfGuests]);

    const allGuestsComplete = useMemo(() => {
        return Array.from({ length: numberOfGuests }, (_, i) => i + 1)
                    .every(personId => isPersonComplete(personId, categories));
    }, [numberOfGuests, isPersonComplete, categories, individualItems]);

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
                    {guestNames.map((guestName, index) => {
                        const personId = index + 1;
                        return (
                           <GuestChoice key={personId} personId={personId} guestName={guestName} categories={categories} />
                        );
                    })}
                </Accordion>
                <div className="mt-6 flex justify-end">
                    {/* ++ BOTÃO ATUALIZADO ++ */}
                    <Button
                        size="lg"
                        onClick={() => setStep(3)}
                        disabled={!allGuestsComplete}
                        className="bg-brand-primary text-white hover:bg-brand-primary/90 disabled:bg-brand-primary/50"
                    >
                        Próximo: Acompanhamentos
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};