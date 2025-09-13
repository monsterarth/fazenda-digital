// app/actions/get-pending-breakfast-stays.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Stay, Guest, Cabin, Property } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import { EnrichedStayForSelect } from "./get-active-stays-for-select";

export async function getPendingBreakfastStays(): Promise<EnrichedStayForSelect[]> {
    try {
        // 1. Verificar a modalidade do café primeiro
        const propertySnap = await adminDb.collection('properties').doc('default').get();
        if (!propertySnap.exists) {
            throw new Error("Configurações da propriedade não encontradas.");
        }
        const propertyData = propertySnap.data() as Property;

        // Se o café for no salão ('on-site'), não há lembretes a serem enviados.
        if (propertyData.breakfast?.type === 'on-site') {
            return [];
        }

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];

        // 2. Pega todos os pedidos de café para amanhã
        const ordersRef = adminDb.collection('breakfastOrders');
        const ordersQuery = await ordersRef.where('deliveryDate', '==', tomorrowString).get();
        const staysWithOrders = new Set(ordersQuery.docs.map(doc => doc.data().stayId));

        // 3. Pega todas as estadias ativas
        const staysRef = adminDb.collection('stays');
        const activeStaysQuery = await staysRef.where('status', '==', 'active').get();
        
        if (activeStaysQuery.empty) {
            return [];
        }

        // 4. Filtra as estadias que NÃO têm pedido
        const pendingStaysDocs = activeStaysQuery.docs.filter(doc => !staysWithOrders.has(doc.id));

        const staysPromises = pendingStaysDocs.map(async (doc) => {
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
        console.error("Erro ao buscar estadias com café pendente:", error);
        return [];
    }
}