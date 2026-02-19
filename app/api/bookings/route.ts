// ARQUIVO: app/api/portal/bookings/route.ts
// (Note: Voltando a criar logs com 'read: false')

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin';
import { Booking } from '@/types/scheduling';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Usuário não autenticado.' },
        { status: 401 },
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken.isGuest || !decodedToken.stayId) {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 });
    }

    const stayId = decodedToken.stayId;
    const { action, bookingData, bookingIdToCancel } = await request.json();

    const stayDoc = await adminDb.collection('stays').doc(stayId).get();
    const stayInfo = stayDoc.data();
    if (!stayInfo) {
      return NextResponse.json(
        { error: 'Estadia não encontrada.' },
        { status: 404 },
      );
    }
    const guestIdentifier =
      stayInfo.guestName || `Hóspede ${stayId.substring(0, 5)}`;
    const guestActor = { type: 'guest' as const, identifier: guestIdentifier };

    // Operação de CRIAR/ATUALIZAR AGENDAMENTO
    if (action === 'create') {
      if (
        !bookingData ||
        !bookingData.date ||
        !bookingData.structureId ||
        !bookingData.startTime
      ) {
        return NextResponse.json(
          { error: 'Dados do agendamento não fornecidos.' },
          { status: 400 },
        );
      }

      return adminDb.runTransaction(async (transaction) => {
        const normalizedUnitId = bookingData.unitId ?? null;

        const slotQuery = adminDb
          .collection('bookings')
          .where('date', '==', bookingData.date)
          .where('structureId', '==', bookingData.structureId)
          .where('unitId', '==', normalizedUnitId)
          .where('startTime', '==', bookingData.startTime);
        const slotSnapshot = await transaction.get(slotQuery);

        if (!slotSnapshot.empty) {
          const existingBooking = slotSnapshot.docs[0].data() as Booking;
          if (existingBooking.stayId !== stayId) {
            throw new Error('Este horário já está reservado.');
          }
        }

        const userExistingBookingQuery = adminDb
          .collection('bookings')
          .where('stayId', '==', stayId)
          .where('date', '==', bookingData.date)
          .where('structureId', '==', bookingData.structureId);
        const userExistingBookingSnapshot = await transaction.get(
          userExistingBookingQuery,
        );

        userExistingBookingSnapshot.docs.forEach((doc) => {
          transaction.delete(doc.ref);
        });

        const newBookingRef = adminDb.collection('bookings').doc();
        const newBooking: Omit<Booking, 'id' | 'createdAt'> = {
          ...bookingData,
          unitId: normalizedUnitId,
          stayId: stayId,
          guestId: stayId,
          guestName: stayInfo.guestName,
          cabinId: stayInfo.cabinName,
        };
        transaction.set(newBookingRef, {
          ...newBooking,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

        const formattedDate = format(
          parseISO(bookingData.date + 'T' + bookingData.startTime),
          "dd/MM 'às' HH:mm",
          { locale: ptBR },
        );

        let logType = '';
        let logDetails = '';

        const isChange = !userExistingBookingSnapshot.empty;
        const isAutomatic = bookingData.status === 'confirmado';

        if (isChange) {
          logType = 'booking_changed_by_guest';
          logDetails = `Hóspede ${guestIdentifier} (${stayInfo.cabinName}) *alterou* seu agendamento de ${bookingData.structureName} para ${formattedDate}`;
        } else if (isAutomatic) {
          logType = 'booking_confirmed';
          logDetails = `Hóspede ${guestIdentifier} (${stayInfo.cabinName}) *agendou e confirmou* ${bookingData.structureName} para ${formattedDate}`;
        } else {
          logType = 'booking_requested';
          logDetails = `Hóspede ${guestIdentifier} (${stayInfo.cabinName}) *solicitou* ${bookingData.structureName} para ${formattedDate}`;
        }

        const logRef = adminDb.collection('activity_logs').doc();
        transaction.set(logRef, {
          actor: guestActor,
          type: logType,
          details: logDetails,
          link: '/admin/agendamentos',
          timestamp: firestore.FieldValue.serverTimestamp(),
          // --- A CORREÇÃO ESTÁ AQUI (REVERTENDO) ---
          read: false, // <-- Deve ser 'false' para a Solução Robusta
        });
        // --- FIM DA CORREÇÃO ---

        return NextResponse.json({
          success: true,
          bookingId: newBookingRef.id,
        });
      });

      // Operação de CANCELAR AGENDAMENTO
    } else if (action === 'cancel') {
      if (!bookingIdToCancel) {
        return NextResponse.json(
          { error: 'ID do agendamento para cancelar não fornecido.' },
          { status: 400 },
        );
      }

      const bookingRef = adminDb
        .collection('bookings')
        .doc(bookingIdToCancel);

      return adminDb.runTransaction(async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);

        if (!bookingDoc.exists) {
          throw new Error('Agendamento não encontrado.');
        }

        const booking = bookingDoc.data() as Booking;
        if (booking.stayId !== stayId) {
          throw new Error(
            'Você não tem permissão para cancelar este agendamento.',
          );
        }

        transaction.delete(bookingRef);

        const formattedDate = format(
          parseISO(booking.date + 'T' + booking.startTime),
          "dd/MM 'às' HH:mm",
          { locale: ptBR },
        );
        const logDetails = `Hóspede ${guestIdentifier} cancelou o agendamento: ${booking.structureName} de ${formattedDate}`;

        const logRef = adminDb.collection('activity_logs').doc();
        transaction.set(logRef, {
          actor: guestActor,
          type: 'booking_cancelled_by_guest',
          details: logDetails,
          link: '/admin/agendamentos',
          timestamp: firestore.FieldValue.serverTimestamp(),
          // --- A CORREÇÃO ESTÁ AQUI (REVERTENDO) ---
          read: false, // <-- Deve ser 'false' para a Solução Robusta
        });

        return NextResponse.json({
          success: true,
          message: 'Agendamento cancelado com sucesso.',
        });
      });
    } else {
      return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('ERRO [API /portal/bookings]:', error);

    return NextResponse.json(
      {
        error: error.message || 'Erro interno do servidor.',
        details: error.stack || 'Sem stack disponível',
      },
      { status: 500 },
    );
  }
}