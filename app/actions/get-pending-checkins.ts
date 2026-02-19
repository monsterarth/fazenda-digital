// app/actions/get-pending-checkins.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { PreCheckIn } from '@/types';

export async function getPendingCheckIns(): Promise<PreCheckIn[]> {
  try {
    const snapshot = await adminDb
      .collection('preCheckIns')
      .where('status', '==', 'pendente')
      .get();

    if (snapshot.empty) return [];

    // Mapeia e busca os dados da estadia vinculada em paralelo
    const checkinsWithStays = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const preCheckIn = { id: doc.id, ...data } as any;

      // Se houver um stayId (criado pelo Fast Stay), buscamos a estadia original
      if (preCheckIn.stayId) {
        try {
          const stayDoc = await adminDb.collection('stays').doc(preCheckIn.stayId).get();
          if (stayDoc.exists) {
            const stayData = stayDoc.data();
            
            // 1. Anexamos os dados da estadia (stay) dentro do objeto para referência
            preCheckIn.stay = {
              id: stayDoc.id,
              ...stayData
            };
            
            // 2. BACKFILL: Preenchemos as datas na raiz do objeto se elas não existirem
            // Isso garante que o modal de validação encontre 'checkInDate' e 'checkOutDate'
            if (!preCheckIn.checkInDate && stayData?.checkInDate) {
                const cIn = stayData.checkInDate;
                // Garante formato ISO string (aceito pelo frontend)
                preCheckIn.checkInDate = typeof cIn.toDate === 'function' ? cIn.toDate().toISOString() : cIn;
            }
            
            if (!preCheckIn.checkOutDate && stayData?.checkOutDate) {
                const cOut = stayData.checkOutDate;
                preCheckIn.checkOutDate = typeof cOut.toDate === 'function' ? cOut.toDate().toISOString() : cOut;
            }

            if (!preCheckIn.cabinId && stayData?.cabinId) {
                preCheckIn.cabinId = stayData.cabinId;
            }
          }
        } catch (err) {
          console.error(`Erro ao buscar stay ${preCheckIn.stayId} para preCheckIn ${doc.id}`, err);
        }
      }

      return preCheckIn;
    }));

    // Serialização completa para evitar erros de "Only plain objects" do Next.js
    return JSON.parse(JSON.stringify(checkinsWithStays));
  } catch (error) {
    console.error("Erro ao buscar pré-check-ins pendentes:", error);
    return [];
  }
}