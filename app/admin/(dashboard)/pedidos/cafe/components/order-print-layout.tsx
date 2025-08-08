import React from 'react';
import { OrderWithStay, Property } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderPrintLayoutProps {
  order: OrderWithStay;
  property: Property | null;
}

export const OrderPrintLayout: React.FC<OrderPrintLayoutProps> = ({ order, property }) => {
  return (
    <div className="p-10 font-sans bg-white text-black min-h-screen">
      {/* Cabeçalho */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">{property?.name || 'Pedido de Café da Manhã'}</h1>
        <p className="text-xl">Pedido para: <strong>{order.stayInfo?.cabinName || 'N/A'}</strong> ({order.stayInfo?.guestName || 'N/A'})</p>
        <p>Data de Entrega: {format(new Date(order.deliveryDate), "eeee, dd 'de' MMMM", { locale: ptBR })}</p>
      </div>

      {/* Itens Individuais */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b-2 border-black pb-2 mb-4">Itens por Hóspede ({order.numberOfGuests})</h2>
        {Array.from({ length: order.numberOfGuests }, (_, i) => i + 1).map(personId => (
          <div key={personId} className="mb-4 p-4 border rounded-lg">
            <h3 className="text-lg font-semibold">Hóspede {personId}</h3>
            <ul className="list-none mt-2">
              {(order.individualItems || []).filter(item => item.personId === personId).map(item => (
                <li key={item.itemId} className="flex items-center gap-4 text-lg">
                  <span className="w-8 h-8 border-2 border-black"></span> {/* Checkbox */}
                  <span>{item.itemName} {item.flavorName && `(${item.flavorName})`}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Itens Coletivos */}
      <section>
        <h2 className="text-2xl font-bold border-b-2 border-black pb-2 mb-4">Itens da Cesta</h2>
        <ul className="list-none space-y-2">
          {(order.collectiveItems || []).map(item => (
            <li key={item.itemId} className="flex items-center gap-4 text-lg">
               <span className="w-8 h-8 border-2 border-black"></span> {/* Checkbox */}
              <span><strong>{item.quantity}x</strong> {item.itemName}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Observações */}
      {order.generalNotes && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold border-b-2 border-black pb-2 mb-4">Observações Gerais</h2>
          <p className="p-4 border-2 border-black rounded-lg text-lg whitespace-pre-line">{order.generalNotes}</p>
        </section>
      )}
    </div>
  );
};