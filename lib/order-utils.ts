import { IndividualOrderItem, CollectiveOrderItem } from "@/types";

/**
 * Interface para descrever a estrutura de um item agrupado no resumo.
 * `count` armazena a quantidade total do item.
 * `flavors` é um mapa opcional para contar as variações de sabor.
 */
type ItemDetail = {
    count: number;
    flavors?: { [flavorName: string]: number };
};

/**
 * Interface para a estrutura final dos itens agrupados, organizados por nome de categoria.
 */
type GroupedItems = {
    [categoryName: string]: {
        [itemName: string]: ItemDetail;
    };
};

/**
 * Agrupa e conta uma lista de itens de pedido (individuais ou coletivos).
 * @param items Um array de IndividualOrderItem ou CollectiveOrderItem.
 * @returns Um objeto com os itens agregados por categoria e nome, com contagem total e de sabores.
 */
export const groupItems = (items: (IndividualOrderItem | CollectiveOrderItem)[]): GroupedItems => {
    return items.reduce<GroupedItems>((acc, item) => {
        // Usa as propriedades corretas 'categoryName' e 'itemName' dos seus types.
        const { categoryName, itemName } = item;
        
        // Garante que a categoria exista no objeto acumulador.
        if (!acc[categoryName]) {
            acc[categoryName] = {};
        }
        
        // Garante que o item exista dentro da categoria.
        if (!acc[categoryName][itemName]) {
            acc[categoryName][itemName] = { count: 0 };
        }

        // Verifica se o item é coletivo (possui 'quantity') ou individual.
        if ('quantity' in item) { // É um CollectiveOrderItem
            acc[categoryName][itemName].count += item.quantity;
        } else { // É um IndividualOrderItem
            acc[categoryName][itemName].count += 1;
            
            // Se for um item individual com sabor, agrupa e conta os sabores.
            if (item.flavorName) {
                if (!acc[categoryName][itemName].flavors) {
                    acc[categoryName][itemName].flavors = {};
                }
                const flavors = acc[categoryName][itemName].flavors!;
                flavors[item.flavorName] = (flavors[item.flavorName] || 0) + 1;
            }
        }

        return acc;
    }, {});
};
