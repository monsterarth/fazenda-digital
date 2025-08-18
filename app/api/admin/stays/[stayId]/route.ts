// app/api/admin/stays/[stayId]/route.ts

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { firestore } from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

interface PatchRequestBody {
    action: 'end_stay';
    adminUser: {
        email: string;
        name: string;
    };
}

export async function PATCH(request: NextRequest, { params }: { params: { stayId: string } }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Token de autenticação não fornecido." }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // Verificação crucial: o usuário é um administrador?
        if (!decodedToken.isAdmin) {
            return NextResponse.json({ error: "Acesso negado. Requer privilégios de administrador." }, { status: 403 });
        }

        const { stayId } = params;
        if (!stayId) {
            return NextResponse.json({ error: "ID da estadia não fornecido." }, { status: 400 });
        }

        const { action, adminUser } = (await request.json()) as PatchRequestBody;

        if (action === 'end_stay') {
            const stayRef = adminDb.collection('stays').doc(stayId);
            const stayDoc = await stayRef.get();

            if (!stayDoc.exists) {
                return NextResponse.json({ error: "Estadia não encontrada." }, { status: 404 });
            }
            
            const stayData = stayDoc.data();
            const guestName = stayData?.guestName || 'Hóspede desconhecido';

            // Usando um batch para garantir a atomicidade da operação
            const batch = adminDb.batch();

            // 1. Atualiza o status da estadia para 'checked_out'
            batch.update(stayRef, { 
                status: 'checked_out',
                endedAt: firestore.FieldValue.serverTimestamp(), // Opcional: registrar quando foi encerrada
                endedBy: adminUser.email // Opcional: registrar quem encerrou
            });

            // 2. Cria o log da atividade
            const logRef = adminDb.collection('activity_logs').doc();
            batch.set(logRef, {
                type: 'stay_ended',
                actor: { type: 'admin', identifier: adminUser.email },
                details: `Estadia de ${guestName} encerrada pelo administrador.`,
                link: '/admin/stays',
                timestamp: firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();

            return NextResponse.json({ success: true, message: "Estadia encerrada com sucesso." });
        }

        return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });

    } catch (error: any) {
        console.error("Erro na API Admin Stays:", error);
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
        }
        return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
    }
}