'use server'

import { adminDb } from '@/lib/firebase-admin';

export async function getStayByToken(token: string) {
    try {
        // Busca na coleção de estadias onde token == token da URL
        const snapshot = await adminDb.collection('stays')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        console.log(`[GetStayByToken] Dados encontrados para token ${token}:`, data.guestName);

        // Retorna dados prontos para o formulário
        return {
            id: doc.id,
            guestName: data.guestName,
            // Prioriza o telefone do hóspede, senão usa o temporário
            guestPhone: data.guestPhone || data.tempGuestPhone,
            cabinId: data.cabinId,
            cabinName: data.cabinName,
            checkInDate: data.checkInDate,
            checkOutDate: data.checkOutDate,
            guestCount: data.guestCount,
            // IMPORTANTE: Mapeia o guestId como CPF se ele tiver 11 dígitos
            guestId: (data.guestId && data.guestId.length === 11) ? data.guestId : '', 
            email: data.email || '',
            status: data.status
        };

    } catch (error) {
        console.error("Erro ao buscar estadia por token:", error);
        return null;
    }
}