import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin';

export async function POST(request: Request) {
    try {
        // 1. Verify the guest is authenticated via the token in the header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // 2. Ensure the user is a valid guest
        if (!decodedToken.isGuest || !decodedToken.stayId) {
            return NextResponse.json({ error: "Permissão negada. Apenas hóspedes podem responder." }, { status: 403 });
        }
        
        const { responseData } = await request.json();

        if (!responseData || !responseData.surveyId || !responseData.stayId) {
            return NextResponse.json({ error: "Dados da resposta inválidos." }, { status: 400 });
        }

        // 3. Enforce data integrity by using the stayId from the secure token
        const secureResponseData = {
            ...responseData,
            stayId: decodedToken.stayId, // This prevents a user from submitting a survey for another guest
            submittedAt: firestore.FieldValue.serverTimestamp(),
        };
        
        // 4. Save the response to the database with admin privileges
        const responseRef = await adminDb.collection('surveyResponses').add(secureResponseData);

        return NextResponse.json({ success: true, responseId: responseRef.id });

    } catch (error: any) {
        console.error("API Survey Submission Error:", error);
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
    }
}