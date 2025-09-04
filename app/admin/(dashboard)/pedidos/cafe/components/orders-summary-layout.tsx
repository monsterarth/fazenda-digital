// app/admin/(dashboard)/pedidos/cafe/components/orders-summary-layout.tsx

import React from 'react';
import { OrderWithStay, Property } from '@/types';
import { groupItems } from '@/lib/order-utils';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';


interface OrdersSummaryLayoutProps {
  orders: OrderWithStay[];
  property: Property | null;
}

export const OrdersSummaryLayout: React.FC<OrdersSummaryLayoutProps> = ({ orders, property }) => {
  // Coleta todos os itens de todos os pedidos para o resumo geral
  const allIndividualItems = orders.flatMap(o => o.individualItems || []);
  const allCollectiveItems = orders.flatMap(o => o.collectiveItems || []);

  // Agrupa os itens para o resumo usando a função utilitária
  const groupedIndividual = groupItems(allIndividualItems);
  const groupedCollective = groupItems(allCollectiveItems);

  // ++ AGRUPA PEDIDOS POR HORÁRIO DE ENTREGA ++
  const ordersByTime = orders.reduce((acc, order) => {
    const time = order.deliveryTime || 'Sem horário';
    if (!acc[time]) {
      acc[time] = [];
    }
    acc[time].push(order);
    return acc;
  }, {} as Record<string, OrderWithStay[]>);

  const deliveryDate = orders[0]?.deliveryDate ? new Date(`${orders[0].deliveryDate}T00:00:00`) : new Date();
  const formattedDate = isValid(deliveryDate) ? format(deliveryDate, "eeee, dd 'de' MMMM", { locale: ptBR }) : 'Pedidos de múltiplas datas';


  return (
    <div className="p-4 sm:p-8 font-sans bg-white text-black min-h-screen">
      {/* CABEÇALHO */}
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold">{property?.name || 'Resumo de Produção'}</h1>
        <p className="text-lg">Resumo para entrega em: <strong>{formattedDate}</strong></p>
        <p className="text-sm text-gray-600">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
      </header>

      {/* SEÇÃO DE RESUMO GERAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 break-after-page">
        <section>
          <h2 className="text-2xl font-semibold border-b-2 border-black pb-2 mb-4">Itens Individuais (Total)</h2>
          {Object.keys(groupedIndividual).length > 0 ? (
            Object.entries(groupedIndividual).map(([categoryName, items]) => (
              <div key={categoryName} className="mb-4">
                <h3 className="text-xl font-bold">{categoryName}</h3>
                <ul className="list-disc list-inside">
                  {Object.entries(items).map(([itemName, details]) => (
                    <li key={itemName} className="text-base">
                      <strong>{details.count}x</strong> {itemName}
                      {details.flavors && Object.keys(details.flavors).length > 0 && (
                        <ul className="list-circle list-inside ml-4 text-sm">
                          {Object.entries(details.flavors).map(([flavorName, flavorCount]) => (
                            <li key={flavorName}>{flavorCount}x {flavorName}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Nenhum item individual encontrado.</p>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold border-b-2 border-black pb-2 mb-4">Itens da Cesta (Total)</h2>
          {Object.keys(groupedCollective).length > 0 ? (
            Object.entries(groupedCollective).map(([categoryName, items]) => (
              <div key={categoryName} className="mb-4">
                <h3 className="text-xl font-bold">{categoryName}</h3>
                <ul className="list-disc list-inside">
                  {Object.entries(items).map(([itemName, details]) => (
                    <li key={itemName} className="text-base">
                      <strong>{details.count}x</strong> {itemName}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Nenhum item da cesta encontrado.</p>
          )}
        </section>
      </div>

      {/* SEÇÃO DE PEDIDOS DETALHADOS POR HORÁRIO */}
      <section className="mt-10">
        <header className="text-center mb-8">
            <h1 className="text-3xl font-bold">Comandas por Horário</h1>
            <p className="text-lg">Pedidos agrupados por horário de entrega</p>
        </header>

        {Object.entries(ordersByTime).sort(([timeA], [timeB]) => timeA.localeCompare(timeB)).map(([time, timeOrders]) => (
          <div key={time} className="mb-8 break-inside-avoid">
            <h2 className="text-2xl font-extrabold bg-black text-white p-2 rounded-md">
              ⏰ Entrega às {time} ({timeOrders.length} {timeOrders.length > 1 ? 'cestas' : 'cesta'})
            </h2>
            <div className="space-y-4 mt-4">
              {timeOrders.map(order => (
                  <div key={order.id} className="border-2 border-dashed border-black p-4 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center border-b border-dashed border-black pb-2 mb-3">
                          <div>
                              <h3 className="text-2xl font-extrabold">Cabana: {order.stayInfo?.cabinName || 'N/A'}</h3>
                              <p className="text-md text-gray-700">Hóspede: {order.stayInfo?.guestName || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-sm font-semibold">Pedido #{order.id.substring(0, 6)}</p>
                              <p className="text-sm text-gray-600">{order.numberOfGuests} pessoas</p>
                          </div>
                      </div>

                      {(order.individualItems && order.individualItems.length > 0) && (
                          <div className="mb-3">
                              <h4 className="text-lg font-bold">Itens por Hóspede:</h4>
                               {Array.from({ length: order.numberOfGuests }, (_, i) => i + 1).map(personId => (
                                  <div key={personId} className="pl-2 mt-1">
                                      <p className="font-semibold text-sm">Hóspede {personId}:</p>
                                      <ul className="list-disc list-inside pl-4">
                                          {order.individualItems.filter(item => item.personId === personId).map((item, index) => (
                                              <li key={index} className="text-base">
                                                  {item.itemName}
                                                  {item.flavorName && <span className="text-gray-600"> ({item.flavorName})</span>}
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              ))}
                          </div>
                      )}
                      
                      {(order.collectiveItems && order.collectiveItems.length > 0) && (
                          <div>
                              <h4 className="text-lg font-bold">Itens da Cesta:</h4>
                              <ul className="list-none pl-2">
                                  {order.collectiveItems.map((item, index) => (
                                      <li key={index} className="text-base">
                                          - <strong>{item.quantity}x {item.itemName}</strong>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      )}

                      {order.generalNotes && (
                        <div className="mt-3 pt-3 border-t border-dashed border-black">
                           <h4 className="text-lg font-bold">Observações:</h4>
                           <p className="whitespace-pre-wrap text-sm">{order.generalNotes}</p>
                        </div>
                      )}
                  </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};