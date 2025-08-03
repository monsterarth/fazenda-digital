import { getFirebaseDb } from '@/lib/firebase';
import { Stay } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const db = await getFirebaseDb();
        const { token } = await req.json();

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }
        
        const upperCaseToken = token.toUpperCase();
        const staysCollection = collection(db, 'stays');
        
        const q = query(
            staysCollection, 
            where("token", "==", upperCaseToken)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
        }

        const stayDoc = querySnapshot.docs[0];
        const stayData = { id: stayDoc.id, ...stayDoc.data() } as Stay;

        return NextResponse.json(stayData, { status: 200 });

    } catch (error) {
        console.error('LOGIN API ERROR:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}