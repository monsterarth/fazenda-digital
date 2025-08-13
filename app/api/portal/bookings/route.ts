import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin';
import { Booking } from '@/types/scheduling';
import { format } from 'date-fns';

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
        const { action, bookingData, bookingIdToCancel } = await request.json();

        if (action === 'create') {
            if (!bookingData || !bookingData.date || !bookingData.structureId || !bookingData.startTime) {
                return NextResponse.json({ error: "Dados do agendamento não fornecidos." }, { status: 400 });
            }

            const stayDoc = await adminDb.collection('stays').doc(stayId).get();
            const stayInfo = stayDoc.data();
            if (!stayInfo) {
                return NextResponse.json({ error: "Estadia não encontrada." }, { status: 404 });
            }

            return adminDb.runTransaction(async (transaction) => {
                // Primeiro, verifica se o slot desejado já está ocupado por outro hóspede.
                const slotQuery = adminDb.collection('bookings')
                    .where('date', '==', bookingData.date)
                    .where('structureId', '==', bookingData.structureId)
                    .where('unitId', '==', bookingData.unitId)
                    .where('startTime', '==', bookingData.startTime)
                    .limit(1);
                const slotSnapshot = await transaction.get(slotQuery);

                if (!slotSnapshot.empty) {
                    const existingBooking = slotSnapshot.docs[0].data() as Booking;
                    // Se o slot já tem um agendamento e o stayId não é o do hóspede atual (e não é um slot de admin)
                    if (existingBooking.stayId !== stayId && existingBooking.stayId !== 'admin') {
                        throw new Error("Este horário já foi reservado por outro hóspede.");
                    }
                    // Se o agendamento existente é um slot de admin, o hóspede pode reservá-lo.
                    // Se é um agendamento do próprio hóspede, ele será sobrescrito.
                    // Não é necessário fazer nada aqui, pois o agendamento anterior será tratado no próximo passo.
                }

                // Em seguida, verifica se o hóspede já possui outro agendamento na mesma estrutura hoje.
                const userExistingBookingQuery = adminDb.collection('bookings')
                    .where('stayId', '==', stayId)
                    .where('date', '==', bookingData.date)
                    .where('structureId', '==', bookingData.structureId)
                    .limit(1);
                const userExistingBookingSnapshot = await transaction.get(userExistingBookingQuery);

                if (!userExistingBookingSnapshot.empty) {
                    // Se o hóspede já tem uma reserva, a exclui antes de criar a nova.
                    // Isso garante que cada hóspede tenha apenas um agendamento por estrutura por dia.
                    const existingBookingDoc = userExistingBookingSnapshot.docs[0];
                    transaction.delete(existingBookingDoc.ref);
                }

                // Cria a nova reserva dentro da transação.
                const newBookingRef = adminDb.collection('bookings').doc();
                const newBooking: Omit<Booking, 'id' | 'createdAt'> = {
                    ...bookingData,
                    stayId: stayId,
                    guestId: stayId,
                    guestName: stayInfo.guestName,
                    cabinId: stayInfo.cabinId,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                };
                transaction.set(newBookingRef, newBooking);

                return NextResponse.json({ success: true, bookingId: newBookingRef.id });
            });

        } else if (action === 'cancel') {
            if (!bookingIdToCancel) {
                return NextResponse.json({ error: "ID do agendamento para cancelar não fornecido." }, { status: 400 });
            }

            const bookingRef = adminDb.collection('bookings').doc(bookingIdToCancel);
            const bookingDoc = await bookingRef.get();

            if (!bookingDoc.exists) {
                return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });
            }

            const booking = bookingDoc.data() as Booking;
            if (booking.stayId !== stayId) {
                return NextResponse.json({ error: "Você não tem permissão para cancelar este agendamento." }, { status: 403 });
            }

            await bookingRef.delete();
            return NextResponse.json({ success: true, message: "Agendamento cancelado com sucesso." });

        } else {
            return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
        }

    } catch (error: any) {
        console.error("API Booking Error:", error);
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
    }
}