//app/api/bookings/route.ts

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin';
import { Booking } from '@/types/scheduling';

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

        // Operação de CRIAR/ATUALIZAR AGENDAMENTO
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
                const normalizedUnitId = bookingData.unitId ?? null;

                // 1. Verifica disponibilidade
                const slotQuery = adminDb.collection('bookings')
                    .where('date', '==', bookingData.date)
                    .where('structureId', '==', bookingData.structureId)
                    .where('unitId', '==', normalizedUnitId)
                    .where('startTime', '==', bookingData.startTime);
                const slotSnapshot = await transaction.get(slotQuery);

                if (!slotSnapshot.empty) {
                    const existingBooking = slotSnapshot.docs[0].data() as Booking;
                    if (existingBooking.stayId !== stayId) {
                        throw new Error("Este horário já está reservado.");
                    }
                }
                
                // 2. Cancela agendamentos existentes do mesmo hóspede para o mesmo serviço/data
                const userExistingBookingQuery = adminDb.collection('bookings')
                    .where('stayId', '==', stayId)
                    .where('date', '==', bookingData.date)
                    .where('structureId', '==', bookingData.structureId);
                const userExistingBookingSnapshot = await transaction.get(userExistingBookingQuery);

                userExistingBookingSnapshot.docs.forEach(doc => {
                    transaction.delete(doc.ref);
                });

                // 3. Cria a nova reserva
                const newBookingRef = adminDb.collection('bookings').doc();
                
                // Objeto do novo agendamento com a correção
                const newBooking = {
                    ...bookingData,
                    unitId: normalizedUnitId,
                    stayId: stayId,
                    guestId: stayId, // Ajustar se guestId for diferente de stayId
                    guestName: stayInfo.guestName,
                    cabinName: stayInfo.cabinName, // Corrigido de 'cabinId' para 'cabinName' para corresponder ao valor
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    confirmationSentAt: null, // <-- CORREÇÃO APLICADA AQUI
                };

                // Remove o campo 'id' se ele estiver vindo do frontend para evitar erro
                if ('id' in newBooking) {
                    delete newBooking.id;
                }

                transaction.set(newBookingRef, newBooking);

                // ++ INÍCIO DA CORREÇÃO: Cria o log de atividade na mesma transação ++
                const logRef = adminDb.collection('activity_logs').doc();
                transaction.set(logRef, {
                    type: 'booking_requested',
                    actor: { type: 'guest', identifier: stayInfo.guestName },
                    details: `Agendamento de ${bookingData.structureName} solicitado por ${stayInfo.guestName}.`,
                    link: '/admin/agendamentos',
                    timestamp: firestore.FieldValue.serverTimestamp()
                });
                // ++ FIM DA CORREÇÃO ++

                return NextResponse.json({ success: true, bookingId: newBookingRef.id });
            });

        // Operação de CANCELAR AGENDAMENTO
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

            // ++ INÍCIO DA CORREÇÃO: Cria o log antes de deletar ++
            await adminDb.collection('activity_logs').add({
                type: 'booking_cancelled_by_guest',
                actor: { type: 'guest', identifier: booking.guestName },
                details: `Agendamento de ${booking.structureName} foi cancelado pelo hóspede.`,
                link: '/admin/agendamentos',
                timestamp: firestore.FieldValue.serverTimestamp()
            });
            // ++ FIM DA CORREÇÃO ++

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