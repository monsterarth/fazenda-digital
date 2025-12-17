'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';

export async function getStayByToken(token: string) {
    noStore(); 
    try {
        // 1. Buscar Estadia
        const snapshot = await adminDb.collection('stays')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        const stayData = doc.data();

        // 2. Buscar Perfil Mestre (Prioridade)
        let guestProfile: any = null;
        
        const possibleIds = [
            stayData.guestId,           
            stayData.guestDocument,     
            stayData.cpf,               
            stayData.document           
        ].filter(id => id && typeof id === 'string');

        const uniqueIds = Array.from(new Set(possibleIds));

        for (const rawId of uniqueIds) {
            if (guestProfile) break;
            const cleanId = rawId.replace(/\D/g, ''); 
            
            if (cleanId.length >= 10) { 
                const docRef = await adminDb.collection('guests').doc(cleanId).get();
                if (docRef.exists) {
                    guestProfile = docRef.data();
                    break;
                }
                const queryCpf = await adminDb.collection('guests').where('cpf', '==', cleanId).limit(1).get();
                if (!queryCpf.empty) {
                    guestProfile = queryCpf.docs[0].data();
                    break;
                }
            }
        }

        // 3. Normalização de Pets
        let normalizedPets: any = 0; 
        if (Array.isArray(stayData.pets)) {
            normalizedPets = stayData.pets; 
        } else {
            normalizedPets = Number(stayData.pets) || 0;
        }

        return {
            id: doc.id,
            
            // Prioridade: Perfil Mestre > Estadia > Temporário
            guestName: guestProfile?.name || stayData.guestName,
            guestPhone: guestProfile?.phone || stayData.guestPhone || stayData.tempGuestPhone,
            email: guestProfile?.email || stayData.email || '',
            guestId: guestProfile?.cpf || guestProfile?.document || stayData.guestId || '',
            
            cabinId: stayData.cabinId,
            cabinName: stayData.cabinName,
            checkInDate: stayData.checkInDate,
            checkOutDate: stayData.checkOutDate,
            guestCount: stayData.guestCount,
            status: stayData.status,
            pets: normalizedPets,
            vehiclePlate: stayData.vehiclePlate || '',
            
            // Endereço do Perfil Mestre
            address: guestProfile?.address || stayData.address || {
                cep: '', street: '', number: '', complement: '', 
                neighborhood: '', city: '', state: '', country: 'Brasil'
            },
            
            isForeigner: guestProfile?.isForeigner || stayData.isForeigner || false,
            country: guestProfile?.country || stayData.country || 'Brasil'
        };

    } catch (error) {
        console.error("Erro critico ao buscar estadia:", error);
        return null;
    }
}