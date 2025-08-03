import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldPath, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { SurveyResponse, Stay, PreCheckIn } from '@/types';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

// Solução de contorno: usando 'any' para o contexto
export async function GET(
    request: NextRequest,
    context: any 
) {
    const isAdmin = true;
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await initAdminApp();
        const db = getFirestore();
        const surveyId = context.params.surveyId; // O acesso continua igual
        const { searchParams } = new URL(request.url);

        const allResponsesSnap = await db.collection('surveyResponses').where('surveyId', '==', surveyId).get();
        if (allResponsesSnap.empty) {
            return NextResponse.json([]);
        }

        let responses = allResponsesSnap.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as SurveyResponse));

        if (searchParams.get('startDate') && searchParams.get('endDate')) {
            const startDate = startOfDay(parseISO(searchParams.get('startDate')!));
            const endDate = endOfDay(parseISO(searchParams.get('endDate')!));
            responses = responses.filter(r => {
                if (!r.submittedAt) return false;
                const submittedAt = (r.submittedAt as Timestamp).toDate();
                return submittedAt >= startDate && submittedAt <= endDate;
            });
        }
        
        if (responses.length === 0) {
            return NextResponse.json([]);
        }
        
        const stayIds = [...new Set(responses.map(r => r.stayId).filter(Boolean))];
        const staysData: Record<string, Stay> = {};
        const preCheckInIds: string[] = [];
        const preCheckInsData: Record<string, PreCheckIn> = {};

        if (stayIds.length > 0) {
            const BATCH_SIZE = 30;
            for (let i = 0; i < stayIds.length; i += BATCH_SIZE) {
                const batchIds = stayIds.slice(i, i + BATCH_SIZE);
                if (batchIds.length > 0) {
                    const staysSnap = await db.collection('stays').where(FieldPath.documentId(), 'in', batchIds).get();
                    staysSnap.forEach((doc: QueryDocumentSnapshot) => {
                        const stay = { id: doc.id, ...doc.data() } as Stay;
                        staysData[doc.id] = stay;
                        if (stay.preCheckInId) {
                            preCheckInIds.push(stay.preCheckInId);
                        }
                    });
                }
            }
        }
        
        const uniquePreCheckInIds = [...new Set(preCheckInIds)];
        if (uniquePreCheckInIds.length > 0) {
             const BATCH_SIZE = 30;
             for (let i = 0; i < uniquePreCheckInIds.length; i += BATCH_SIZE) {
                const batchIds = uniquePreCheckInIds.slice(i, i + BATCH_SIZE);
                 if (batchIds.length > 0) {
                    const preCheckInsSnap = await db.collection('preCheckIns').where(FieldPath.documentId(), 'in', batchIds).get();
                    preCheckInsSnap.forEach((doc: QueryDocumentSnapshot) => {
                        preCheckInsData[doc.id] = { id: doc.id, ...doc.data() } as PreCheckIn;
                    });
                }
            }
        }

        const processedResponses = responses
            .map(response => {
                if (!response.stayId) return null;
                const stay = staysData[response.stayId];
                if (!stay) return null;
                const preCheckIn = stay.preCheckInId ? preCheckInsData[stay.preCheckInId] : null;
                return { ...response, stayInfo: stay, preCheckInInfo: preCheckIn };
            })
            .filter((value): value is NonNullable<typeof value> => value !== null);

        const selectedCabin = searchParams.get('cabin');
        const selectedCountry = searchParams.get('country');
        const selectedState = searchParams.get('state');
        const selectedCity = searchParams.get('city');

        const filteredResponses = processedResponses.filter(pr => {
            if (selectedCabin && pr.stayInfo?.cabinName !== selectedCabin) return false;
            if (selectedCountry && pr.preCheckInInfo?.address?.country !== selectedCountry) return false;
            if (selectedState && pr.preCheckInInfo?.address?.state !== selectedState) return false;
            if (selectedCity && pr.preCheckInInfo?.address?.city !== selectedCity) return false;
            return true;
        });

        const exportData = filteredResponses.map(response => {
            const stay = response.stayInfo;
            const preCheckIn = response.preCheckInInfo;
            const flatData: any = {
                'ID Resposta': response.id,
                'ID Estadia': response.stayId,
                'Data Envio': (response.submittedAt as Timestamp).toDate().toISOString(),
                'Nome Hóspede': stay.guestName,
                'Cabana': stay.cabinName,
                'País': preCheckIn?.address?.country || 'N/A',
                'Estado': preCheckIn?.address?.state || 'N/A',
                'Cidade': preCheckIn?.address?.city || 'N/A',
            };
            (response.answers || []).forEach(answer => {
                const questionText = answer.questionText || answer.questionId;
                flatData[questionText] = Array.isArray(answer.answer) 
                    ? answer.answer.join(', ') 
                    : answer.answer;
            });
            return flatData;
        });

        return NextResponse.json(exportData);

    } catch (error: any) {
        console.error("Error exporting survey data:", error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}