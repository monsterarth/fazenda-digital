import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { Stay } from '@/types';

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token || typeof token !== 'string' || token.length !== 6) {
            return NextResponse.json({ error: 'Token inválido fornecido.' }, { status: 400 });
        }

        // Procura a estadia com o token fornecido que não esteja cancelada
        const staysRef = adminDb.collection('stays');
        const querySnapshot = await staysRef
            .where('token', '==', token)
            .where('status', 'in', ['active', 'checked_out'])
            .limit(1)
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json({ error: 'Estadia não encontrada ou token expirado.' }, { status: 404 });
        }

        const stayDoc = querySnapshot.docs[0];
        const stay = { id: stayDoc.id, ...stayDoc.data() } as Stay;

        // Cria um token de autenticação personalizado com as informações da estadia (claims)
        const customAuthToken = await adminAuth.createCustomToken(stay.id, {
            isGuest: true,
            stayId: stay.id,
        });

        return NextResponse.json({ customToken: customAuthToken, stayId: stay.id });

    } catch (error: any) {
        console.error('Erro na autenticação para pesquisa:', error);
        return NextResponse.json({ error: 'Erro interno do servidor ao tentar autenticar.' }, { status: 500 });
    }
}