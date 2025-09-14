//app/actions/validate-checkin.ts

'use server'

import { adminDb } from '@/lib/firebase-admin';
import { PreCheckIn, Stay, Cabin, Guest } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { normalizeString } from '@/lib/utils';

const generateToken = (): string => Math.floor(100000 + Math.random() * 900000).toString();

interface ValidationData {
    cabinId: string;
    dates: {
        from: Date;
        to: Date;
    };
}

export async function validateCheckinAction(checkInId: string, data: ValidationData, adminEmail: string) {
    try {
        const preCheckInRef = adminDb.collection('preCheckIns').doc(checkInId);
        const preCheckInSnap = await preCheckInRef.get();
        if (!preCheckInSnap.exists) {
            throw new Error("Pré-check-in não encontrado. Pode já ter sido validado.");
        }
        const selectedCheckIn = { ...preCheckInSnap.data(), id: preCheckInSnap.id } as PreCheckIn;

        const normalizedGuestName = normalizeString(selectedCheckIn.leadGuestName);
        const normalizedCompanions = selectedCheckIn.companions?.map(c => ({
            ...c,
            fullName: normalizeString(c.fullName)
        })) || [];

        const cabinRef = adminDb.collection('cabins').doc(data.cabinId);
        const cabinSnap = await cabinRef.get();
        if (!cabinSnap.exists) {
            throw new Error("Cabana selecionada não foi encontrada.");
        }
        const selectedCabin = { id: cabinSnap.id, ...cabinSnap.data() } as Cabin;

        const batch = adminDb.batch();

        const stayRef = adminDb.collection('stays').doc();
        const token = generateToken();
        const checkInTimestamp = Timestamp.fromDate(new Date(data.dates.from));
        
        const newStay: Omit<Stay, 'id'> = {
            guestName: normalizedGuestName,
            cabinId: selectedCabin.id,
            cabinName: selectedCabin.name,
            checkInDate: data.dates.from.toISOString(),
            checkOutDate: data.dates.to.toISOString(),
            numberOfGuests: 1 + (normalizedCompanions.length || 0),
            token: token,
            status: 'active',
            preCheckInId: selectedCheckIn.id,
            createdAt: checkInTimestamp,
            pets: selectedCheckIn.pets || [],
        };
        batch.set(stayRef, newStay);

        batch.update(preCheckInRef, { 
            status: 'validado', 
            stayId: stayRef.id,
            leadGuestName: normalizedGuestName,
            companions: normalizedCompanions,
        });

        const numericCpf = selectedCheckIn.leadGuestDocument.replace(/\D/g, '');
        const guestRef = adminDb.collection('guests').doc(numericCpf);
        const guestSnap = await guestRef.get();

        if (guestSnap.exists) {
            const guestData = guestSnap.data() as Guest;
            // CORREÇÃO APLICADA AQUI:
            // Garante que guestData.stayHistory seja um array antes de usar o spread operator.
            batch.update(guestRef, {
                stayHistory: [...(guestData.stayHistory || []), stayRef.id],
                updatedAt: checkInTimestamp,
                name: normalizedGuestName,
                email: selectedCheckIn.leadGuestEmail,
                phone: selectedCheckIn.leadGuestPhone,
                address: selectedCheckIn.address,
            });
        } else {
            const newGuest: Omit<Guest, 'id'> = {
                name: normalizedGuestName,
                document: numericCpf,
                email: selectedCheckIn.leadGuestEmail,
                phone: selectedCheckIn.leadGuestPhone,
                address: selectedCheckIn.address,
                isForeigner: selectedCheckIn.isForeigner,
                country: selectedCheckIn.address.country,
                createdAt: checkInTimestamp,
                updatedAt: checkInTimestamp,
                stayHistory: [stayRef.id],
            };
            batch.set(guestRef, newGuest);
        }

        const logRef = adminDb.collection('activity_logs').doc();
        batch.set(logRef, {
            timestamp: Timestamp.now(),
            type: 'checkin_validated',
            actor: { type: 'admin', identifier: adminEmail },
            details: `Pré-check-in de ${normalizedGuestName} validado.`,
            link: '/admin/stays'
        });

        await batch.commit();

        revalidatePath('/admin/stays');
        revalidatePath('/admin/hospedes');

        return { success: true, message: "Estadia validada com sucesso!", token: token };

    } catch (error: any) {
        console.error("ERRO NA SERVER ACTION (validateCheckinAction):", error);
        return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
    }
}