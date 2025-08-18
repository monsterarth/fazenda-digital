import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin';

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
        const { orderData, existingOrderId } = await request.json();

        if (!orderData) {
            return NextResponse.json({ error: "Dados do pedido não fornecidos." }, { status: 400 });
        }
        
        const ordersRef = adminDb.collection('breakfastOrders');
        
        if (existingOrderId) {
            await ordersRef.doc(existingOrderId).delete();
        }

        const newOrder = {
            ...orderData,
            stayId: stayId,
            createdAt: firestore.FieldValue.serverTimestamp(),
        };

        const newOrderRef = await ordersRef.add(newOrder);

        // ++ INÍCIO DA CORREÇÃO: Adiciona o log de atividade no backend ++
        await adminDb.collection('activity_logs').add({
            type: 'cafe_ordered',
            actor: { type: 'guest', identifier: orderData.guestName || 'Hóspede' },
            details: `Novo pedido de café de ${orderData.guestName || 'Hóspede'}.`,
            link: '/admin/pedidos/cafe',
            timestamp: firestore.FieldValue.serverTimestamp()
        });
        // ++ FIM DA CORREÇÃO ++

        return NextResponse.json({ success: true, orderId: newOrderRef.id });

    } catch (error: any) {
        console.error("API Breakfast Order Error:", error);
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
    }
}