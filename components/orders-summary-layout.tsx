import React from 'react';
import { Order, AppConfig, Stay } from '@/types'; // Corrigido para usar o tipo 'Order'
import { format } from 'date-fns';

type OrderWithStay = Order & { stayInfo?: Stay };

interface OrdersSummaryLayoutProps {
  orders: OrderWithStay[];
  config: AppConfig | null;
}

export const OrdersSummaryLayout: React.FC<OrdersSummaryLayoutProps> = ({ orders, config }) => {
  const allItems = orders.flatMap(order => order.itensPedido || []);
  
  const summary = allItems.reduce((acc, item) => {
    const key = `${item.nomeItem}${item.sabor ? ` (${item.sabor})` : ''}`;
    if (!acc[key]) {
      acc[key] = 0;
    }
    acc[key] += item.quantidade;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 font-sans bg-white text-black">
      <header className="text-center border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold">{config?.nomeFazenda || 'Resumo de Pedidos'}</h1>
        <p className="text-lg">Resumo para a Cozinha - {format(new Date(), 'dd/MM/yyyy')}</p>
        <p className="text-sm">Total de Pedidos Selecionados: {orders.length}</p>
      </header>

      <section className="my-6">
        <h2 className="text-2xl font-bold mb-4">Total de Itens</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2 pr-4 text-xl">Quantidade</th>
              <th className="py-2 text-xl">Item</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary).sort().map(([name, quantity]) => (
              <tr key={name} className="border-b border-dashed border-black">
                <td className="py-2 pr-4 text-xl font-bold">{quantity}x</td>
                <td className="py-2 text-xl">{name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="my-6">
        <h2 className="text-2xl font-bold mb-4">Observações Gerais</h2>
        <ul className="list-disc list-inside space-y-2">
            {orders.map(order => (
                (order.observacoesGerais || order.observacoesPratosQuentes) && (
                    <li key={order.id}>
                        <strong>{order.stayInfo?.guestName} (Cabana {order.stayInfo?.cabinName}):</strong> {order.observacoesGerais} {order.observacoesPratosQuentes}
                    </li>
                )
            ))}
        </ul>
      </section>
    </div>
  );
};