// app/actions/create-stay.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { FullStayFormValues } from '@/lib/schemas/stay-schema';
import { PreCheckIn, Stay, Cabin, Guest } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

const generateToken = (): string => Math.floor(100000 + Math.random() * 900000).toString();

export async function createStayAction(data: FullStayFormValues, adminEmail: string) {
  try {
    const cabinRef = adminDb.doc(`cabins/${data.cabinId}`);
    const cabinSnap = await cabinRef.get();
    if (!cabinSnap.exists) {
      throw new Error("Cabana selecionada não foi encontrada.");
    }
    const selectedCabin = { id: cabinSnap.id, ...cabinSnap.data() } as Cabin;

    const batch = adminDb.batch();
    
    // 1. Criar Pré-Check-In
    const preCheckInRef = adminDb.collection('preCheckIns').doc();
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
      createdAt: Timestamp.now(),
    };
    batch.set(preCheckInRef, preCheckInData);

    // 2. Criar Estadia
    const stayRef = adminDb.collection('stays').doc();
    const token = generateToken();
    const checkInTimestamp = Timestamp.fromDate(new Date(data.dates.from));
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
      createdAt: checkInTimestamp,
      pets: data.pets?.map(p => ({...p, weight: Number(p.weight), age: p.age.toString()})) || [],
    };
    batch.set(stayRef, newStay);
    batch.update(preCheckInRef, { stayId: stayRef.id });
    
    // Lógica para criar/atualizar o Hóspede (Guest)
    const numericCpf = data.leadGuestDocument.replace(/\D/g, '');
    const guestRef = adminDb.collection('guests').doc(numericCpf);
    const guestSnap = await guestRef.get();

    if (guestSnap.exists) {
        // Hóspede já existe, atualiza o histórico
        const guestData = guestSnap.data() as Guest;
        batch.update(guestRef, {
            stayHistory: [...(guestData.stayHistory || []), stayRef.id],
            updatedAt: checkInTimestamp,
            name: data.leadGuestName,
            email: data.leadGuestEmail,
            phone: data.leadGuestPhone,
            address: { ...data.address, country: data.address.country ?? (data.isForeigner ? (data.country || 'N/A') : 'Brasil') },
        });
    } else {
        // Hóspede não existe, cria um novo
        const newGuest: Omit<Guest, 'id'> = {
            name: data.leadGuestName,
            document: numericCpf, // CORREÇÃO: Alterado de 'cpf' para 'document'
            email: data.leadGuestEmail,
            phone: data.leadGuestPhone,
            address: { ...data.address, country: data.address.country ?? (data.isForeigner ? (data.country || 'N/A') : 'Brasil') },
            isForeigner: data.isForeigner,
            country: data.country,
            createdAt: checkInTimestamp,
            updatedAt: checkInTimestamp,
            stayHistory: [stayRef.id],
        };
        batch.set(guestRef, newGuest);
    }

    // 4. Adicionar Log de Atividade
    const logRef = adminDb.collection('activity_logs').doc();
    batch.set(logRef, {
        type: 'stay_created_manually',
        actor: { type: 'admin', identifier: adminEmail },
        details: `Estadia para ${data.leadGuestName} na ${selectedCabin.name} foi criada.`,
        link: `/admin/stays`,
        timestamp: Timestamp.now()
    });
    
    await batch.commit();

    revalidatePath('/admin/stays');
    revalidatePath('/admin/hospedes');

    return { success: true, message: "Estadia criada com sucesso!", token: token };

  } catch (error: any) {
    console.error("ERRO NA SERVER ACTION (createStayAction):", error);
    return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
  }
}