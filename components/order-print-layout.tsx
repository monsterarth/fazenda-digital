import React from 'react';
import { Order, AppConfig, Stay } from '@/types'; // Corrigido para usar o tipo 'Order'
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Usa o tipo Order que já existe, estendido com Stay
type OrderWithStay = Order & { stayInfo?: Stay };

interface OrderPrintLayoutProps {
  order: OrderWithStay;
  config: AppConfig | null;
}

export const OrderPrintLayout: React.FC<OrderPrintLayoutProps> = ({ order, config }) => {
  const groupedItems = (order.itensPedido || []).reduce((acc: Record<string, typeof order.itensPedido>, item) => {
    const category = item.categoria || 'Outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <div className="p-8 font-sans bg-white text-black">
      <header className="text-center border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold">{config?.nomeFazenda || 'Pedido de Café da Manhã'}</h1>
        <p className="text-lg">Comanda da Cozinha</p>
      </header>

      <section className="grid grid-cols-3 gap-4 my-6 text-lg">
        <div><strong>Hóspede:</strong> {order.stayInfo?.guestName}</div>
        <div><strong>Cabana:</strong> {order.stayInfo?.cabinName}</div>
        <div><strong>Pessoas:</strong> {order.stayInfo?.numberOfGuests}</div>
        <div><strong>Entrega:</strong> {order.horarioEntrega}</div>
        <div className="col-span-2"><strong>Data do Pedido:</strong> {order.timestampPedido?.toDate ? format(order.timestampPedido.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}</div>
      </section>

      <section className="space-y-4">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-xl font-semibold border-b border-dashed border-black mb-2">{category}</h2>
            <ul className="list-disc list-inside space-y-1">
              {items.map((item, index) => (
                <li key={index} className="text-lg">
                  <strong>{item.quantidade}x</strong> {item.nomeItem}
                  {item.sabor && ` (${item.sabor})`}
                  {item.observacao && <span className="italic text-gray-700 ml-2">- "{item.observacao}"</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {order.observacoesGerais && (
        <section className="mt-6 pt-4 border-t border-dashed border-black">
          <h2 className="text-xl font-semibold">Observações Gerais do Pedido:</h2>
          <p className="text-lg mt-1">{order.observacoesGerais}</p>
        </section>
      )}
    </div>
  );
};