import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { firestore } from 'firebase-admin';

export async function POST(
    request: NextRequest,
    { params }: { params: { surveyId: string } }
) {
    try {
        const { surveyId } = params;
        const { stayId, answers } = await request.json();

        // 1. Authenticate the user via the token sent in the header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // 2. Verify that the token belongs to the correct guest for this stay
        if (!decodedToken.isGuest || decodedToken.stayId !== stayId) {
            return NextResponse.json({ error: "Permissão negada. A sessão não corresponde à estadia." }, { status: 403 });
        }

        // 3. Prepare the data to be saved securely
        const responseData = {
            surveyId: surveyId,
            stayId: stayId, // Use the validated stayId from the token
            submittedAt: firestore.FieldValue.serverTimestamp(),
            answers: answers,
        };

        // 4. Save the data using the Admin SDK, which bypasses security rules
        await adminDb.collection('surveyResponses').add(responseData);

        return NextResponse.json({ success: true, message: "Resposta enviada com sucesso." });

    } catch (error: any) {
        console.error("API Survey Submission Error:", error);
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
    }
}