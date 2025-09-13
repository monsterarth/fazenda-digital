// app/actions/get-recent-checkouts-for-feedback.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Stay, Guest, Cabin } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import { EnrichedStayForSelect } from "./get-active-stays-for-select";

export async function getRecentCheckoutsForFeedback(): Promise<EnrichedStayForSelect[]> {
    try {
        const staysRef = adminDb.collection('stays');
        
        // 1. Simplificamos a consulta para buscar todos os candidatos
        // A filtragem de data e do campo aninhado será feita no código para evitar a necessidade de índices complexos.
        const checkoutsQuery = staysRef
            .where('status', '==', 'checked_out');
            
        const querySnapshot = await checkoutsQuery.get();

        if (querySnapshot.empty) {
            return [];
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 2. Filtramos os resultados no código
        const recentCheckoutsWithoutFeedback = querySnapshot.docs.filter(doc => {
            const stayData = doc.data() as Stay & { endedAt?: Timestamp }; // Adicionamos endedAt ao tipo localmente
            
            // Verifica se a mensagem de feedback já foi enviada ou se o campo não existe
            if (stayData.communicationStatus?.feedbackMessageSentAt) {
                return false;
            }

            // Verifica a data de encerramento
            if (stayData.endedAt && stayData.endedAt.toDate) {
                const endedAtDate = stayData.endedAt.toDate();
                return endedAtDate >= sevenDaysAgo;
            }

            return false;
        });


        const staysPromises = recentCheckoutsWithoutFeedback.map(async (doc) => {
            const stayData = doc.data() as Stay;

            let guestData: Guest | null = null;
            if (stayData.preCheckInId) {
                const preCheckInSnap = await adminDb.collection('preCheckIns').doc(stayData.preCheckInId).get();
                if(preCheckInSnap.exists) {
                    const preCheckInData = preCheckInSnap.data();
                    guestData = {
                        id: preCheckInSnap.id,
                        name: preCheckInData?.leadGuestName,
                        email: preCheckInData?.leadGuestEmail,
                        phone: preCheckInData?.leadGuestPhone,
                        document: preCheckInData?.leadGuestDocument,
                    }
                }
            }

            let cabinData: Cabin | null = null;
            if(stayData.cabinId) {
                 const cabinSnap = await adminDb.collection('cabins').doc(stayData.cabinId).get();
                 if(cabinSnap.exists){
                     cabinData = { id: cabinSnap.id, ...cabinSnap.data() } as Cabin;
                 }
            }
            
            const plainStayObject = {
                id: doc.id,
                guestName: stayData.guestName,
                cabinName: stayData.cabinName,
                checkInDate: stayData.checkInDate,
                checkOutDate: stayData.checkOutDate,
                token: stayData.token,
                status: stayData.status,
                createdAt: (stayData.createdAt as unknown as Timestamp).toDate().toISOString(),
                guest: guestData,
                cabin: cabinData,
            };

            return plainStayObject as EnrichedStayForSelect;
        });

        const enrichedStays = await Promise.all(staysPromises);
        return enrichedStays.filter(stay => stay.guest && stay.cabin);

    } catch (error) {
        console.error("Erro ao buscar check-outs recentes para avaliação:", error);
        return [];
    }
}