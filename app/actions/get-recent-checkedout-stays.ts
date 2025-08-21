// app/actions/get-recent-checkedout-stays.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Stay } from '@/types';
// Removed Firestore client SDK imports; use Admin SDK methods instead
import { subDays } from 'date-fns';

export async function getRecentCheckedOutStays(): Promise<Stay[]> {
  try {
    const sevenDaysAgo = subDays(new Date(), 7);
    const staysRef = adminDb.collection('stays');
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const snapshot = await staysRef
      .where('status', '==', 'checked_out')
      .where('checkOutDate', '>=', sevenDaysAgoStr)
      .orderBy('checkOutDate', 'desc')
      .get();

    if (snapshot.empty) return [];

    const stays = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // ++ CORREÇÃO: Usando JSON stringify/parse para garantir a serialização completa ++
    return JSON.parse(JSON.stringify(stays));
  } catch (error) {
    console.error("Erro ao buscar estadias com check-out recente:", error);
    return [];
  }
}