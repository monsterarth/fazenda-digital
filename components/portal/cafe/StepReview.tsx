"use client";

import React, { useState } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

// ++ INÍCIO DA CORREÇÃO ++
interface StepReviewProps {
  onConfirmOrder: () => Promise<void>; // Define que o componente espera receber esta função
}
// ++ FIM DA CORREÇÃO ++

const OrderSummarySection: React.FC<{ title: string; children: React.ReactNode; hasItems: boolean; noItemsText: string }> = ({ title, children, hasItems, noItemsText }) => (
    <div className="border-t pt-4">
        <h4 className="font-bold text-lg mb-2">{title}</h4>
        {hasItems ? <div className="space-y-1">{children}</div> : <p className="text-sm text-muted-foreground">{noItemsText}</p>}
    </div>
);

// ++ CORREÇÃO: O componente agora recebe a prop 'onConfirmOrder'
export const StepReview: React.FC<StepReviewProps> = ({ onConfirmOrder }) => {
    const { stay } = useGuest();
    const { setStep, individualItems, collectiveItems } = useOrder();
    const [generalNotes, setGeneralNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ++ CORREÇÃO: A lógica de envio foi movida para o componente pai (BreakfastFlow).
    // Esta função agora apenas chama a prop recebida.
    const handleConfirmOrder = async () => {
        setIsSubmitting(true);
        // Adiciona as anotações ao estado global antes de enviar (opcional, mas boa prática)
        // Se precisar das notas no envio, ajuste o OrderContext para guardá-las.
        await onConfirmOrder();
        setIsSubmitting(false);
    };

    return (
        <Card className="shadow-lg border-2 w-full">
            <CardHeader>
                <CardTitle>Revisão Final do Pedido</CardTitle>
                <CardDescription>
                    Confira todos os itens selecionados. Se estiver tudo certo, adicione observações (opcional) e confirme o envio.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                                    <li key={`${item.itemId}-${item.categoryId}`}>{item.itemName} <span className="text-xs">({item.categoryName})</span></li>
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
                        onClick={handleConfirmOrder} // Chama a função local que chama a prop
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Confirmar e Enviar Pedido
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};