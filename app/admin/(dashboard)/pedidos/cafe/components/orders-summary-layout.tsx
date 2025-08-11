import React from 'react';
import { OrderWithStay, Property } from '@/types';
import { groupItems } from '@/lib/order-utils';

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

  return (
    <div className="p-4 sm:p-8 font-sans bg-white text-black min-h-screen">
      {/* CABEÇALHO */}
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold">{property?.name || 'Resumo de Produção'}</h1>
        <p className="text-lg">Resumo de todos os itens para os pedidos selecionados</p>
        <p className="text-sm text-gray-600">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
      </header>

      {/* SEÇÃO DE RESUMO GERAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
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
          <h2 className="text-2xl font-semibold border-b-2 border-black pb-2 mb-4">Itens Coletivos (Total)</h2>
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
            <p className="text-gray-500">Nenhum item coletivo encontrado.</p>
          )}
        </section>
      </div>

      {/* DIVISOR DE PÁGINA PARA IMPRESSÃO */}
      <div style={{ pageBreakBefore: 'always' }}></div>

      {/* SEÇÃO DE PEDIDOS DETALHADOS */}
      <section className="mt-10">
        <header className="text-center mb-8">
            <h1 className="text-3xl font-bold">Pedidos Detalhados</h1>
            <p className="text-lg">Comandas individuais para produção</p>
        </header>

        <div className="space-y-6">
            {orders.map(order => (
                <div key={order.id} className="border-2 border-dashed border-black p-4 rounded-lg bg-gray-50 break-inside-avoid">
                    <div className="flex justify-between items-center border-b border-dashed border-black pb-2 mb-3">
                        <div>
                            {/* CORREÇÃO: Acessando 'stayInfo' em vez de 'stay' */}
                            <h3 className="text-2xl font-extrabold">Cabana: {order.stayInfo?.cabinName || 'N/A'}</h3>
                            <p className="text-md text-gray-700">Hóspede: {order.stayInfo?.guestName || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-semibold">Pedido #{order.id.substring(0, 6)}</p>
                           <p className="text-sm text-gray-600">Entrega: {new Date(order.deliveryDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                        </div>
                    </div>

                    {(order.individualItems && order.individualItems.length > 0) && (
                        <div className="mb-3">
                            <h4 className="text-lg font-bold">Itens por Hóspede ({order.numberOfGuests}):</h4>
                             {/* Agrupando por pessoa para uma visualização mais clara */}
                             {Array.from({ length: order.numberOfGuests }, (_, i) => i + 1).map(personId => (
                                <div key={personId} className="pl-2 mt-1">
                                    <p className="font-semibold text-sm">Hóspede {personId}:</p>
                                    <ul className="list-disc list-inside pl-4">
                                        {order.individualItems.filter(item => item.personId === personId).map((item, index) => (
                                            <li key={index} className="text-base">
                                                {/* CORREÇÃO: Acessando 'itemName' e 'flavorName' */}
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

                    {!order.individualItems?.length && !order.collectiveItems?.length && (
                        <p className="text-gray-500">Este pedido não contém itens.</p>
                    )}
                </div>
            ))}
        </div>
      </section>
    </div>
  );
};