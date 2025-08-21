// app/actions/get-todays-breakfast-orders.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { BreakfastOrder } from '@/types';
import { serializeFirestoreTimestamps } from '@/lib/utils'; // ++ ADICIONADO ++

export async function getTodaysBreakfastOrders(): Promise<BreakfastOrder[]> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const ordersRef = adminDb.collection('breakfastOrders');
    const snapshot = await ordersRef.where('deliveryDate', '==', todayStr).get();

    if (snapshot.empty) return [];

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // ++ CORREÇÃO: Usando a nova função de serialização ++
    return serializeFirestoreTimestamps(orders);
  } catch (error) {
    console.error("Erro ao buscar pedidos de café de hoje:", error);
    return [];
  }
}