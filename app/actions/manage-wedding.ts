//app\actions\manage-wedding.ts

'use server'

import { adminDb } from '@/lib/firebase-admin'
import {
  WeddingFormValues,
  WeddingGeneralFormValues,
  WeddingFinancialFormValues,
  WeddingSuppliersFormValues,
  WeddingChecklistFormValues,
} from '@/lib/schemas/wedding-schema'
import { Wedding, WeddingSupplier } from '@/types/wedding'
import { FieldValue, Timestamp as AdminTimestamp } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

interface ActionResponse {
  success: boolean
  message: string
  weddingId?: string
}

// Helper de Revalidação (Corrigido para garantir que todas as páginas sejam limpas)
const revalidateWeddingPaths = (weddingId?: string) => {
  revalidatePath('/admin/casamentos')
  revalidatePath('/admin/casamentos/lista')
  revalidatePath('/admin/casamentos/calendario')
  if (weddingId) {
    revalidatePath(`/admin/casamentos/${weddingId}`)
  }
}

// Ação 1: Criar Casamento (Inalterado, mas com revalidação correta)
export async function createWedding(
  data: WeddingFormValues,
): Promise<ActionResponse> {
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
      hasLodgeExclusivity: data.hasLodgeExclusivity,
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

    revalidateWeddingPaths() // Revalida tudo

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

// ++ INÍCIO DA CORREÇÃO ++
// Ação 2: Atualizar Aba "Geral" (REESCRITA)
export async function updateWeddingGeneral(
  weddingId: string,
  data: WeddingGeneralFormValues, // Este tipo NÃO TEM 'totalValue'
): Promise<ActionResponse> {
  if (!weddingId) {
    return { success: false, message: 'ID do casamento não fornecido.' }
  }
  try {
    const weddingRef = adminDb.collection('weddings').doc(weddingId)
    
    // Em vez de usar '...data' (spread), definimos EXPLICITAMENTE
    // quais campos esta ação tem permissão para atualizar.
    // Isso impede que 'totalValue' seja apagado.
    const dataToUpdate = {
      coupleName: data.coupleName,
      coupleCity: data.coupleCity || '',
      weddingDate: data.weddingDate.toISOString().split('T')[0],
      checkInDate: data.checkInDate.toISOString().split('T')[0],
      checkOutDate: data.checkOutDate.toISOString().split('T')[0],
      location: data.location,
      guestCount: data.guestCount,
      internalObservations: data.internalObservations || '',
      hasLodgeExclusivity: data.hasLodgeExclusivity,
      updatedAt: FieldValue.serverTimestamp(),
    }
    
    await weddingRef.update(dataToUpdate)
    
    revalidateWeddingPaths(weddingId) // Revalida tudo

    return { success: true, message: 'Dados gerais atualizados com sucesso!' }
  } catch (error) {
    console.error(`Erro ao atualizar casamento ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}
// ++ FIM DA CORREÇÃO ++

// Ação 3: Atualizar Aba "Financeiro"
export async function updateWeddingFinancial(
  weddingId: string,
  data: WeddingFinancialFormValues, // Este tipo TEM 'totalValue'
): Promise<ActionResponse> {
  if (!weddingId) {
    return { success: false, message: 'ID do casamento não fornecido.' }
  }
  try {
    const weddingRef = adminDb.collection('weddings').doc(weddingId)
    
    // Esta ação ATUALIZA 'totalValue' e os outros campos financeiros
    const serializedData = {
      totalValue: data.totalValue, // Salva o valor total
      deposit: data.deposit ? data.deposit : { value: 0, status: 'Pendente' },
      paymentPlan: data.paymentPlan.map((installment) => ({
        ...installment,
        dueDate: installment.dueDate.toISOString().split('T')[0],
      })),
      updatedAt: FieldValue.serverTimestamp(),
    }
    
    await weddingRef.update(serializedData)
    
    revalidateWeddingPaths(weddingId) // Revalida tudo

    return { success: true, message: 'Dados financeiros atualizados com sucesso!' }
  } catch (error) {
    console.error(`Erro ao atualizar financeiro ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}

// Ação 4: Atualizar Aba "Fornecedores"
export async function updateWeddingSuppliers(
  weddingId: string,
  data: WeddingSuppliersFormValues,
): Promise<ActionResponse> {
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

    revalidateWeddingPaths(weddingId) // Revalida tudo

    return { success: true, message: 'Lista de fornecedores atualizada!' }
  } catch (error) {
    console.error(`Erro ao atualizar fornecedores ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}

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
    const serializedData = {
      checklist: data.checklist.map((task) => ({
        ...task,
        deadline: task.deadline ? task.deadline.toISOString().split('T')[0] : null,
      })),
      updatedAt: FieldValue.serverTimestamp(),
    }
    await weddingRef.update(serializedData)
    
    revalidateWeddingPaths(weddingId) // Revalida tudo

    return { success: true, message: 'Checklist atualizado com sucesso!' }
  } catch (error) {
    console.error(`Erro ao atualizar checklist ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}

// Ação 6: Excluir Casamento
export async function deleteWedding(weddingId: string): Promise<ActionResponse> {
  if (!weddingId) {
    return { success: false, message: 'ID do casamento não fornecido.' }
  }
  try {
    await adminDb.collection('weddings').doc(weddingId).delete()
    
    revalidateWeddingPaths() // Revalida tudo
    
    return { success: true, message: 'Casamento excluído com sucesso!' }
  } catch (error) {
    console.error(`Erro ao excluir casamento ${weddingId}:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: errorMessage }
  }
}

// Ação 7: Atualizar Foto do Casal
export async function updateWeddingPhoto(
weddingId: string, photoUrl: string, email: string,
): Promise<ActionResponse> {
  if (!weddingId || !photoUrl) {
    return {
      success: false,
      message: 'ID do casamento ou URL da foto estão faltando.',
    }
  }
  try {
    const weddingRef = adminDb.collection('weddings').doc(weddingId)
    await weddingRef.update({
      couplePhotoUrl: photoUrl,
      updatedAt: AdminTimestamp.now(),
    })

    revalidateWeddingPaths(weddingId) // Revalida tudo

    return { success: true, message: 'Foto atualizada.' }
  } catch (error: any) {
    console.error('Erro ao atualizar foto do casamento:', error)
    return {
      success: false,
      message: 'Erro do servidor ao salvar a foto.',
    }
  }
}