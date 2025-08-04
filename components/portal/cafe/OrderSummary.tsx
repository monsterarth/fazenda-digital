"use client";

import { useOrder } from "@/context/OrderContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, ShoppingBasket, Trash2 } from "lucide-react";

interface OrderSummaryProps {
    notes: string;
    onNotesChange: (notes: string) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ notes, onNotesChange, onSubmit, isSubmitting }) => {
  // CORREÇÃO: Usando as propriedades corretas do novo OrderContext
  const { collectiveItems, updateCollectiveItemQuantity, totalCollectiveItems } = useOrder();

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBasket /> Cesta de Café da Manhã
        </CardTitle>
        <CardDescription>
          {/* CORREÇÃO: Usando a contagem total correta */}
          {totalCollectiveItems > 0 ? `${totalCollectiveItems} ite${totalCollectiveItems > 1 ? 'ns' : 'm'} na sua cesta.` : "Sua cesta está vazia."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {/* CORREÇÃO: Mapeando a lista de itens correta */}
          {collectiveItems.map((item) => (
            <div key={item.itemId} className="flex justify-between items-center text-sm">
              <p className="font-medium">{item.itemName}</p>
              <div className="flex items-center gap-2">
                {/* CORREÇÃO: Usando a função correta para atualizar */}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCollectiveItemQuantity(item.itemId, item.quantity - 1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span>{item.quantity}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCollectiveItemQuantity(item.itemId, item.quantity + 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCollectiveItemQuantity(item.itemId, 0)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="general-notes">Observações Gerais</Label>
          <Textarea
            id="general-notes"
            placeholder="Alguma restrição alimentar ou pedido especial?"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>
        <Button className="w-full" size="lg" onClick={onSubmit} disabled={totalCollectiveItems === 0 || isSubmitting}>
          {isSubmitting ? "Enviando..." : "Finalizar Pedido"}
        </Button>
      </CardContent>
    </Card>
  );
};