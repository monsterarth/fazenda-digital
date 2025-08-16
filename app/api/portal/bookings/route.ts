// src/app/api/bookings/route.ts

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

            // Realiza todas as operações dentro de uma transação para garantir atomicidade.
            return adminDb.runTransaction(async (transaction) => {
                const normalizedUnitId = bookingData.unitId ?? null;

                // 1. Verifica se o horário está realmente disponível.
                const slotQuery = adminDb.collection('bookings')
                    .where('date', '==', bookingData.date)
                    .where('structureId', '==', bookingData.structureId)
                    .where('unitId', '==', normalizedUnitId)
                    .where('startTime', '==', bookingData.startTime);
                const slotSnapshot = await transaction.get(slotQuery);

                if (!slotSnapshot.empty) {
                    const existingBooking = slotSnapshot.docs[0].data() as Booking;
                    // Lançamos um erro se o slot já estiver ocupado por outra pessoa
                    // ou por um bloqueio de admin (status 'bloqueado').
                    if (existingBooking.stayId !== stayId) {
                        throw new Error("Este horário já está reservado.");
                    }
                }
                
                // 2. Procura e cancela qualquer agendamento existente do mesmo hóspede
                // para a mesma estrutura na mesma data.
                const userExistingBookingQuery = adminDb.collection('bookings')
                    .where('stayId', '==', stayId)
                    .where('date', '==', bookingData.date)
                    .where('structureId', '==', bookingData.structureId);
                const userExistingBookingSnapshot = await transaction.get(userExistingBookingQuery);

                userExistingBookingSnapshot.docs.forEach(doc => {
                    transaction.delete(doc.ref);
                });

                // 3. Cria a nova reserva.
                const newBookingRef = adminDb.collection('bookings').doc();
                const newBooking: Omit<Booking, 'id' | 'createdAt'> = {
                    ...bookingData,
                    unitId: normalizedUnitId,
                    stayId: stayId,
                    guestId: stayId, // Mantendo a consistência de ID do hóspede
                    guestName: stayInfo.guestName,
                    cabinId: stayInfo.cabinName, // Corrigido para `cabinName`
                    createdAt: firestore.FieldValue.serverTimestamp(),
                };
                transaction.set(newBookingRef, newBooking);

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

            // Apenas deleta o agendamento se for do hóspede.
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