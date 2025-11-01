// app/api/portal/requests/route.ts

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin'; 
import { GuestRequest } from '@/types'; 

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        if (!decodedToken.isGuest || !decodedToken.stayId) {
            return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
        }

        const stayId = decodedToken.stayId;
        const { action, requestData, requestIdToCancel } = await request.json();

        const stayDoc = await adminDb.collection('stays').doc(stayId).get();
        if (!stayDoc.exists) {
            return NextResponse.json({ error: "Estadia não encontrada." }, { status: 404 });
        }
        const stayInfo = stayDoc.data();

        if (!stayInfo) {
            console.error(`[API /portal/requests] Não foi possível encontrar dados (data) para a estadia: ${stayId}`);
            return NextResponse.json({ error: "Dados da estadia não encontrados." }, { status: 404 });
        }

        const guestIdentifier = stayInfo.guestName || `Hóspede ${stayId.substring(0, 5)}`;
        const guestActor = { type: 'guest' as const, identifier: guestIdentifier };

        // Ação: Criar Solicitação
        if (action === 'create') {
            if (!requestData || !requestData.type) {
                return NextResponse.json({ error: "Dados da solicitação inválidos." }, { status: 400 });
            }

            return adminDb.runTransaction(async (transaction) => {
                const newRequestRef = adminDb.collection('requests').doc();
                const newRequest: Omit<GuestRequest, 'id' | 'createdAt' | 'updatedAt'> = {
                    ...requestData,
                    stayId: stayId,
                    guestName: stayInfo.guestName, 
                    cabinName: stayInfo.cabinName, 
                    status: 'pending',
                };
                transaction.set(newRequestRef, {
                    ...newRequest,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                });

                const details = requestData.type === 'item'
                    ? `Hóspede ${guestIdentifier} (${stayInfo.cabinName}) solicitou ${requestData.quantity || 1}x ${requestData.itemName}`
                    : `Hóspede ${guestIdentifier} (${stayInfo.cabinName}) solicitou ${requestData.type === 'cleaning' ? 'Limpeza de Quarto' : 'Outro serviço'}`;
                
                const logRef = adminDb.collection('activity_logs').doc();
                transaction.set(logRef, {
                    actor: guestActor,
                    type: 'request_created', 
                    details: details,
                    link: '/admin/solicitacoes',
                    timestamp: firestore.FieldValue.serverTimestamp()
                });

                // A transação só retorna se AMBAS as escritas (request e log) funcionarem
                return NextResponse.json({ success: true, requestId: newRequestRef.id });
            });
        }

        // Ação: Cancelar Solicitação
        if (action === 'cancel') {
            if (!requestIdToCancel) {
                return NextResponse.json({ error: "ID da solicitação não fornecido." }, { status: 400 });
            }

            const requestRef = adminDb.collection('requests').doc(requestIdToCancel);

            return adminDb.runTransaction(async (transaction) => {
                const requestDoc = await transaction.get(requestRef);
                if (!requestDoc.exists) {
                    throw new Error("Solicitação não encontrada.");
                }
                if (requestDoc.data()?.stayId !== stayId) {
                    throw new Error("Permissão negada.");
                }

                transaction.update(requestRef, {
                    status: 'canceled',
                    updatedAt: firestore.FieldValue.serverTimestamp()
                });

                const itemDescription = requestDoc.data()?.itemName || (requestDoc.data()?.type === 'cleaning' ? 'Limpeza' : 'uma solicitação');
                const logRef = adminDb.collection('activity_logs').doc();
                transaction.set(logRef, {
                    actor: guestActor,
                    type: 'request_cancelled', 
                    details: `Hóspede ${guestIdentifier} cancelou: ${itemDescription}`,
                    link: '/admin/solicitacoes',
                    timestamp: firestore.FieldValue.serverTimestamp()
                });

                return NextResponse.json({ success: true, message: "Solicitação cancelada." });
            });
        }

        return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });

    } catch (error: any) {
        console.error("ERRO [API /portal/requests]:", error);
        
        // ++ INÍCIO DA MUDANÇA (DEBUG) ++
        // Retorna a MENSAGEM DE ERRO REAL para o cliente
        return NextResponse.json({ 
            error: error.message || "Erro interno do servidor.",
            details: error.stack || "Sem stack disponível"
        }, { status: 500 });
        // ++ FIM DA MUDANÇA (DEBUG) ++
    }
}