import React from 'react';
import { OrderWithStay, Property } from '@/types'; // Importação 'OrderItem' removida
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { groupItems } from '@/lib/order-utils';

interface OrderReceiptLayoutProps {
  order: OrderWithStay;
  property: Property | null;
}

// Objeto para tipar os itens agrupados
type GroupedItems = {
    [categoryName: string]: {
        [itemName: string]: {
            count: number;
            flavors?: { [flavor: string]: number };
            notes?: string[];
        };
    };
};

// Ordem de exibição definida para as categorias
const categoryOrder = [
    "Pratos Quentes",
    "Bebidas Quentes",
    "Ovos e Omeletes",
    "Pães e Bolos",
    "Frutas e Cereais",
    "Frios e Laticínios",
    "Sucos e Bebidas",
    "Acompanhamentos"
];

export const OrderReceiptLayout: React.FC<OrderReceiptLayoutProps> = ({ order, property }) => {
  const groupedIndividual: GroupedItems = groupItems(order.individualItems || []);
  const groupedCollective: GroupedItems = groupItems(order.collectiveItems || []);

  const deliveryDate = order.deliveryDate ? new Date(`${order.deliveryDate}T00:00:00`) : null;
  const formattedDate = deliveryDate && isValid(deliveryDate) ? format(deliveryDate, "dd/MM/yyyy", { locale: ptBR }) : 'Data inválida';

  // Função para renderizar os itens de uma categoria específica
  const renderItems = (items: GroupedItems[string]) => {
    return Object.entries(items).map(([itemName, details]) => (
        <p key={itemName}>
            {details.count}x {itemName} {details.flavors ? `(${Object.keys(details.flavors).join(', ')})` : ''}
        </p>
    ));
  };

  // Função para renderizar uma seção de itens (Individuais ou da Cesta)
  const renderSection = (title: string, groupedItems: GroupedItems) => {
    // Separa os pratos quentes das outras categorias
    const hotPlatesKey = "Pratos Quentes";
    const hotPlates = groupedItems[hotPlatesKey];
    const otherCategories = { ...groupedItems };
    if (hotPlates) {
        delete otherCategories[hotPlatesKey];
    }

    // Pega as categorias restantes na ordem definida
    const orderedCategories = categoryOrder.filter(cat => otherCategories[cat] && cat !== hotPlatesKey);
    // Adiciona quaisquer outras categorias não previstas no final para garantir que nada seja perdido
    const remainingCategories = Object.keys(otherCategories).filter(cat => !categoryOrder.includes(cat));
    
    const finalCategoryOrder = [...orderedCategories, ...remainingCategories];

    // Se não houver itens nesta seção, não renderiza nada
    if (Object.keys(groupedItems).length === 0) {
        return null;
    }

    return (
      <div className="mt-2">
        <div className="font-bold">{title}</div>
        {/* Renderiza Pratos Quentes primeiro, se houver */}
        {hotPlates && (
          <div className="mt-1">
            <p className="font-semibold underline">Pratos Quentes:</p>
            {renderItems(hotPlates)}
          </div>
        )}
        
        {/* Renderiza as outras categorias na ordem definida */}
        {finalCategoryOrder.map(categoryName => (
            <div key={categoryName} className="mt-1">
                <p className="font-semibold underline">{categoryName}:</p>
                {renderItems(otherCategories[categoryName])}
            </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-2 font-mono bg-white text-black text-xs w-[80mm]">
      <div className="text-center mb-2">
        <h1 className="font-bold text-sm">{property?.name}</h1>
        <p>Pedido de Café da Manhã</p>
      </div>
      <hr className="border-dashed border-black my-2" />
      <p><strong>Cabana:</strong> {order.stayInfo?.cabinName}</p>
      <p><strong>Hóspede:</strong> {order.stayInfo?.guestName}</p>
      <p><strong>Entrega:</strong> {formattedDate} {order.deliveryTime && `às ${order.deliveryTime}`}</p>
      <p><strong>Pessoas:</strong> {order.numberOfGuests}</p>
      <hr className="border-dashed border-black my-2" />
      
      {renderSection('-- ITENS INDIVIDUAIS --', groupedIndividual)}

      {renderSection('-- ITENS DA CESTA --', groupedCollective)}
      
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