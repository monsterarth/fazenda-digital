import React from 'react';
import { OrderWithStay, Property, IndividualOrderItem, CollectiveOrderItem } from '@/types';
import { groupItems } from '@/lib/order-utils'; // Função utilitária que vamos criar

interface OrdersSummaryLayoutProps {
  orders: OrderWithStay[];
  property: Property | null;
}

export const OrdersSummaryLayout: React.FC<OrdersSummaryLayoutProps> = ({ orders, property }) => {
  const allIndividualItems = orders.flatMap(o => o.individualItems || []);
  const allCollectiveItems = orders.flatMap(o => o.collectiveItems || []);

  const groupedIndividual = groupItems(allIndividualItems);
  const groupedCollective = groupItems(allCollectiveItems);

  return (
    <div className="p-8 font-sans bg-white text-black">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold">{property?.name || 'Resumo de Produção'}</h1>
        <p className="text-lg">Resumo de todos os itens para os pedidos selecionados</p>
        <p className="text-sm text-gray-600">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
      </header>

      <section>
        <h2 className="text-2xl font-semibold border-b-2 border-black pb-2 mb-4">Itens Individuais (por Hóspede)</h2>
        {Object.entries(groupedIndividual).map(([categoryName, items]) => (
          <div key={categoryName} className="mb-4">
            <h3 className="text-xl font-bold">{categoryName}</h3>
            <ul className="list-disc list-inside">
              {Object.entries(items).map(([itemName, details]) => (
                <li key={itemName} className="text-base">
                  <strong>{details.count}x</strong> {itemName}
                  {details.flavors && (
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
        ))}
      </section>

       <section className="mt-8">
        <h2 className="text-2xl font-semibold border-b-2 border-black pb-2 mb-4">Itens Coletivos (para a Cesta)</h2>
        {Object.entries(groupedCollective).map(([categoryName, items]) => (
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
        ))}
      </section>
    </div>
  );
};