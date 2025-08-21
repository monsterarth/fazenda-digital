// app/actions/get-recent-checkedout-stays.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Stay } from '@/types';
// Removed client SDK imports; use Admin SDK methods instead
import { subDays } from 'date-fns';
import { serializeFirestoreTimestamps } from '@/lib/utils'; // ++ ADICIONADO ++

export async function getRecentCheckedOutStays(): Promise<Stay[]> {
  try {
    const sevenDaysAgo = subDays(new Date(), 7);
    const staysRef = adminDb.collection('stays');
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    const querySnapshot = await staysRef
      .where('status', '==', 'checked_out')
      .where('checkOutDate', '>=', sevenDaysAgoStr)
      .orderBy('checkOutDate', 'desc')
      .get();

    if (querySnapshot.empty) return [];

    const stays = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // ++ CORREÇÃO: Usando a nova função de serialização ++
    return serializeFirestoreTimestamps(stays);
  } catch (error) {
    console.error("Erro ao buscar estadias com check-out recente:", error);
    return [];
  }
}