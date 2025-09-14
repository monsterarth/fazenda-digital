// app/actions/get-new-bookings-for-confirmation.ts

"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Stay, Guest, Cabin } from "@/types";
import { Booking } from "@/types/scheduling";
import { Timestamp } from "firebase-admin/firestore";
import { subHours } from "date-fns";

// Interface para o Booking enriquecido com dados do Hóspede e da Cabana
export interface EnrichedBookingForSelect extends Booking {
    guest: Guest;
    cabin: Cabin;
}

export async function getNewBookingsForConfirmation(): Promise<EnrichedBookingForSelect[]> {
    try {
        const bookingsRef = adminDb.collection('bookings');
        
        // Define o critério de tempo: últimas 24 horas
        const twentyFourHoursAgo = Timestamp.fromDate(subHours(new Date(), 24));

        // 1. Busca ampla: Pega todas as reservas recentes.
        const newBookingsQuery = bookingsRef
            .where('createdAt', '>=', twentyFourHoursAgo)
            .where('status', '!=', 'bloqueado');
            
        const querySnapshot = await newBookingsQuery.get();

        if (querySnapshot.empty) {
            return [];
        }
        
        // 2. Filtra no código: mantém apenas as que não foram confirmadas.
        const docsThatNeedConfirmation = querySnapshot.docs.filter(doc => !doc.data().confirmationSentAt);

        // 3. Mapeia, enriquece e CONVERTE os dados.
        const bookingsPromises = docsThatNeedConfirmation.map(async (doc) => {
            const bookingData = doc.data();

            // Objeto de reserva com dados seguros para serialização
            const safeBookingData = {
                ...bookingData,
                // CORREÇÃO APLICADA AQUI: Converte o Timestamp para string
                createdAt: bookingData.createdAt.toDate().toISOString(),
                // Garante que o outro campo de data também seja seguro, se existir
                confirmationSentAt: bookingData.confirmationSentAt ? bookingData.confirmationSentAt.toDate().toISOString() : null,
            } as Booking;

            let guestData: Guest | null = null;
            let cabinData: Cabin | null = null;

            if (safeBookingData.stayId) {
                const staySnap = await adminDb.collection('stays').doc(safeBookingData.stayId).get();
                if (staySnap.exists) {
                    const stayData = staySnap.data() as Stay;
                    if (stayData.preCheckInId) {
                        const preCheckInSnap = await adminDb.collection('preCheckIns').doc(stayData.preCheckInId).get();
                        if (preCheckInSnap.exists) {
                            const preCheckInData = preCheckInSnap.data();
                            guestData = { id: preCheckInSnap.id, name: preCheckInData?.leadGuestName, email: preCheckInData?.leadGuestEmail, phone: preCheckInData?.leadGuestPhone, document: preCheckInData?.leadGuestDocument } as Guest;
                        }
                    }
                    if (stayData.cabinId) {
                        const cabinSnap = await adminDb.collection('cabins').doc(stayData.cabinId).get();
                        if (cabinSnap.exists) { cabinData = { id: cabinSnap.id, ...cabinSnap.data() } as Cabin; }
                    }
                }
            }

            if (!guestData && safeBookingData.guestId) {
                const guestSnap = await adminDb.collection('guests').doc(safeBookingData.guestId).get();
                if (guestSnap.exists) {
                    guestData = { id: guestSnap.id, ...guestSnap.data() } as Guest;
                } else {
                    guestData = { id: safeBookingData.guestId, name: safeBookingData.guestName, phone: '' } as Guest;
                }
            }
            
            if (!cabinData) {
                cabinData = { id: safeBookingData.cabinId || safeBookingData.structureId || 'unknown', name: safeBookingData.structureName || safeBookingData.cabinName || 'Não informado' } as Cabin;
            }
            
            if (!guestData || !cabinData || !guestData.name) {
                console.warn(`A reserva ${doc.id} foi pulada por falta de dados.`);
                return null;
            }

            return { ...safeBookingData, id: doc.id, guest: guestData, cabin: cabinData } as EnrichedBookingForSelect;
        });

        const enrichedBookings = (await Promise.all(bookingsPromises)).filter((b): b is EnrichedBookingForSelect => b !== null);
        return enrichedBookings;

    } catch (error) {
        console.error("Erro ao buscar novas reservas para confirmação:", error);
        return [];
    }
}