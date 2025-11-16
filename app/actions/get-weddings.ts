'use server'

import { adminDb } from '@/lib/firebase-admin'
import { Wedding, WeddingTask } from '@/types/wedding' // Importamos os tipos Corretos
import { unstable_noStore as noStore } from 'next/cache'

// Esta interface agora funciona, pois o tipo base 'Wedding' foi corrigido
export interface WeddingData extends Omit<Wedding, 'createdAt' | 'updatedAt' | 'checklist'> {
  id: string; 
  createdAt: string;
  updatedAt: string;
  // O tipo WeddingTask[] de 'types/wedding.ts' já é 'deadline?: string | null'
  // mas garantimos a serialização
  checklist: Array<Omit<WeddingTask, 'deadline'> & { deadline?: string | null }>;
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
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString(),
    // Garante que o checklist seja um array e que o deadline seja null
    checklist: (data.checklist || []).map(task => ({
      ...task,
      deadline: task.deadline || null,
    })),
  }
}

// Ação 1: Obter todos os casamentos
export async function getWeddings(): Promise<WeddingData[]> {
  // ++ ESTA É A CORREÇÃO DO CACHE ++
  noStore();
  // ++ FIM DA CORREÇÃO DO CACHE ++

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

// Ação 2: Obter um casamento específico pelo ID
export async function getWeddingById(id: string): Promise<WeddingData | null> {
  // ++ ESTA É A CORREÇÃO DO CACHE ++
  noStore();
  // ++ FIM DA CORREÇÃO DO CACHE ++
  
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