// app/admin/(dashboard)/pedidos/cafe/components/order-receipt-layout.tsx

import React from 'react';
import { OrderWithStay, Property } from '@/types';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { groupItems } from '@/lib/order-utils';

interface OrderReceiptLayoutProps {
  order: OrderWithStay;
  property: Property | null;
}

export const OrderReceiptLayout: React.FC<OrderReceiptLayoutProps> = ({ order, property }) => {
  const groupedIndividual = groupItems(order.individualItems || []);
  const groupedCollective = groupItems(order.collectiveItems || []);

  const deliveryDate = order.deliveryDate ? new Date(`${order.deliveryDate}T00:00:00`) : null;
  const formattedDate = deliveryDate && isValid(deliveryDate) ? format(deliveryDate, "dd/MM/yyyy", { locale: ptBR }) : 'Data inválida';


  return (
    <div className="p-2 font-mono bg-white text-black text-xs w-[80mm]">
      <div className="text-center mb-2">
        <h1 className="font-bold text-sm">{property?.name}</h1>
        <p>Pedido de Café da Manhã</p>
      </div>
      <hr className="border-dashed border-black my-2" />
      <p><strong>Cabana:</strong> {order.stayInfo?.cabinName}</p>
      <p><strong>Hóspede:</strong> {order.stayInfo?.guestName}</p>
      {/* ++ EXIBIÇÃO DA DATA E HORA ++ */}
      <p><strong>Entrega:</strong> {formattedDate} {order.deliveryTime && `as ${order.deliveryTime}`}</p>
      <p><strong>Pessoas:</strong> {order.numberOfGuests}</p>
      <hr className="border-dashed border-black my-2" />
      
      <div className="font-bold">-- ITENS INDIVIDUAIS --</div>
      {Object.entries(groupedIndividual).map(([categoryName, items]) => (
        <div key={categoryName}>
          {Object.entries(items).map(([itemName, details]) => (
             <p key={itemName}>{details.count}x {itemName} {details.flavors ? `(${Object.keys(details.flavors).join(', ')})` : ''}</p>
          ))}
        </div>
      ))}

      <div className="font-bold mt-2">-- ITENS DA CESTA --</div>
      {Object.entries(groupedCollective).map(([categoryName, items]) => (
        <div key={categoryName}>
          {Object.entries(items).map(([itemName, details]) => (
             <p key={itemName}>{details.count}x {itemName}</p>
          ))}
        </div>
      ))}
      
      {order.generalNotes && (
        <>
          <hr className="border-dashed border-black my-2" />
          <p className="font-bold">OBS:</p>
          <p className="whitespace-pre-wrap">{order.generalNotes}</p>
        </>
      )}
      <hr className="border-dashed border-black my-2" />
      <p className="text-center">Gerado em {format(new Date(), "dd/MM HH:mm")}</p>
    </div>
  );
};