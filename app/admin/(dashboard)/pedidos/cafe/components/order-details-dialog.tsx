"use client";

import React from 'react';
import { OrderWithStay } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, ShoppingBasket, FileText } from 'lucide-react';

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithStay | null;
}

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ isOpen, onClose, order }) => {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Pedido - {order.stayInfo?.cabinName}</DialogTitle>
          <DialogDescription>
            Pedido de {order.stayInfo?.guestName} para {order.numberOfGuests} pessoa(s).
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-6 max-h-[60vh] overflow-y-auto pr-4">
          {/* Itens Individuais */}
          <section>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-2 pb-2 border-b"><User /> Itens por Hóspede</h3>
            {Array.from({ length: order.numberOfGuests }, (_, i) => i + 1).map(personId => (
              <div key={personId} className="mb-2 p-3 bg-muted/50 rounded-md">
                <p className="font-semibold text-sm">Hóspede {personId}</p>
                <ul className="list-disc list-inside ml-2 text-sm text-muted-foreground">
                  {(order.individualItems || [])
                    .filter(item => item.personId === personId)
                    .map(item => (
                      <li key={`${item.itemId}-${item.flavorId || ''}`}>
                        {item.itemName}
                        {item.flavorName && <span className="ml-1 text-xs font-semibold">({item.flavorName})</span>}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>

          {/* Itens Coletivos */}
          <section>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-2 pb-2 border-b"><ShoppingBasket /> Itens da Cesta</h3>
            <ul className="list-disc list-inside ml-2 text-sm text-muted-foreground">
              {(order.collectiveItems || []).map(item => (
                <li key={item.itemId}>
                  <Badge variant="secondary" className="mr-2">{item.quantity}x</Badge>
                  {item.itemName}
                </li>
              ))}
            </ul>
          </section>

          {/* Observações */}
          {order.generalNotes && (
            <section>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2 pb-2 border-b"><FileText /> Observações Gerais</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-3 rounded-md">{order.generalNotes}</p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};