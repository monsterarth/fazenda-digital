'use server'

import { adminDb } from '@/lib/firebase-admin';
import { PreCheckIn, Stay, Cabin, Companion } from '@/types';
import { Guest } from '@/types/guest';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { normalizeString } from '@/lib/utils'; // 1. IMPORTANDO A FUNÇÃO DE NORMALIZAÇÃO

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

        // 2. NORMALIZANDO OS NOMES VINDOS DO PRÉ-CHECK-IN DO HÓSPEDE
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
        
        // 3. USANDO OS NOMES NORMALIZADOS PARA CRIAR A ESTADIA
        const newStay: Omit<Stay, 'id'> = {
            guestName: normalizedGuestName, // <-- APLICADO
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

        // 4. ATUALIZANDO O PRÓPRIO PRÉ-CHECK-IN COM OS DADOS NORMALIZADOS
        batch.update(preCheckInRef, { 
            status: 'validado', 
            stayId: stayRef.id,
            leadGuestName: normalizedGuestName, // <-- APLICADO
            companions: normalizedCompanions,  // <-- APLICADO
        });

        const numericCpf = selectedCheckIn.leadGuestDocument.replace(/\D/g, '');
        const guestRef = adminDb.collection('guests').doc(numericCpf);
        const guestSnap = await guestRef.get();

        if (guestSnap.exists) {
            const guestData = guestSnap.data() as Guest;
            // 5. USANDO O NOME NORMALIZADO AO ATUALIZAR UM HÓSPEDE EXISTENTE
            batch.update(guestRef, {
                stayHistory: [...guestData.stayHistory, stayRef.id],
                updatedAt: checkInTimestamp,
                name: normalizedGuestName, // <-- APLICADO
                email: selectedCheckIn.leadGuestEmail,
                phone: selectedCheckIn.leadGuestPhone,
                address: selectedCheckIn.address,
            });
        } else {
            // 6. USANDO O NOME NORMALIZADO AO CRIAR UM NOVO HÓSPEDE
            const newGuest: Omit<Guest, 'id'> = {
                name: normalizedGuestName, // <-- APLICADO
                cpf: numericCpf,
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
            details: `Pré-check-in de ${normalizedGuestName} validado.`, // <-- Usando nome normalizado no log
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