'use server'

import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { Wedding } from '@/types/wedding'
import { headers } from 'next/headers'

// (A função checkAdminRole() que você talvez tenha,
// ou a verificação de segurança da página,
// deve proteger estas actions)

// O tipo de dados que já tínhamos
export interface WeddingData extends Omit<Wedding, 'createdAt' | 'updatedAt' | 'weddingDate' | 'checkInDate' | 'checkOutDate'> {
  id: string
  // Datas são serializadas como string
  weddingDate: string
  checkInDate: string
  checkOutDate: string
  createdAt: string
  updatedAt: string
}

// Função auxiliar para converter o documento do Firestore
const serializeWedding = (doc: FirebaseFirestore.DocumentSnapshot): WeddingData => {
  const data = doc.data() as Wedding
  if (!data) {
    throw new Error('Document data is empty.')
  }
  
  return {
    ...data,
    id: doc.id,
    // Converte Timestamps para strings ISO
    // As datas do formulário já são strings YYYY-MM-DD
    weddingDate: data.weddingDate,
    checkInDate: data.checkInDate,
    checkOutDate: data.checkOutDate,
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString(),
  }
}

// Ação 1: Obter todos os casamentos (Já tínhamos)
export async function getWeddings(): Promise<WeddingData[]> {
  try {
    const weddingsRef = adminDb.collection('weddings')
    const snapshot = await weddingsRef.where('isConfirmed', '==', true).orderBy('weddingDate', 'asc').get()

    if (snapshot.empty) {
      return []
    }

    const weddings: WeddingData[] = snapshot.docs.map(serializeWedding)
    return weddings
    
  } catch (error) {
    console.error('Erro ao buscar casamentos:', error)
    return []
  }
}

// ++ INÍCIO DA ADIÇÃO ++
// Ação 2: Obter um casamento específico pelo ID
export async function getWeddingById(id: string): Promise<WeddingData | null> {
  try {
    const weddingRef = adminDb.collection('weddings').doc(id)
    const doc = await weddingRef.get()

    if (!doc.exists) {
      console.warn(`Casamento com ID ${id} não encontrado.`)
      return null
    }

    return serializeWedding(doc)

  } catch (error) {
    console.error(`Erro ao buscar casamento ${id}:`, error)
    return null
  }
}
// ++ FIM DA ADIÇÃO ++