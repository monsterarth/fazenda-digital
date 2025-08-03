import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp, FieldPath, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { Survey, SurveyResponse, Stay, SurveyQuestion, PreCheckIn } from '@/types';
import { startOfDay, endOfDay, parseISO, format } from 'date-fns';

// Correção na assinatura da função GET
export async function GET(
    request: NextRequest,
    context: { params: { surveyId: string } }
) {
    const isAdmin = true;
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await initAdminApp();
        const db = getFirestore();
        const surveyId = context.params.surveyId;
        const { searchParams } = new URL(request.url);

        const surveyRef = db.doc(`surveys/${surveyId}`);
        const surveySnap = await surveyRef.get();
        if (!surveySnap.exists) {
            return NextResponse.json({ error: 'Pesquisa não encontrada' }, { status: 404 });
        }
        const survey = { id: surveySnap.id, ...surveySnap.data() } as Survey;
        const questionsSnap = await surveyRef.collection('questions').orderBy('position').get();
        survey.questions = questionsSnap.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as SurveyQuestion));

        const allResponsesSnap = await db.collection('surveyResponses').where('surveyId', '==', surveyId).get();
        
        const emptyResults = { 
            results: { totalResponses: 0, nps: { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 }, overallAverage: 0, averageByCategory: [], textFeedback: {}, satisfactionOverTime: [], insights: {} }, 
            filters: { cabins: [], countries: [], states: [], cities: [] } 
        };

        if (allResponsesSnap.empty) {
            return NextResponse.json(emptyResults);
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
            return NextResponse.json(emptyResults);
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

        if (filteredResponses.length === 0) {
             return NextResponse.json(emptyResults);
        }

        const allAnswers = filteredResponses.flatMap(r => r.answers?.map(a => ({ ...a, stayInfo: r.stayInfo, submittedAt: r.submittedAt })) || []);
        
        const ratingQuestions = survey.questions.filter(q => q.type === 'rating_5_stars');
        const allRatings = allAnswers.filter(a => a && ratingQuestions.some(q => q.id === a.questionId));
        const overallSum = allRatings.reduce((sum, ans) => sum + Number(ans.answer || 0), 0);
        const overallAverage = allRatings.length > 0 ? overallSum / allRatings.length : 0;

        const npsQuestion = survey.questions.find(q => q.type === 'nps_0_10');
        const npsAnswers = npsQuestion ? allAnswers.filter(a => a && a.questionId === npsQuestion.id) : [];
        const promoters = npsAnswers.filter(a => Number(a.answer) >= 9).length;
        const passives = npsAnswers.filter(a => Number(a.answer) >= 7 && Number(a.answer) <= 8).length;
        const detractors = npsAnswers.filter(a => Number(a.answer) <= 6).length;
        const npsTotal = promoters + passives + detractors;
        const npsScore = npsTotal > 0 ? Math.round(((promoters - detractors) / npsTotal) * 100) : 0;

        const categoryAverages: Record<string, { sum: number; count: number }> = {};
        allRatings.forEach(ans => {
            const question = ratingQuestions.find(q => q.id === ans.questionId);
            if (question?.categoryName) {
                if (!categoryAverages[question.categoryName]) {
                    categoryAverages[question.categoryName] = { sum: 0, count: 0 };
                }
                categoryAverages[question.categoryName].sum += Number(ans.answer || 0);
                categoryAverages[question.categoryName].count++;
            }
        });
        const averageByCategory = Object.entries(categoryAverages).map(([category, data]) => ({
            category,
            average: data.count > 0 ? data.sum / data.count : 0
        }));

        const sortedCategories = [...averageByCategory].sort((a, b) => b.average - a.average);
        const insights = {
            strongest: sortedCategories.length > 0 ? sortedCategories[0] : undefined,
            weakest: sortedCategories.length > 0 ? sortedCategories[sortedCategories.length - 1] : undefined,
        };

        const textQuestions = survey.questions.filter(q => q.type === 'text' || q.type === 'comment_box');
        const textFeedback: Record<string, { text: string; guestName: string; cabinName: string }[]> = {};
        textQuestions.forEach(question => {
            const questionAnswers = allAnswers
                .filter(a => a && a.questionId === question.id && a.answer && a.stayInfo)
                .map(a => ({
                    text: String(a.answer),
                    guestName: a.stayInfo.guestName,
                    cabinName: a.stayInfo.cabinName,
                }));
            if (questionAnswers.length > 0) {
                textFeedback[question.text] = questionAnswers;
            }
        });

        const satisfactionByDate: Record<string, { sum: number; count: number }> = {};
        allRatings.forEach(ans => {
            if (ans.submittedAt && (ans.submittedAt as Timestamp).toDate) {
                const dateStr = format((ans.submittedAt as Timestamp).toDate(), 'yyyy-MM-dd');
                if (!satisfactionByDate[dateStr]) {
                    satisfactionByDate[dateStr] = { sum: 0, count: 0 };
                }
                satisfactionByDate[dateStr].sum += Number(ans.answer || 0);
                satisfactionByDate[dateStr].count++;
            }
        });
        const satisfactionOverTime = Object.entries(satisfactionByDate).map(([date, data]) => ({
            date,
            averageRating: data.count > 0 ? data.sum / data.count : 0
        })).sort((a,b) => a.date.localeCompare(b.date));

        const results = {
            totalResponses: filteredResponses.length,
            overallAverage,
            nps: { score: npsScore, promoters, passives, detractors, total: npsTotal },
            averageByCategory,
            textFeedback,
            satisfactionOverTime,
            insights
        };

        const allStaysWithPreCheckIn = Object.values(staysData)
            .map(stay => ({ ...stay, preCheckInInfo: stay.preCheckInId ? preCheckInsData[stay.preCheckInId] : null }))
            .filter(item => item.preCheckInInfo && item.preCheckInInfo.address);

        const filters = {
            cabins: [...new Set(allStaysWithPreCheckIn.map(s => s.cabinName).filter(Boolean))],
            countries: [...new Set(allStaysWithPreCheckIn.map(s => s.preCheckInInfo!.address.country).filter(Boolean))],
            states: [...new Set(allStaysWithPreCheckIn.map(s => s.preCheckInInfo!.address.state).filter(Boolean))],
            cities: [...new Set(allStaysWithPreCheckIn.map(s => s.preCheckInInfo!.address.city).filter(Boolean))],
        };
        
        return NextResponse.json({ results, filters });

    } catch (error: any) {
        console.error("Error fetching survey results:", error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}