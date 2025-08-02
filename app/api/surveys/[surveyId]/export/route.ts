import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
// Note: You would likely expand this to include more detailed data in a real export
import { SurveyResponse } from '@/types';

export async function GET(
    request: Request,
    { params }: { params: { surveyId: string } }
) {
    const isAdmin = true; // Placeholder for real auth
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initAdminApp();
    const db = getFirestore();
    const surveyId = params.surveyId;

    try {
        // This is a simplified export. A real one would replicate the filtering logic
        // from the results endpoint to provide a consistent dataset.
        const responsesSnap = await db.collection('surveyResponses').where('surveyId', '==', surveyId).get();
        const responses = responsesSnap.docs.map(doc => {
            const data = doc.data() as SurveyResponse;
            // Flatten the data for easier CSV consumption
            const flatData: any = {
                responseId: doc.id,
                stayId: data.stayId,
                submittedAt: data.submittedAt.toDate().toISOString(),
            };
            data.answers.forEach(answer => {
                flatData[answer.questionText || answer.questionId] = Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer;
            });
            return flatData;
        });

        return NextResponse.json(responses);
    } catch (error: any) {
        console.error("Error exporting survey data:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}