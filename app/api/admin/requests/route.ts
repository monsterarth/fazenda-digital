// app/api/admin/requests/route.ts

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { firestore } from 'firebase-admin';
import { GuestRequest } from '@/types'; // Importando o tipo

// Função auxiliar para traduzir o status
const translateStatus = (status: string) => {
    if (status === 'in_progress') return 'Em Andamento';
    if (status === 'completed') return 'Concluída';
    return status;
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Admin não autenticado." }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        // Verifica se é um token de admin
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        if (!decodedToken.admin) { // Garante que apenas admins podem usar esta rota
            return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
        }
        
        // O e-mail do admin logado, para os logs
        const adminEmail = decodedToken.email || 'Admin';
        const adminActor = { type: 'admin' as const, identifier: adminEmail };

        const { action, requestId, newStatus } = await request.json();
        
        if (!action || !requestId) {
            return NextResponse.json({ error: "Ação ou ID da solicitação ausente." }, { status: 400 });
        }

        const requestRef = adminDb.collection('requests').doc(requestId);
        const requestDoc = await requestRef.get();

        if (!requestDoc.exists) {
            return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
        }

        const requestData = requestDoc.data() as GuestRequest;
        const itemDescription = requestData.itemName 
            ? `${requestData.quantity || 1}x ${requestData.itemName}` 
            : (requestData.type === 'cleaning' ? 'Limpeza de Quarto' : 'uma solicitação');
        
        let logType = 'request_updated'; // Tipo padrão
        let logDetails = '';

        // Ação: Atualizar Status (para 'in_progress' ou 'completed')
        if (action === 'update_status') {
            if (!newStatus || !['in_progress', 'completed'].includes(newStatus)) {
                return NextResponse.json({ error: "Novo status inválido." }, { status: 400 });
            }

            await requestRef.update({
                status: newStatus,
                updatedAt: firestore.FieldValue.serverTimestamp()
            });

            // Define o log
            const translated = translateStatus(newStatus);
            logType = newStatus === 'in_progress' ? 'request_in_progress' : 'request_completed';
            logDetails = `Solicitação (${itemDescription}) de ${requestData.guestName} foi movida para "${translated}"`;
        }
        
        // Ação: Deletar Solicitação
        else if (action === 'delete') {
            await requestRef.delete();
            
            // Define o log
            logType = 'request_deleted';
            logDetails = `Solicitação (${itemDescription}) de ${requestData.guestName} foi excluída`;
        }
        
        else {
            return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
        }

        // 3. Criar o Log de Atividade para a ação do admin
        await adminDb.collection('activity_logs').add({
            actor: adminActor,
            type: logType, 
            details: logDetails,
            link: '/admin/solicitacoes',
            timestamp: firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true, message: `Ação '${action}' executada.` });

    } catch (error: any) {
        console.error("Erro na API Admin Requests:", error);
        
        // Verifica se é um erro de token expirado
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
        }
        
        return NextResponse.json({ error: error.message || "Erro interno do servidor." }, { status: 500 });
    }
}