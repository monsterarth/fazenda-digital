import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const token = body.token;

        // ++ LOG DE DEPURAÇÃO: Isso nos mostrará o valor exato recebido.
        console.log(`[API /auth/guest] Recebido para validação: token = ${token} (tipo: ${typeof token})`);

        // **Validação Definitiva:** Esta verificação impede que um 'undefined' ou qualquer
        // valor inválido chegue ao Firestore.
        if (typeof token !== 'string' || token.length !== 6) {
            console.error("[API /auth/guest] Validação falhou. O token é inválido.");
            return NextResponse.json({ error: "O código de acesso fornecido é inválido." }, { status: 400 });
        }

        const staysRef = adminDb.collection('stays');
        const q = staysRef.where('token', '==', token).where('status', '==', 'active').limit(1);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            console.warn(`[API /auth/guest] Nenhum documento ativo encontrado para o token: ${token}`);
            return NextResponse.json({ error: "Código de acesso inválido ou estadia inativa." }, { status: 403 });
        }

        const stayDoc = querySnapshot.docs[0];
        const stayData = stayDoc.data();
        
        const now = new Date();
        const checkOutDate = new Date(stayData.checkOutDate);
        if (now > checkOutDate) {
            console.warn(`[API /auth/guest] Tentativa de acesso para estadia expirada. ID: ${stayDoc.id}`);
            return NextResponse.json({ error: "Esta hospedagem já foi finalizada." }, { status: 403 });
        }

        const guestUid = `guest_${stayDoc.id}`;
        const customToken = await adminAuth.createCustomToken(guestUid, {
            stayId: stayDoc.id,
            isGuest: true,
        });

        console.log(`[API /auth/guest] Login bem-sucedido para a estadia ID: ${stayDoc.id}`);
        return NextResponse.json({ customToken, stay: { id: stayDoc.id, ...stayData } });

    } catch (error: any) {
        console.error("API LOGIN ERROR:", error);
        return NextResponse.json({ error: "Ocorreu um erro interno. Por favor, tente novamente." }, { status: 500 });
    }
}