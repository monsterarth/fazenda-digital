// components/guest/cafe/StepReview.tsx

"use client";

import React, { useState } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useOrder } from '@/context/OrderContext';
import { useProperty } from '@/context/PropertyContext'; // ++ Importa o hook da propriedade
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // ++ Importa o Select
import { ArrowLeft, CheckCircle, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface StepReviewProps {
  onConfirmOrder: (notes: string) => Promise<void>; 
}

const OrderSummarySection: React.FC<{ title: string; children: React.ReactNode; hasItems: boolean; noItemsText: string }> = ({ title, children, hasItems, noItemsText }) => (
    <div className="border-t pt-4">
        <h4 className="font-bold text-lg mb-2">{title}</h4>
        {hasItems ? <div className="space-y-1">{children}</div> : <p className="text-sm text-muted-foreground">{noItemsText}</p>}
    </div>
);

export const StepReview: React.FC<StepReviewProps> = ({ onConfirmOrder }) => {
    const { stay } = useGuest();
    const { property } = useProperty(); // ++ Pega os dados da propriedade
    const { setStep, individualItems, collectiveItems, deliveryTime, setDeliveryTime } = useOrder();
    const [generalNotes, setGeneralNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ++ Obtém os horários disponíveis
    const availableTimes = property?.breakfast?.deliveryTimes || [];

    const handleConfirmOrder = async () => {
        // ++ Validação do horário
        if (!deliveryTime) {
            toast.error("Por favor, selecione um horário para a entrega.");
            return;
        }
        setIsSubmitting(true);
        await onConfirmOrder(generalNotes);
        setIsSubmitting(false);
    };

    return (
        <Card className="shadow-lg border-2 w-full">
            <CardHeader>
                <CardTitle>Revisão Final do Pedido</CardTitle>
                <CardDescription>
                    Confira os itens, escolha o horário de entrega e confirme o envio.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* ++ SELETOR DE HORÁRIO ++ */}
                <div>
                    <Label htmlFor="delivery-time" className="text-base font-semibold flex items-center gap-2"><Clock className="w-5 h-5" /> Horário de Entrega</Label>
                    <Select onValueChange={setDeliveryTime} value={deliveryTime || ""}>
                        <SelectTrigger id="delivery-time" className="mt-2">
                            <SelectValue placeholder="Selecione um horário..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTimes.length > 0 ? (
                                availableTimes.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)
                            ) : (
                                <SelectItem value="disabled" disabled>Nenhum horário disponível</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                
                <OrderSummarySection
                    title="Escolhas Individuais"
                    hasItems={individualItems.length > 0}
                    noItemsText="Nenhum item individual selecionado."
                >
                    {Array.from({ length: stay?.numberOfGuests || 0 }, (_, i) => i + 1).map(personId => (
                        <div key={personId} className="p-2 border-b last:border-b-0">
                            <p className="font-semibold">Hóspede {personId}:</p>
                            <ul className="list-disc list-inside pl-2 text-sm text-muted-foreground">
                                {individualItems.filter(item => item.personId === personId).map(item => (
                                    <li key={`${item.itemId}-${item.categoryId}`}>{item.itemName} <span className="text-xs">({item.categoryName})</span> {item.flavorName && `- ${item.flavorName}`}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </OrderSummarySection>

                 <OrderSummarySection
                    title="Acompanhamentos da Cesta"
                    hasItems={collectiveItems.length > 0}
                    noItemsText="Nenhum acompanhamento selecionado."
                >
                   <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {collectiveItems.map(item => (
                            <li key={item.itemId}>{item.quantity}x {item.itemName}</li>
                        ))}
                   </ul>
                </OrderSummarySection>

                <div>
                    <Label htmlFor="general-notes">Observações Gerais (opcional)</Label>
                    <Textarea
                        id="general-notes"
                        placeholder="Ex: Alergia a glúten, preferência por frutas sem casca, etc."
                        value={generalNotes}
                        onChange={(e) => setGeneralNotes(e.target.value)}
                        className="mt-1"
                    />
                </div>
                
                <div className="mt-8 flex justify-between items-center">
                    <Button 
                        variant="outline"
                        onClick={() => setStep(3)}
                        disabled={isSubmitting}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <Button
                        size="lg"
                        onClick={handleConfirmOrder}
                        disabled={isSubmitting || !deliveryTime} // ++ Desabilita se não houver horário
                        className="bg-brand-primary text-white hover:bg-brand-primary/90 disabled:bg-brand-primary/50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Enviar Pedido
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};