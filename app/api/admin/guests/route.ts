// app/api/admin/guests/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { Guest } from '@/types/guest';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export async function GET() {
    try {
        const guestsRef = collection(db, 'guests');
        const q = query(guestsRef, orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);

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