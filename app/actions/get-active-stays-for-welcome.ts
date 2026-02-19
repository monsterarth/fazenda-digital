// app/actions/get-active-stays-for-welcome.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Stay, Guest, Cabin } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import { EnrichedStayForSelect } from "./get-active-stays-for-select";

export async function getActiveStaysForWelcome(): Promise<EnrichedStayForSelect[]> {
    try {
        const staysRef = adminDb.collection('stays');
        
        // Buscamos estadias ativas que não possuem o campo welcomeMessageSentAt.
        // O Firestore não suporta consultas por "campo não existente", então filtramos no código.
        const activeStaysQuery = staysRef
            .where('status', '==', 'active');
            
        const querySnapshot = await activeStaysQuery.get();

        if (querySnapshot.empty) {
            return [];
        }

        // Filtramos no código para pegar apenas os que não têm a mensagem de boas-vindas enviada.
        const staysNeedingWelcome = querySnapshot.docs.filter(doc => {
            const stayData = doc.data() as Stay;
            return !stayData.communicationStatus?.welcomeMessageSentAt;
        });

        const staysPromises = staysNeedingWelcome.map(async (doc) => {
            const stayData = doc.data() as Stay;

            let guestData: Guest | null = null;
            if (stayData.preCheckInId) {
                const preCheckInSnap = await adminDb.collection('preCheckIns').doc(stayData.preCheckInId).get();
                if(preCheckInSnap.exists) {
                    const preCheckInData = preCheckInSnap.data();
                    guestData = {
                        id: preCheckInSnap.id,
                        name: preCheckInData?.leadGuestName, email: preCheckInData?.leadGuestEmail,
                        phone: preCheckInData?.leadGuestPhone, document: preCheckInData?.leadGuestDocument,
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
                guestName: stayData.guestName, cabinName: stayData.cabinName,
                checkInDate: stayData.checkInDate, checkOutDate: stayData.checkOutDate,
                token: stayData.token, status: stayData.status,
                createdAt: (stayData.createdAt as unknown as Timestamp).toDate().toISOString(),
                guest: guestData, cabin: cabinData,
            };

            return plainStayObject as EnrichedStayForSelect;
        });

        const enrichedStays = await Promise.all(staysPromises);
        return enrichedStays.filter(stay => stay.guest && stay.cabin);

    } catch (error) {
        console.error("Erro ao buscar estadias para mensagem de boas-vindas:", error);
        return [];
    }
}