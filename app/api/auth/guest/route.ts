import { getFirebaseDb } from '@/lib/firebase';
import { Stay } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const db = await getFirebaseDb();
        const { token } = await req.json();

        // ## INÍCIO DA CORREÇÃO: Validação para o novo token numérico ##
        if (!token || typeof token !== 'string' || !/^\d{6}$/.test(token)) {
            return NextResponse.json({ error: 'Token inválido. Use o código de 6 números.' }, { status: 400 });
        }
        // ## FIM DA CORREÇÃO ##

        const staysCollection = collection(db, 'stays');

        // ## INÍCIO DA CORREÇÃO: Query agora busca pelo token numérico exato ##
        // A formatação para "ABC-123" foi removida.
        const q = query(staysCollection, where("token", "==", token));
        // ## FIM DA CORREÇÃO ##
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json({ error: 'Token inválido ou não encontrado.' }, { status: 404 });
        }

        const stayDoc = querySnapshot.docs[0];
        
        const stayData = { id: stayDoc.id, ...stayDoc.data() } as Stay;

        return NextResponse.json(stayData, { status: 200 });

    } catch (error) {
        console.error('API LOGIN ERROR:', error);
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
    }
}