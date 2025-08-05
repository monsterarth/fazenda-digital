import { IndividualOrderItem, CollectiveOrderItem } from "@/types";

type ItemDetail = {
    count: number;
    flavors?: { [flavorName: string]: number };
};

type GroupedItems = {
    [categoryName: string]: {
        [itemName: string]: ItemDetail;
    };
};

export const groupItems = (items: (IndividualOrderItem | CollectiveOrderItem)[]): GroupedItems => {
    return items.reduce<GroupedItems>((acc, item) => {
        const { categoryName, itemName } = item;
        
        // Inicializa a categoria se não existir
        if (!acc[categoryName]) {
            acc[categoryName] = {};
        }
        
        // Inicializa o item se não existir
        if (!acc[categoryName][itemName]) {
            acc[categoryName][itemName] = { count: 0 };
        }

        // Incrementa a contagem
        if ('quantity' in item) { // É CollectiveOrderItem
            acc[categoryName][itemName].count += item.quantity;
        } else { // É IndividualOrderItem
            acc[categoryName][itemName].count += 1;
            
            // Lida com os sabores
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