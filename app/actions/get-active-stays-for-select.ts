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

// Função para formatar o nome
const formatGuestName = (fullName: string | undefined): string => {
    if (!fullName) return '';
    const firstName = fullName.split(' ')[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

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
                        // AJUSTE 1: Nome do hóspede já formatado
                        name: formatGuestName(preCheckInData?.leadGuestName),
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
                     // AJUSTE 3: Garante que os dados de Wi-Fi sejam incluídos
                     const data = cabinSnap.data();
                     cabinData = { 
                         id: cabinSnap.id, 
                         name: data?.name,
                         capacity: data?.capacity,
                         wifiSsid: data?.wifiSsid,
                         wifiPassword: data?.wifiPassword,
                     } as Cabin;
                 }
            }
            
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