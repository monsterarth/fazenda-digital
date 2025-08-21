// app/api/admin/guests/route.ts

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; // Usando o Admin SDK
import { Guest } from '@/types/guest';

// NENHUM import de 'firebase/firestore' aqui

export async function GET() {
    try {
        // Usando os métodos do Admin SDK diretamente
        const guestsRef = adminDb.collection('guests');
        const q = guestsRef.orderBy('name', 'asc');
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return NextResponse.json([]);
        }

        const guests: Guest[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Guest));

        return NextResponse.json(guests);

    } catch (error) {
        console.error("Erro ao buscar hóspedes:", error);
        return new NextResponse("Erro interno do servidor ao buscar hóspedes.", { status: 500 });
    }
}