'use server'

import { adminDb } from '@/lib/firebase-admin'
import {
  WeddingFormValues,
  WeddingGeneralFormValues,
  WeddingFinancialFormValues,
  WeddingSuppliersFormValues,
  WeddingChecklistFormValues, // ++ ADICIONADO
} from '@/lib/schemas/wedding-schema'
import { Wedding, WeddingSupplier } from '@/types/wedding'
import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

// (Interface ActionResponse inalterada)
interface ActionResponse {
  success: boolean
  message: string
  weddingId?: string
}

// (Ação createWedding inalterada)
export async function createWedding(
  data: WeddingFormValues,
): Promise<ActionResponse> {
  // ... (código de criação completo, como antes)
  try {
    console.log('Criando novo casamento:', data.coupleName)
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
    revalidatePath('/admin/casamentos/lista')
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

// (Ação updateWeddingGeneral inalterada)
export async function updateWeddingGeneral(
  weddingId: string,
  data: WeddingGeneralFormValues,
): Promise<ActionResponse> {
  // ... (código de update geral, como antes)
  if (!weddingId) {
    return { success: false, message: 'ID do casamento não fornecido.' }
  }
  try {
    const weddingRef = adminDb.collection('weddings').doc(weddingId)
    const dataToUpdate = {
      ...data,
      weddingDate: data.weddingDate.toISOString().split('T')[0],
      checkInDate: data.checkInDate.toISOString().split('T')[0],
      checkOutDate: data.checkOutDate.toISOString().split('T')[0],
      coupleCity: data.coupleCity || '',
      internalObservations: data.internalObservations || '',
      updatedAt: FieldValue.serverTimestamp(),
    }
    await weddingRef.update(dataToUpdate)
    revalidatePath(`/admin/casamentos/lista`)
    revalidatePath(`/admin/casamentos/${weddingId}`)
    return { success: true, message: 'Dados gerais atualizados com sucesso!' }
  } catch (error) {
    console.error(`Erro ao atualizar casamento ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}

// (Ação updateWeddingFinancial inalterada)
export async function updateWeddingFinancial(
  weddingId: string,
  data: WeddingFinancialFormValues,
): Promise<ActionResponse> {
  // ... (código de update financeiro, como antes)
  if (!weddingId) {
    return { success: false, message: 'ID do casamento não fornecido.' }
  }
  try {
    const weddingRef = adminDb.collection('weddings').doc(weddingId)
    const serializedData = {
      ...data,
      paymentPlan: data.paymentPlan.map((installment) => ({
        ...installment,
        dueDate: installment.dueDate.toISOString().split('T')[0],
      })),
      updatedAt: FieldValue.serverTimestamp(),
    }
    await weddingRef.update(serializedData)
    revalidatePath(`/admin/casamentos/lista`)
    revalidatePath(`/admin/casamentos/${weddingId}`)
    return { success: true, message: 'Dados financeiros atualizados com sucesso!' }
  } catch (error) {
    console.error(`Erro ao atualizar financeiro ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}

// (Ação updateWeddingSuppliers inalterada)
export async function updateWeddingSuppliers(
  weddingId: string,
  data: WeddingSuppliersFormValues,
): Promise<ActionResponse> {
  // ... (código de update fornecedores, como antes)
  if (!weddingId) {
    return { success: false, message: 'ID do casamento não fornecido.' }
  }
  try {
    const weddingRef = adminDb.collection('weddings').doc(weddingId)
    const dataToUpdate = {
      suppliers: data.suppliers,
      updatedAt: FieldValue.serverTimestamp(),
    }
    await weddingRef.update(dataToUpdate)
    revalidatePath(`/admin/casamentos/${weddingId}`)
    return { success: true, message: 'Lista de fornecedores atualizada!' }
  } catch (error) {
    console.error(`Erro ao atualizar fornecedores ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}


// ++ INÍCIO DA ADIÇÃO ++

// Ação 5: Atualizar Aba "Checklist"
export async function updateWeddingChecklist(
  weddingId: string,
  data: WeddingChecklistFormValues,
): Promise<ActionResponse> {
  if (!weddingId) {
    return { success: false, message: 'ID do casamento não fornecido.' }
  }

  try {
    const weddingRef = adminDb.collection('weddings').doc(weddingId)

    // Serializa as datas (convertendo Date para string ou null)
    const serializedData = {
      checklist: data.checklist.map((task) => ({
        ...task,
        // Se a data existir, converte para YYYY-MM-DD, senão salva como null
        deadline: task.deadline ? task.deadline.toISOString().split('T')[0] : null,
      })),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await weddingRef.update(serializedData)
    
    revalidatePath(`/admin/casamentos/${weddingId}`)
    
    return { success: true, message: 'Checklist atualizado com sucesso!' }
  } catch (error) {
    console.error(`Erro ao atualizar checklist ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}
// ++ FIM DA ADIÇÃO ++