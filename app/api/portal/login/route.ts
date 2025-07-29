import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdminApp } from '@/lib/firebase-admin';
import { Stay } from '@/types';

// Rota para o método POST
export async function POST(request: Request) {
  // Garante que o Firebase Admin esteja inicializado
  await initAdminApp();
  const db = getFirestore();

  try {
    const { token } = await request.json();

    // Validação básica do input
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    // Busca na coleção 'stays' por um documento com o token correspondente e status 'active'
    const staysRef = db.collection('stays');
    const q = staysRef.where('token', '==', token.toUpperCase().trim()).where('status', '==', 'active').limit(1);
    
    const snapshot = await q.get();

    // Se nenhum documento for encontrado, o token é inválido ou a estadia não está ativa
    if (snapshot.empty) {
      return NextResponse.json({ error: 'Token não encontrado ou estadia não está ativa.' }, { status: 404 });
    }
    
    const stayDoc = snapshot.docs[0];
    const stayData = { id: stayDoc.id, ...stayDoc.data() } as Stay;

    // Converte os Timestamps do Firestore para um formato serializável (ISO string) antes de enviar ao cliente
    const serializableStay = {
        ...stayData,
        checkInDate: (stayData.checkInDate as any).toDate().toISOString(),
        checkOutDate: (stayData.checkOutDate as any).toDate().toISOString(),
        createdAt: (stayData.createdAt as any).toDate().toISOString(),
    }

    return NextResponse.json(serializableStay);

  } catch (error: any) {
    console.error("Error validating token:", error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}