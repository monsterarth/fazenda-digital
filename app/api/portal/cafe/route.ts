import { NextResponse, NextRequest } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, updateDoc, query, where, getDocs, Timestamp, limit, writeBatch, doc } from 'firebase/firestore';
import { BreakfastOrder } from '@/types';

export async function POST(req: NextRequest) {
    try {
        const db = await getFirebaseDb();
        if (!db) throw new Error("Database connection failed");

        const body = await req.json();
        const { stayId, deliveryDate, numberOfGuests, individualItems, collectiveItems, generalNotes } = body;
        
        if (!stayId || !deliveryDate || !numberOfGuests) {
            return NextResponse.json({ error: 'Dados do pedido incompletos.' }, { status: 400 });
        }
        
        const ordersCollection = collection(db, 'breakfastOrders');

        // Esta consulta complexa é o motivo pelo qual o índice é necessário
        const q = query(
            ordersCollection, 
            where("stayId", "==", stayId), 
            where("deliveryDate", "==", deliveryDate),
            where("status", "!=", "canceled")
        );

        const existingOrderSnapshot = await getDocs(q);

        const newOrderData: Omit<BreakfastOrder, 'id'> = {
            stayId,
            deliveryDate,
            numberOfGuests,
            individualItems: individualItems || [],
            collectiveItems: collectiveItems || [],
            generalNotes: generalNotes || '',
            status: 'pending',
            createdAt: Timestamp.now(),
        };

        if (!existingOrderSnapshot.empty) {
            const batch = writeBatch(db);
            existingOrderSnapshot.forEach(doc => {
                batch.update(doc.ref, { status: 'canceled' });
            });
            const newOrderRef = doc(collection(db, 'breakfastOrders'));
            batch.set(newOrderRef, newOrderData);
            await batch.commit();
            return NextResponse.json({ success: true, newOrderId: newOrderRef.id, action: 'replaced' }, { status: 201 });
        } else {
            const docRef = await addDoc(ordersCollection, newOrderData);
            return NextResponse.json({ success: true, orderId: docRef.id, action: 'created' }, { status: 201 });
        }

    } catch (error) {
        console.error('API Breakfast Order Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor.';
        return NextResponse.json({ error: 'Erro ao processar o pedido.', details: errorMessage }, { status: 500 });
    }
}