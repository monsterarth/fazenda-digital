// app/api/cafe/route.ts

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin';
import { BreakfastMenuItem, RecipeIngredient } from '@/types';

// Interface auxiliar para Ingrediente vindo do banco
interface StockIngredient {
    id: string;
    averageCost: number;
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        if (!decodedToken.isGuest || !decodedToken.stayId) {
            return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
        }
        
        const stayId = decodedToken.stayId;
        const { orderData, existingOrderId } = await request.json();

        if (!orderData) {
            return NextResponse.json({ error: "Dados do pedido não fornecidos." }, { status: 400 });
        }
        
        if (!orderData.deliveryTime) {
            return NextResponse.json({ error: "O horário de entrega é obrigatório." }, { status: 400 });
        }

        // --- INÍCIO CÁLCULO DE CUSTOS (BACKEND) ---
        let calculatedTotalCost = 0;

        try {
            // 1. Buscar todos os Ingredientes (para pegar o custo atual)
            const ingredientsSnap = await adminDb.collection('ingredients').get();
            const ingredientsMap = new Map<string, number>(); // ID -> AverageCost
            ingredientsSnap.forEach(doc => {
                const data = doc.data();
                ingredientsMap.set(doc.id, Number(data.averageCost) || 0);
            });

            // 2. Buscar todos os Itens do Menu (para pegar as receitas)
            // Usamos collectionGroup para pegar todos os itens de todas as categorias de uma vez
            const itemsSnap = await adminDb.collectionGroup('items').get();
            const menuItemsMap = new Map<string, BreakfastMenuItem>();
            itemsSnap.forEach(doc => {
                menuItemsMap.set(doc.id, { id: doc.id, ...doc.data() } as BreakfastMenuItem);
            });

            // 3. Função Helper para calcular custo de uma receita
            const calculateRecipeCost = (recipe: RecipeIngredient[] = []) => {
                return recipe.reduce((acc, rItem) => {
                    const cost = ingredientsMap.get(rItem.ingredientId) || 0;
                    return acc + (cost * rItem.quantity);
                }, 0);
            };

            // 4. Calcular Custo dos Itens Individuais (Pratos Quentes)
            if (Array.isArray(orderData.individualItems)) {
                for (const item of orderData.individualItems) {
                    const menuItem = menuItemsMap.get(item.itemId);
                    if (menuItem) {
                        // Custo Base do Item
                        let itemCost = calculateRecipeCost(menuItem.recipe);
                        
                        // Custo do Sabor (se houver)
                        if (item.flavorName) { // Usamos flavorName pois flavorId as vezes não vem do front antigo, mas ideal é ID
                            const flavor = menuItem.flavors.find(f => f.name === item.flavorName || f.id === item.flavorId);
                            if (flavor) {
                                itemCost += calculateRecipeCost(flavor.recipe);
                            }
                        }
                        calculatedTotalCost += itemCost;
                    }
                }
            }

            // 5. Calcular Custo dos Itens Coletivos (se eles tiverem receita no futuro)
            if (Array.isArray(orderData.collectiveItems)) {
                for (const item of orderData.collectiveItems) {
                    const menuItem = menuItemsMap.get(item.itemId);
                    if (menuItem) {
                        const unitCost = calculateRecipeCost(menuItem.recipe);
                        calculatedTotalCost += (unitCost * (item.quantity || 1));
                    }
                }
            }

        } catch (costError) {
            console.error("Erro ao calcular custos (pedido salvo sem custo):", costError);
            // Não bloqueamos o pedido se o cálculo de custo falhar, apenas logamos.
        }
        // --- FIM CÁLCULO DE CUSTOS ---
        
        const ordersRef = adminDb.collection('breakfastOrders');
        
        if (existingOrderId) {
            await ordersRef.doc(existingOrderId).delete();
        }

        const newOrder = {
            ...orderData,
            stayId: stayId,
            createdAt: firestore.FieldValue.serverTimestamp(),
            totalCost: Number(calculatedTotalCost.toFixed(2)) // ++ GRAVANDO O CUSTO
        };

        const newOrderRef = await ordersRef.add(newOrder);

        await adminDb.collection('activity_logs').add({
            type: 'cafe_ordered',
            actor: { type: 'guest', identifier: orderData.guestName || 'Hóspede' },
            details: `Novo pedido de café de ${orderData.guestName || 'Hóspede'} para as ${orderData.deliveryTime}.`,
            link: '/admin/pedidos/cafe',
            timestamp: firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true, orderId: newOrderRef.id });

    } catch (error: any) {
        console.error("API Breakfast Order Error:", error);
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
    }
}