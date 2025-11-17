// app/actions/get-kitchen-metrics.ts
'use server';

import { adminDb } from '@/lib/firebase-admin';
import { startOfMonth, endOfMonth, format, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function getKitchenMetrics(range: 'last30' | 'thisMonth' | 'lastMonth' = 'thisMonth') {
    try {
        const now = new Date();
        let start: Date;
        let end: Date;

        // Define o período
        if (range === 'lastMonth') {
            start = startOfMonth(subMonths(now, 1));
            end = endOfMonth(subMonths(now, 1));
        } else if (range === 'last30') {
            start = new Date();
            start.setDate(now.getDate() - 30);
            end = endOfDay(now);
        } else {
            start = startOfMonth(now);
            end = endOfDay(now);
        }

        // 1. Buscar Pedidos de Cesta (BreakfastOrders)
        // Custo aqui inclui TUDO (Pratos + Acompanhamentos)
        const basketsSnapshot = await adminDb.collection('breakfastOrders')
            .where('createdAt', '>=', start)
            .where('createdAt', '<=', end)
            .get();

        // 2. Buscar Pedidos do Salão (KitchenOrders)
        // Custo aqui é APENAS Pratos Quentes (Buffet Livre não incluso)
        const hallOrdersSnapshot = await adminDb.collection('kitchenOrders')
            .where('createdAt', '>=', start)
            .where('createdAt', '<=', end)
            .get();

        // --- Processamento de Dados ---

        let totalBasketsCost = 0;
        let totalHallCost = 0;
        let guestsServedBaskets = 0;
        let itemsSoldMap = new Map<string, { count: number, cost: number }>();

        // Processar Cestas
        const basketData = basketsSnapshot.docs.map(doc => {
            const data = doc.data();
            const cost = data.totalCost || 0;
            totalBasketsCost += cost;
            guestsServedBaskets += (data.numberOfGuests || 0);
            
            return {
                date: (data.createdAt.toDate() as Date).toISOString().split('T')[0],
                cost,
                type: 'cesta'
            };
        });

        // Processar Salão
        const hallData = hallOrdersSnapshot.docs.map(doc => {
            const data = doc.data();
            const cost = data.totalCost || 0;
            totalHallCost += cost;

            // Contagem de Itens (Curva ABC)
            if (data.items && Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                    const current = itemsSoldMap.get(item.itemName) || { count: 0, cost: 0 };
                    itemsSoldMap.set(item.itemName, { 
                        count: current.count + item.quantity,
                        // Estimativa proporcional do custo do item se não houver unitCost gravado
                        cost: current.cost + (cost / data.items.length) 
                    });
                });
            }

            return {
                date: (data.createdAt.toDate() as Date).toISOString().split('T')[0],
                cost,
                type: 'salao'
            };
        });

        // Agrupar por Dia (para o gráfico)
        const daysMap = new Map<string, { cesta: number, salao: number }>();
        [...basketData, ...hallData].forEach(item => {
            const current = daysMap.get(item.date) || { cesta: 0, salao: 0 };
            if (item.type === 'cesta') current.cesta += item.cost;
            else current.salao += item.cost;
            daysMap.set(item.date, current);
        });

        const chartData = Array.from(daysMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, values]) => ({
                date: format(new Date(date), 'dd/MM', { locale: ptBR }),
                cesta: Number(values.cesta.toFixed(2)),
                salao: Number(values.salao.toFixed(2)),
            }));

        // Top Itens
        const topItems = Array.from(itemsSoldMap.entries())
            .map(([name, val]) => ({ name, ...val }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            summary: {
                totalCost: totalBasketsCost + totalHallCost,
                basketCost: totalBasketsCost,
                hallCost: totalHallCost,
                guestsBaskets: guestsServedBaskets,
                // CPP apenas para cestas (pois salão não temos contagem precisa de hóspedes no pedido da cozinha)
                cppBaskets: guestsServedBaskets > 0 ? (totalBasketsCost / guestsServedBaskets) : 0
            },
            chartData,
            topItems
        };

    } catch (error) {
        console.error("Erro ao calcular métricas:", error);
        return null;
    }
}