import { NextResponse, NextRequest } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { BreakfastOrder } from '@/types';

export async function POST(req: NextRequest) {
    try {
        const db = await getFirebaseDb();
        const body = await req.json();

        // Validação dos dados recebidos no novo formato
        const { stayId, deliveryDate, numberOfGuests, individualItems, collectiveItems, generalNotes } = body;
        
        if (!stayId || !deliveryDate || !numberOfGuests) {
            return NextResponse.json({ error: 'Dados do pedido incompletos.' }, { status: 400 });
        }
        
        // Monta o objeto para salvar no Firestore de acordo com o novo tipo BreakfastOrder
        const orderData: Omit<BreakfastOrder, 'id'> = {
            stayId,
            deliveryDate,
            numberOfGuests,
            individualItems: individualItems || [],
            collectiveItems: collectiveItems || [],
            generalNotes: generalNotes || '',
            status: 'pending',
            createdAt: Timestamp.now(),
        };

        // Adiciona o novo documento na coleção 'breakfastOrders'
        const docRef = await addDoc(collection(db, 'breakfastOrders'), orderData);
        
        return NextResponse.json({ success: true, orderId: docRef.id }, { status: 201 });

    } catch (error) {
        console.error('API Breakfast Order Error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor ao processar o pedido.' }, { status: 500 });
    }
}