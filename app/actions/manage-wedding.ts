'use server'

import { adminDb } from '@/lib/firebase-admin'
import {
  WeddingFormValues,
  WeddingGeneralFormValues, // ++ ADICIONADO
} from '@/lib/schemas/wedding-schema'
import { Wedding, WeddingSupplier } from '@/types/wedding'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

// Interface de Resposta Padrão
interface ActionResponse {
  success: boolean
  message: string
  weddingId?: string
}

// Ação 1: Criar Casamento (Já tínhamos)
export async function createWedding(
  data: WeddingFormValues,
): Promise<ActionResponse> {
  try {
    console.log('Criando novo casamento:', data.coupleName)

    // (Lógica de fornecedores...)
    const initialSuppliers: WeddingSupplier[] = []
    if (data.plannerName) {
      initialSuppliers.push({
        id: randomUUID(),
        name: data.plannerName,
        service: 'Cerimonial',
        category: 'Externo',
        contact: '',
        status: 'Pendente',
      })
    }
    if (data.soundSupplierName) {
      initialSuppliers.push({
        id: randomUUID(),
        name: data.soundSupplierName,
        service: 'Sonorização',
        category:
          data.soundSupplierName.toLowerCase().includes('léo mix')
            ? 'Exclusivo'
            : 'Externo',
        contact: '',
        status: 'Pendente',
      })
    }
    if (data.buffetSupplierName) {
      initialSuppliers.push({
        id: randomUUID(),
        name: data.buffetSupplierName,
        service: 'Buffet',
        category:
          data.buffetSupplierName.toLowerCase().includes('altamari')
            ? 'Exclusivo'
            : 'Externo',
        contact: '',
        status: 'Pendente',
        isExclusive: data.buffetIsExclusive,
      })
    }
    
    // (Resto da lógica de criação...)
    const newWeddingData: Omit<Wedding, 'id' | 'createdAt' | 'updatedAt'> = {
      coupleName: data.coupleName,
      weddingDate: data.weddingDate.toISOString().split('T')[0],
      checkInDate: data.checkInDate.toISOString().split('T')[0],
      checkOutDate: data.checkOutDate.toISOString().split('T')[0],
      location: data.location,
      guestCount: data.guestCount,
      totalValue: data.totalValue,
      internalObservations: data.internalObservations || '',
      coupleCity: data.coupleCity || '',
      isConfirmed: true,
      clients: [],
      paymentPlan: [],
      deposit: { value: 10000, status: 'Pendente' },
      suppliers: initialSuppliers,
      checklist: [],
      couplePhotoUrl: '',
      contractUrl: '',
    }

    const weddingRef = await adminDb.collection('weddings').add({
      ...newWeddingData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    revalidatePath('/admin/casamentos')
    revalidatePath('/admin/casamentos/lista') // ++ ADICIONADO (Boa prática)

    return {
      success: true,
      message: 'Casamento criado com sucesso!',
      weddingId: weddingRef.id,
    }
  } catch (error) {
    console.error('Erro ao criar casamento:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}

// ++ INÍCIO DA ADIÇÃO ++

// Ação 2: Atualizar Aba "Geral"
export async function updateWeddingGeneral(
  weddingId: string,
  data: WeddingGeneralFormValues,
): Promise<ActionResponse> {
  if (!weddingId) {
    return { success: false, message: 'ID do casamento não fornecido.' }
  }

  try {
    const weddingRef = adminDb.collection('weddings').doc(weddingId)

    // Prepara os dados para atualização
    const dataToUpdate = {
      ...data,
      // Converte Datas de volta para string YYYY-MM-DD
      weddingDate: data.weddingDate.toISOString().split('T')[0],
      checkInDate: data.checkInDate.toISOString().split('T')[0],
      checkOutDate: data.checkOutDate.toISOString().split('T')[0],
      // Garante que campos opcionais nulos sejam salvos
      coupleCity: data.coupleCity || '',
      internalObservations: data.internalObservations || '',
      // Adiciona o timestamp de atualização
      updatedAt: FieldValue.serverTimestamp(),
    }

    await weddingRef.update(dataToUpdate)

    // Revalida os paths para garantir que os dados sejam atualizados
    revalidatePath(`/admin/casamentos/lista`) // Atualiza a lista
    revalidatePath(`/admin/casamentos/${weddingId}`) // Atualiza o dossiê

    return { success: true, message: 'Dados gerais atualizados com sucesso!' }
  } catch (error) {
    console.error(`Erro ao atualizar casamento ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}
// ++ FIM DA ADIÇÃO ++