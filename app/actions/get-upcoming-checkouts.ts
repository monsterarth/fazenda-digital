// app/actions/get-upcoming-checkouts.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Stay, Guest, Cabin } from "@/types";
import { Timestamp } from "firebase-admin/firestore";
import { EnrichedStayForSelect } from "./get-active-stays-for-select";

export async function getUpcomingCheckouts(): Promise<EnrichedStayForSelect[]> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Formato YYYY-MM-DD para corresponder ao que está no Firestore
        const tomorrowString = tomorrow.toISOString().split('T')[0];

        const staysRef = adminDb.collection('stays');
        const upcomingCheckoutsQuery = staysRef
            .where('status', '==', 'active')
            .where('checkOutDate', '==', tomorrowString);
            
        const querySnapshot = await upcomingCheckoutsQuery.get();

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
        console.error("Erro ao buscar check-outs futuros:", error);
        return [];
    }
}