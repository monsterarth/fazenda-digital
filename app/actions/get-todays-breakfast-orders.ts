// app/actions/get-todays-breakfast-orders.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { BreakfastOrder } from '@/types';

export async function getTodaysBreakfastOrders(): Promise<BreakfastOrder[]> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const ordersRef = adminDb.collection('breakfastOrders');
    const snapshot = await ordersRef.where('deliveryDate', '==', todayStr).get();

    if (snapshot.empty) return [];

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // ++ CORREÇÃO: Usando JSON stringify/parse para garantir a serialização completa ++
    return JSON.parse(JSON.stringify(orders));
  } catch (error) {
    console.error("Erro ao buscar pedidos de café de hoje:", error);
    return [];
  }
}