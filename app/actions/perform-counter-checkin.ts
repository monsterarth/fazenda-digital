'use server'

import { adminDb } from '@/lib/firebase-admin';
import { CounterCheckinFormValues } from '@/lib/schemas/stay-schema';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';

export async function performCounterCheckin(data: CounterCheckinFormValues) {
    try {
        console.log(`[Counter Check-in] Iniciando para estadia: ${data.stayId}`);

        const stayRef = adminDb.collection('stays').doc(data.stayId);
        const staySnap = await stayRef.get();

        if (!staySnap.exists) {
            throw new Error("Estadia não encontrada.");
        }

        const currentStay = staySnap.data();
        const batch = adminDb.batch();

        // Dados calculados
        const totalGuests = data.adults + data.children + data.babies;
        const numericCpf = data.guestDocument!.replace(/\D/g, ''); // Sabemos que existe pois é obrigatório no schema agora
        
        // --- 1. CRIAR O PRÉ-CHECK-IN "SOMBRA" ---
        // Isso garante que a estadia tenha um documento pai para edição futura
        const preCheckInRef = adminDb.collection('preCheckIns').doc(); // Gera novo ID
        const preCheckInId = preCheckInRef.id;

        // Geramos placeholders para pets baseado na quantidade informada
        // Isso evita que o campo seja um número (o que quebraria o tipo array)
        const dummyPets = Array.from({ length: data.pets }).map((_, i) => ({
            id: `counter_pet_${i}`,
            name: `Pet ${i + 1}`,
            species: 'outro',
            age: '?',
            weight: '?',
            breed: 'Não informado',
            notes: 'Check-in de balcão'
        }));

        const preCheckInPayload = {
            id: preCheckInId,
            stayId: stayRef.id,
            cabinId: currentStay?.cabinId,
            status: 'validado', // Já nasce validado
            
            // Dados do Hóspede
            leadGuestName: data.guestName,
            leadGuestPhone: data.guestPhone || currentStay?.guestPhone || "",
            leadGuestDocument: numericCpf, // CPF limpo
            leadGuestEmail: "", // Não coletamos no balcão
            
            // Endereço vazio para manter consistência do objeto
            address: {
                street: "",
                number: "",
                neighborhood: "",
                city: "",
                state: "",
                cep: "",
                country: "Brasil"
            },
            
            // Detalhes da chegada
            estimatedArrivalTime: "Check-in Balcão",
            vehiclePlate: data.vehiclePlate || "",
            
            // Contagem
            companions: [], // Deixamos array vazio pois não temos os nomes, mas o guestCount na estadia dirá o total
            pets: dummyPets, 
            
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        batch.set(preCheckInRef, preCheckInPayload);

        // --- 2. ATUALIZAR A ESTADIA ---
        batch.update(stayRef, {
            status: 'active', 
            preCheckInId: preCheckInId, // VINCULAMOS AQUI
            
            guestName: data.guestName,
            guestId: numericCpf, // Vinculamos ao ID do hóspede (CPF)
            guestPhone: data.guestPhone || currentStay?.guestPhone || null,
            
            numberOfGuests: totalGuests,
            
            guestCount: {
                adults: data.adults,
                children: data.children,
                babies: data.babies,
                total: totalGuests
            },
            
            // Agora salvamos pets como array na estadia também (se seu tipo Stay pedir array)
            // Ou mantemos o count se o tipo pedir count. 
            // Para garantir compatibilidade com o Edit, se o campo na estadia for 'pets', 
            // idealmente salvamos os objetos ou deixamos o pre-checkin ser a fonte da verdade.
            // Vou salvar o array gerado para garantir consistência visual.
            pets: dummyPets, 
            
            vehiclePlate: data.vehiclePlate || null,
            
            checkInDate: data.checkInDate.toISOString(),
            checkOutDate: data.checkOutDate.toISOString(),
            
            checkInMethod: 'counter', 
            updatedAt: Timestamp.now()
        });

        // --- 3. ATUALIZAR/CRIAR HÓSPEDE (GUEST) ---
        const guestRef = adminDb.collection('guests').doc(numericCpf);
        const guestSnap = await guestRef.get();

        const guestPayload: any = {
            name: data.guestName,
            updatedAt: Timestamp.now(),
            stayHistory: FieldValue.arrayUnion(data.stayId) 
        };

        if (data.guestPhone) guestPayload.phone = data.guestPhone;

        if (guestSnap.exists) {
            batch.update(guestRef, guestPayload);
        } else {
            batch.set(guestRef, {
                ...guestPayload,
                document: numericCpf,
                createdAt: Timestamp.now(),
                email: "", 
                address: {},
                isForeigner: false
            });
        }

        // --- 4. COMMIT ---
        await batch.commit();

        // --- 5. MENSAGEM DE BOAS VINDAS (WhatsApp) ---
        // (Lógica mantida igual)
        const targetPhone = data.guestPhone || currentStay?.guestPhone;
        
        if (targetPhone) {
            const [propSnap, cabinSnap] = await Promise.all([
                adminDb.collection('properties').doc('default').get(),
                adminDb.collection('cabins').doc(currentStay?.cabinId).get()
            ]);
            
            const propData = propSnap.data();
            const cabinData = cabinSnap.data();

            if (propData?.messages?.whatsappWelcome) {
                try {
                     const firstName = data.guestName.split(' ')[0];
                     const token = currentStay?.token; 
                     const portalLink = `https://portal.fazendadorosa.com.br/?token=${token}`;

                     let message = propData.messages.whatsappWelcome
                        .replace('{guestName}', firstName)
                        .replace('{cabinName}', cabinData?.name || 'sua cabana')
                        .replace('{portalLink}', portalLink)
                        .replace('{token}', token || '')
                        .replace('{wifiSsid}', cabinData?.wifiSsid || '')
                        .replace('{wifiPassword}', cabinData?.wifiPassword || '');

                    // Remove placeholders não usados
                    message = message.replace(/{.*?}/g, '');

                    await sendWhatsAppMessage(targetPhone, message);
                } catch (err) {
                    console.error("Erro ao enviar Whats no check-in de balcão:", err);
                }
            }
        }

        revalidatePath('/admin/stays');
        return { success: true, message: "Check-in de balcão realizado com sucesso!" };

    } catch (error: any) {
        console.error("Erro Counter Check-in:", error);
        return { success: false, message: error.message };
    }
}