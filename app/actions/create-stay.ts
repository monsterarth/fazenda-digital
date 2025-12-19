// app/actions/create-stay.ts
'use server'

import { adminDb } from '@/lib/firebase-admin';
import { FullStayFormValues } from '@/lib/schemas/stay-schema';
import { PreCheckIn, Stay, Cabin, Guest } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid'; // Instalar se não tiver: pnpm add uuid @types/uuid

const generateToken = (): string => Math.floor(100000 + Math.random() * 900000).toString();

export async function createStayAction(data: FullStayFormValues, adminEmail: string) {
  try {
    const batch = adminDb.batch();
    
    // 1. Validar e Buscar TODAS as Cabanas selecionadas
    const cabinPromises = data.cabinIds.map(id => adminDb.doc(`cabins/${id}`).get());
    const cabinSnaps = await Promise.all(cabinPromises);
    
    const selectedCabins: Cabin[] = [];
    for (const snap of cabinSnaps) {
        if (!snap.exists) throw new Error(`Uma das cabanas selecionadas não foi encontrada.`);
        selectedCabins.push({ id: snap.id, ...snap.data() } as Cabin);
    }

    // --- LÓGICA ACF (CÁLCULO DE HÓSPEDES DO TITULAR) ---
    // Esta contagem será aplicada inicialmente à ESTADIA PRINCIPAL
    let mainAdults = 1; // Hóspede principal conta como 1 adulto
    let mainChildren = 0;
    let mainBabies = 0;

    const companions = data.companions || [];
    
    companions.forEach(c => {
        if (c.category === 'adult') mainAdults++;
        else if (c.category === 'child') mainChildren++;
        else if (c.category === 'baby') mainBabies++;
    });

    const mainTotalGuests = mainAdults + mainChildren + mainBabies;

    // Gerar GroupID se for reserva múltipla
    const groupId = selectedCabins.length > 1 ? uuidv4() : undefined;
    const checkInTimestamp = Timestamp.fromDate(new Date(data.dates.from));

    // Convertemos os pets corretamente (peso string -> number)
    const formattedPets = data.pets?.map(p => ({
        ...p, 
        weight: Number(p.weight), 
        age: p.age.toString()
    })) || [];


    // 2. Criar Pré-Check-In Mestre (Segura todos os dados inicialmente)
    const preCheckInRef = adminDb.collection('preCheckIns').doc();
    const createdStayIds: string[] = [];

    // 3. Loop para Criar Estadias Individuais
    for (let i = 0; i < selectedCabins.length; i++) {
        const cabin = selectedCabins[i];
        const stayRef = adminDb.collection('stays').doc();
        const token = generateToken();
        
        // A primeira cabana da lista é considerada a "Principal" (onde o titular dorme)
        // As outras recebem uma contagem provisória (1 adulto) até a distribuição no check-in
        const isMainStay = i === 0;

        const currentGuests = isMainStay ? mainTotalGuests : 1;
        const currentGuestCount = isMainStay 
            ? { adults: mainAdults, children: mainChildren, babies: mainBabies, total: mainTotalGuests }
            : { adults: 1, children: 0, babies: 0, total: 1 }; // Provisório para cabanas extras

        const newStay: Omit<Stay, 'id'> = {
            guestName: data.leadGuestName, // Provisório nas cabanas extras, titular na principal
            originalBookerName: data.leadGuestName, // Rastreabilidade
            cabinId: cabin.id,
            cabinName: cabin.name,
            checkInDate: data.dates.from.toISOString(),
            checkOutDate: data.dates.to.toISOString(),
            
            numberOfGuests: currentGuests,
            guestCount: currentGuestCount,

            token: token,
            status: 'active',
            preCheckInId: preCheckInRef.id,
            createdAt: checkInTimestamp,
            pets: isMainStay ? formattedPets : [], // Pets ficam na principal inicialmente
            
            // Novos campos de Grupo
            groupId: groupId,
            isMainBooker: isMainStay
        };

        batch.set(stayRef, newStay);
        createdStayIds.push(stayRef.id);
    }

    // 4. Salvar dados do Pré-Check-In
    const preCheckInData: Omit<PreCheckIn, 'id'> = {
      leadGuestName: data.leadGuestName,
      isForeigner: data.isForeigner,
      leadGuestDocument: data.leadGuestDocument,
      leadGuestEmail: data.leadGuestEmail,
      leadGuestPhone: data.leadGuestPhone,
      address: { ...data.address, country: data.isForeigner ? (data.country || 'N/A') : 'Brasil' },
      estimatedArrivalTime: data.estimatedArrivalTime,
      knowsVehiclePlate: data.knowsVehiclePlate,
      vehiclePlate: data.vehiclePlate,
      
      companions: companions, // Todos listados aqui, serão distribuídos no front depois
      
      pets: formattedPets,
      status: 'validado_admin',
      createdAt: Timestamp.now(),
      
      stayId: createdStayIds[0], // Vincula à estadia principal
      relatedStayIds: createdStayIds, // Lista todas as estadias vinculadas
      cabinAssignments: [] // Inicialmente vazio
    };
    batch.set(preCheckInRef, preCheckInData);

    // 5. Lógica para criar/atualizar o Hóspede Principal (Titular)
    const numericCpf = data.leadGuestDocument.replace(/\D/g, '');
    const guestRef = adminDb.collection('guests').doc(numericCpf);
    const guestSnap = await guestRef.get();

    if (guestSnap.exists) {
        const guestData = guestSnap.data() as Guest;
        // Adiciona histórico (merge dos IDs antigos com os novos)
        const updatedHistory = [...(guestData.stayHistory || []), ...createdStayIds];
        const uniqueHistory = Array.from(new Set(updatedHistory));

        batch.update(guestRef, {
            stayHistory: uniqueHistory,
            updatedAt: checkInTimestamp,
            name: data.leadGuestName,
            email: data.leadGuestEmail,
            phone: data.leadGuestPhone,
            address: { ...data.address, country: data.address.country ?? (data.isForeigner ? (data.country || 'N/A') : 'Brasil') },
        });
    } else {
        const newGuest: Omit<Guest, 'id'> = {
            name: data.leadGuestName,
            document: numericCpf,
            email: data.leadGuestEmail,
            phone: data.leadGuestPhone,
            address: { ...data.address, country: data.address.country ?? (data.isForeigner ? (data.country || 'N/A') : 'Brasil') },
            isForeigner: data.isForeigner,
            country: data.country,
            createdAt: checkInTimestamp,
            updatedAt: checkInTimestamp,
            stayHistory: createdStayIds,
        };
        batch.set(guestRef, newGuest);
    }

    // 6. Adicionar Log de Atividade
    const logRef = adminDb.collection('activity_logs').doc();
    const cabinesNomes = selectedCabins.map(c => c.name).join(', ');
    
    batch.set(logRef, {
        type: 'stay_created_manually',
        actor: { type: 'admin', identifier: adminEmail },
        details: `Reserva ${groupId ? 'de Grupo' : ''} criada para ${data.leadGuestName}. Cabanas: ${cabinesNomes}.`,
        link: `/admin/stays`,
        timestamp: Timestamp.now()
    });
    
    await batch.commit();

    revalidatePath('/admin/stays');
    revalidatePath('/admin/hospedes');

    return { 
        success: true, 
        message: `${createdStayIds.length} Estadia(s) criada(s) com sucesso!`, 
        // Retorna o token da principal (ou você pode retornar um objeto com todos)
        token: "Ver Detalhes" 
    };

  } catch (error: any) {
    console.error("ERRO NA SERVER ACTION (createStayAction):", error);
    return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
  }
}