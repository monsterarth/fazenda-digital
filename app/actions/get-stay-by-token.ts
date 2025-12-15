'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';

export async function getStayByToken(token: string) {
    noStore(); // Garante dados frescos sempre
    try {
        const snapshot = await adminDb.collection('stays')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // Normalização garantida do valor de pets para evitar erros no frontend
        let normalizedPets: any = 0; 
        if (Array.isArray(data.pets)) {
            normalizedPets = data.pets; 
        } else {
            normalizedPets = Number(data.pets) || 0;
        }

        return {
            id: doc.id,
            guestName: data.guestName,
            guestPhone: data.guestPhone || data.tempGuestPhone,
            cabinId: data.cabinId,
            cabinName: data.cabinName,
            checkInDate: data.checkInDate,
            checkOutDate: data.checkOutDate,
            guestCount: data.guestCount,
            
            guestId: (data.guestId && data.guestId.length === 11) ? data.guestId : '', 
            email: data.email || '',
            status: data.status,
            
            pets: normalizedPets,
            vehiclePlate: data.vehiclePlate || '' 
        };

    } catch (error) {
        console.error("Erro ao buscar estadia por token:", error);
        return null;
    }
}