import { getFirebaseDb } from '@/lib/firebase';
import { Stay } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// REMOVIDO: A interface StayFromFirestore não é mais necessária,
// pois os dados no Firestore já correspondem ao tipo Stay (com datas como strings).

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
        
        // ==========================================================
        // CORREÇÃO APLICADA AQUI
        // ==========================================================
        // 1. Os dados do Firestore são diretamente atribuídos ao tipo 'Stay',
        //    pois as datas já estão salvas como strings.
        const stayData = { id: stayDoc.id, ...stayDoc.data() } as Stay;

        // 2. O bloco de conversão de Timestamp para string foi removido
        //    porque ele era a causa do erro.
        
        // 3. Retornamos diretamente os dados da estadia.
        return NextResponse.json(stayData, { status: 200 });

    } catch (error) {
        console.error('API LOGIN ERROR:', error);
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
    }
}