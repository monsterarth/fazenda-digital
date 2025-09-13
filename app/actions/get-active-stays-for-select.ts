// app/actions/get-active-stays-for-select.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Stay, Guest, Cabin } from "@/types";
import { Timestamp } from "firebase-admin/firestore";

// TIPO LOCAL: Define a estrutura de dados "enriquecida" que o componente precisa
export interface EnrichedStayForSelect {
    id: string;
    token: string;
    checkInDate: string; 
    checkOutDate: string;
    guest: Guest;
    cabin: Cabin;
    guestName: string;
    cabinName: string;
    status: Stay['status'];
    createdAt: string; // Convertido para string
    [key: string]: any;
}

export async function getActiveStaysForSelect(): Promise<EnrichedStayForSelect[]> {
    try {
        const staysRef = adminDb.collection('stays');
        const activeStaysQuery = staysRef
            .where('status', '==', 'active');
            
        const querySnapshot = await activeStaysQuery.get();

        if (querySnapshot.empty) {
            return [];
        }

        const staysPromises = querySnapshot.docs.map(async (doc) => {
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
            
            // CORREÇÃO APLICADA AQUI:
            // Construímos um objeto "plano" e serializável, garantindo que
            // nenhum objeto de classe (como Timestamp) seja retornado.
            const plainStayObject = {
                id: doc.id,
                guestName: stayData.guestName,
                cabinName: stayData.cabinName,
                checkInDate: stayData.checkInDate,
                checkOutDate: stayData.checkOutDate,
                numberOfGuests: stayData.numberOfGuests,
                token: stayData.token,
                status: stayData.status,
                preCheckInId: stayData.preCheckInId,
                // Converte o Timestamp para uma string ISO, que é serializável
                createdAt: (stayData.createdAt as unknown as Timestamp).toDate().toISOString(),
                guest: guestData,
                cabin: cabinData,
            };

            return plainStayObject as EnrichedStayForSelect;
        });

        const enrichedStays = await Promise.all(staysPromises);
        
        return enrichedStays.filter(stay => stay.guest && stay.cabin);

    } catch (error) {
        console.error("Erro ao buscar estadias ativas para o seletor:", error);
        return [];
    }
}