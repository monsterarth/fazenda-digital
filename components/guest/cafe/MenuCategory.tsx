"use client";

import { BreakfastMenuCategory, BreakfastMenuItem } from "@/types";
import { useOrder } from "@/context/OrderContext";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface MenuCategoryProps {
  category: BreakfastMenuCategory;
}

export const MenuCategory: React.FC<MenuCategoryProps> = ({ category }) => {
  // CORREÇÃO: Usando as funções corretas do novo OrderContext
  const { addCollectiveItem, updateCollectiveItemQuantity, getCollectiveItemQuantity } = useOrder();

  return (
    <AccordionItem value={category.id}>
      <AccordionTrigger className="text-lg font-semibold">{category.name}</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-2">
        {category.items.map((item) => {
          if (!item.available) return null;
          // CORREÇÃO: Usando a função correta para obter a quantidade
          const quantity = getCollectiveItemQuantity(item.id);
          return (
            <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
              <div>
                <p className="font-bold">{item.name}</p>
                {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {quantity > 0 ? (
                  <>
                    {/* CORREÇÃO: Usando a função correta para atualizar a quantidade */}
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCollectiveItemQuantity(item.id, quantity - 1)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input readOnly value={quantity} className="w-12 h-8 text-center" />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCollectiveItemQuantity(item.id, quantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  // CORREÇÃO: Usando a função correta para adicionar um item
                  <Button variant="outline" size="sm" onClick={() => addCollectiveItem(item, category)}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </AccordionContent>
    </AccordionItem>
  );
};