// app/actions/create-stay.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { FullStayFormValues } from '@/lib/schemas/stay-schema';
import { PreCheckIn, Stay, Cabin } from '@/types';
// ++ CORREÇÃO: Removendo imports do cliente e usando apenas os do admin ++
import { Timestamp } from 'firebase-admin/firestore';
import { addActivityLogToBatch } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';
import { firestore } from 'firebase-admin';

const generateToken = (): string => Math.floor(100000 + Math.random() * 900000).toString();

export async function createStayAction(data: FullStayFormValues, adminEmail: string) {
  try {
    // ++ CORREÇÃO: O SDK Admin usa `doc()` com o caminho completo ++
    const cabinRef = adminDb.doc(`cabins/${data.cabinId}`);
    const cabinSnap = await cabinRef.get();
    if (!cabinSnap.exists) {
      throw new Error("Cabana selecionada não foi encontrada.");
    }
    const selectedCabin = { id: cabinSnap.id, ...cabinSnap.data() } as Cabin;

    const batch = adminDb.batch();
    
    // 1. Criar o documento de Pré-Check-In
    const preCheckInRef = adminDb.collection('preCheckIns').doc(); // Cria uma referência com ID automático
    const preCheckInData: Omit<PreCheckIn, 'id' | 'stayId'> = {
      leadGuestName: data.leadGuestName,
      isForeigner: data.isForeigner,
      leadGuestDocument: data.leadGuestDocument,
      leadGuestEmail: data.leadGuestEmail,
      leadGuestPhone: data.leadGuestPhone,
      address: { ...data.address, country: data.isForeigner ? (data.country || 'N/A') : 'Brasil' },
      estimatedArrivalTime: data.estimatedArrivalTime,
      knowsVehiclePlate: data.knowsVehiclePlate,
      vehiclePlate: data.vehiclePlate,
      companions: data.companions?.map(c => ({...c, age: Number(c.age)})) || [],
      pets: data.pets?.map(p => ({...p, weight: Number(p.weight), age: p.age.toString()})) || [],
      status: 'validado_admin',
      createdAt: firestore.Timestamp.now(),
    };
    batch.set(preCheckInRef, preCheckInData);

    // 2. Criar o documento da Estadia (Stay)
    const stayRef = adminDb.collection('stays').doc();
    const token = generateToken();
    const newStay: Omit<Stay, 'id'> = {
      guestName: data.leadGuestName,
      cabinId: selectedCabin.id,
      cabinName: selectedCabin.name,
      checkInDate: data.dates.from.toISOString(),
      checkOutDate: data.dates.to.toISOString(),
      numberOfGuests: 1 + (data.companions?.length || 0),
      token: token,
      status: 'active',
      preCheckInId: preCheckInRef.id,
      createdAt: Timestamp.now(),
      pets: data.pets?.map(p => ({...p, weight: Number(p.weight), age: p.age.toString()})) || [],
    };
    batch.set(stayRef, newStay);

    // 3. Atualizar o preCheckIn com o ID da estadia
    batch.update(preCheckInRef, { stayId: stayRef.id });

    // 4. Adicionar log de atividade
    // A função addActivityLogToBatch precisa ser ajustada para o SDK Admin
    const logRef = adminDb.collection('activity_logs').doc();
    batch.set(logRef, {
        type: 'stay_created_manually',
        actor: { type: 'admin', identifier: adminEmail },
        details: `Estadia para ${data.leadGuestName} na ${selectedCabin.name} foi criada.`,
        link: `/admin/stays`,
        timestamp: Timestamp.now()
    });
    
    // 5. Commit de todas as operações
    await batch.commit();

    // 6. Revalidar o cache
    revalidatePath('/admin/stays');
    revalidatePath('/admin/hospedes');

    return { success: true, message: "Estadia criada com sucesso!", token: token };

  } catch (error: any) {
    console.error("ERRO NA SERVER ACTION (createStayAction):", error);
    return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
  }
}