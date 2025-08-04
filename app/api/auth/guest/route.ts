import { getFirebaseDb } from '@/lib/firebase'; // CORREÇÃO: Importação corrigida
import { Stay } from '@/types';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

interface StayFromFirestore extends Omit<Stay, 'checkInDate' | 'checkOutDate' | 'createdAt'> {
    checkInDate: Timestamp;
    checkOutDate: Timestamp;
    createdAt: Timestamp;
}

export async function POST(req: NextRequest) {
    try {
        const db = await getFirebaseDb();
        const { token } = await req.json();

        if (!token || typeof token !== 'string' || token.length < 6) {
            return NextResponse.json({ error: 'Token inválido ou incompleto.' }, { status: 400 });
        }

        const upperCaseToken = token.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const formattedToken = `${upperCaseToken.slice(0, 3)}-${upperCaseToken.slice(3)}`;
        
        const staysCollection = collection(db, 'stays');
        const q = query(staysCollection, where("token", "==", formattedToken));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ error: 'Token inválido ou não encontrado.' }, { status: 404 });
        }

        const stayDoc = querySnapshot.docs[0];
        const stayDataFromFirestore = { id: stayDoc.id, ...stayDoc.data() } as StayFromFirestore;

        const serializableStayData: Stay = {
            ...stayDataFromFirestore,
            checkInDate: stayDataFromFirestore.checkInDate.toDate().toISOString(),
            checkOutDate: stayDataFromFirestore.checkOutDate.toDate().toISOString(),
            createdAt: stayDataFromFirestore.createdAt.toDate().toISOString(),
        };
        
        return NextResponse.json(serializableStayData, { status: 200 });

    } catch (error) {
        console.error('API LOGIN ERROR:', error);
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
    }
}