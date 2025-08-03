import { getFirebaseDb } from '@/lib/firebase';
import { Stay } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// Lista de origens permitidas
const allowedOrigins = [
    'http://localhost:3000',
    'https://fazenda-digital-g9bo.vercel.app',
    // Adicione aqui outros domínios de produção ou staging se necessário
];

// Função para adicionar os cabeçalhos CORS a uma resposta
function addCorsHeaders(response: NextResponse) {
    // Permite todas as origens da lista
    response.headers.set('Access-Control-Allow-Origin', '*'); // Para simplificar, pode usar '*', mas a lista acima é mais segura
    response.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, PUT');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

// Handler para o pedido OPTIONS (preflight)
export async function OPTIONS(req: NextRequest) {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response);
}


// Handler para o pedido POST
export async function POST(req: NextRequest) {
    try {
        const db = await getFirebaseDb();
        const { token } = await req.json();

        if (!token || typeof token !== 'string') {
            const errorResponse = NextResponse.json({ error: 'Token is required' }, { status: 400 });
            return addCorsHeaders(errorResponse);
        }
        
        const upperCaseToken = token.toUpperCase();
        const staysCollection = collection(db, 'stays');
        
        const q = query(
            staysCollection, 
            where("token", "==", upperCaseToken)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const errorResponse = NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
            return addCorsHeaders(errorResponse);
        }

        const stayDoc = querySnapshot.docs[0];
        const stayData = { id: stayDoc.id, ...stayDoc.data() } as Stay;

        const successResponse = NextResponse.json(stayData, { status: 200 });
        return addCorsHeaders(successResponse);

    } catch (error) {
        console.error('LOGIN API ERROR:', error);
        const errorResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        return addCorsHeaders(errorResponse);
    }
}