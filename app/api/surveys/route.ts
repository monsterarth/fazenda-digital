import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin';

export async function POST(request: Request) {
    try {
        // 1. Verifica se o usuário está autenticado via token no cabeçalho
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // 2. Garante que o usuário é um hóspede válido
        if (!decodedToken.isGuest || !decodedToken.stayId) {
            return NextResponse.json({ error: "Permissão negada. Apenas hóspedes podem responder." }, { status: 403 });
        }
        
        const { responseData } = await request.json();

        if (!responseData || !responseData.surveyId || !responseData.stayId) {
            return NextResponse.json({ error: "Dados da resposta inválidos." }, { status: 400 });
        }

        // 3. Força que a resposta seja associada ao stayId do token, evitando fraudes
        const secureResponseData = {
            ...responseData,
            stayId: decodedToken.stayId, // Garante a integridade dos dados
            submittedAt: firestore.FieldValue.serverTimestamp(), // Usa o timestamp do servidor
        };
        
        // 4. Salva a resposta no banco de dados com privilégios de administrador
        const responseRef = await adminDb.collection('surveyResponses').add(secureResponseData);

        // ++ INÍCIO DA CORREÇÃO: Cria o log de atividade após salvar a resposta ++
        try {
            // Busca o nome do hóspede e o título da pesquisa para um log mais detalhado
            const stayDoc = await adminDb.collection('stays').doc(decodedToken.stayId).get();
            const surveyDoc = await adminDb.collection('surveys').doc(responseData.surveyId).get();

            const guestName = stayDoc.exists ? stayDoc.data()?.guestName : 'Hóspede';
            const surveyTitle = surveyDoc.exists ? surveyDoc.data()?.title : 'uma pesquisa';

            await adminDb.collection('activity_logs').add({
                type: 'survey_submitted',
                actor: { type: 'guest', identifier: guestName },
                details: `Nova avaliação para "${surveyTitle}" recebida de ${guestName}.`,
                link: `/admin/pesquisas/${responseData.surveyId}/resultados`,
                timestamp: firestore.FieldValue.serverTimestamp()
            });
        } catch (logError) {
            // Se a criação do log falhar, não impede o sucesso da operação principal
            console.error("Falha ao criar log de atividade para avaliação:", logError);
        }
        // ++ FIM DA CORREÇÃO ++

        return NextResponse.json({ success: true, responseId: responseRef.id });

    } catch (error: any) {
        console.error("API Survey Submission Error:", error);
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
    }
}