import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { cpf } = body;

        if (!cpf) {
            return NextResponse.json({ error: 'CPF não fornecido' }, { status: 400 });
        }

        const cleanCpf = cpf.replace(/\D/g, '');
        
        let guestData: any = null;

        // 1. Busca Direta (Mais confiável)
        const docRef = await adminDb.collection('guests').doc(cleanCpf).get();
        if (docRef.exists) {
            guestData = docRef.data();
        } 
        
        // 2. Busca por Campo CPF (Fallback)
        if (!guestData) {
            const querySnap = await adminDb.collection('guests')
                .where('cpf', '==', cleanCpf)
                .limit(1)
                .get();
            if (!querySnap.empty) {
                guestData = querySnap.docs[0].data();
            }
        }

        // 3. Busca por Campo Document (Legado)
        if (!guestData) {
             const querySnap = await adminDb.collection('guests')
                .where('document', '==', cleanCpf)
                .limit(1)
                .get();
            if (!querySnap.empty) {
                guestData = querySnap.docs[0].data();
            }
        }

        if (guestData) {
            return NextResponse.json({
                name: guestData.name,
                phone: guestData.phone,
                email: guestData.email,
                id: cleanCpf
            });
        }

        return NextResponse.json(null);

    } catch (error) {
        console.error('[API LOOKUP] Erro:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}