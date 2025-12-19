'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { revalidatePath } from 'next/cache';
import { isValidCPF } from '@/lib/validators'; 
import { v4 as uuidv4 } from 'uuid';

function generateNumericToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

interface CabinConfig {
    cabinId: string;
    guests: {
        adults: number;
        children: number;
        babies: number;
        pets: number;
    }
}

interface FastStayData {
    cpf?: string;
    guestName: string;
    guestPhone: string;
    cabinConfigurations: CabinConfig[];
    checkInDate: string; 
    checkOutDate: string; 
}

export async function createFastStayAction(data: FastStayData) {
    try {
        if (data.cpf && !isValidCPF(data.cpf)) {
            return { success: false, message: "O CPF informado é inválido." };
        }
        
        if (!data.cabinConfigurations || data.cabinConfigurations.length === 0) {
            return { success: false, message: "Selecione pelo menos uma cabana." };
        }

        const batch = adminDb.batch();
        const mainToken = generateNumericToken();
        
        // --- CORREÇÃO DO ERRO ---
        // Se houver mais de uma cabana, gera ID. Se não, usa null (o Firestore aceita null, mas não undefined)
        const groupId = data.cabinConfigurations.length > 1 ? uuidv4() : null;

        // 1. Validar e Buscar Nomes das Cabanas
        const cabinIds = data.cabinConfigurations.map(c => c.cabinId);
        const cabinPromises = cabinIds.map(id => adminDb.collection('cabins').doc(id).get());
        const cabinSnaps = await Promise.all(cabinPromises);
        
        const validCabinsMap = new Map();
        cabinSnaps.forEach(snap => {
            if (snap.exists) validCabinsMap.set(snap.id, snap.data()?.name || "Cabana");
        });

        // 2. Configurações de Mensagem
        const propertySnap = await adminDb.collection('properties').doc('default').get();
        const propertyData = propertySnap.data();
        let whatsappTemplate = propertyData?.messages?.whatsappPreCheckIn || propertyData?.whatsappPreCheckIn;

        // 3. Gestão do Guest (CPF)
        let guestId = null;
        if (data.cpf) {
            guestId = data.cpf.replace(/\D/g, '');
            const guestRef = adminDb.collection('guests').doc(guestId);
            const guestSnap = await guestRef.get();
            
            const guestUpdatePayload: any = {
                name: data.guestName,
                phone: data.guestPhone,
                lastStay: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            if (guestSnap.exists) {
                batch.update(guestRef, guestUpdatePayload);
            } else {
                batch.set(guestRef, {
                    ...guestUpdatePayload,
                    cpf: guestId,
                    createdAt: Timestamp.now(),
                    email: "", 
                    address: {} 
                });
            }
        }

        // 4. Criar as Estadias
        const checkInISO = new Date(`${data.checkInDate}T14:00:00`).toISOString();
        const checkOutISO = new Date(`${data.checkOutDate}T12:00:00`).toISOString();
        let mainStayId = "";
        let cabinNamesList: string[] = [];

        for (let i = 0; i < data.cabinConfigurations.length; i++) {
            const config = data.cabinConfigurations[i];
            const cabinName = validCabinsMap.get(config.cabinId);
            if (!cabinName) continue; 

            cabinNamesList.push(cabinName);

            const stayRef = adminDb.collection('stays').doc();
            const isMain = i === 0; 
            
            if (isMain) mainStayId = stayRef.id;

            const g = config.guests;
            const totalHumans = g.adults + g.children + g.babies;
            const totalPets = g.pets;

            const thisToken = isMain ? mainToken : generateNumericToken();

            // Montagem do Objeto Stay
            const stayPayload: any = {
                token: thisToken,
                status: 'pending_guest_data', 
                
                checkInDate: checkInISO,
                checkOutDate: checkOutISO,
                
                guestName: data.guestName, 
                numberOfGuests: totalHumans, 
                
                cabinId: config.cabinId,
                cabinName: cabinName,
                
                guestId: guestId,
                guestPhone: data.guestPhone,
                tempGuestPhone: data.guestPhone,
                
                guestCount: {
                    adults: g.adults,
                    children: g.children,
                    babies: g.babies,
                    total: totalHumans
                },
                pets: totalPets, 
                
                source: 'fast_reception',
                createdAt: Timestamp.now(),
                isMainBooker: isMain,
            };

            // Adiciona groupId apenas se ele existir (não for null/undefined)
            // Ou passa explicitamente null se o banco aceitar, mas 'undefined' quebra o Firestore.
            if (groupId) {
                stayPayload.groupId = groupId;
            } else {
                stayPayload.groupId = null; // Garante que não vá undefined
            }

            batch.set(stayRef, stayPayload);
        }

        await batch.commit();

        // 5. Mensagem WhatsApp
        const dynamicLink = `https://portal.fazendadorosa.com.br/?token=${mainToken}`;
        const cabinNamesString = cabinNamesList.join(', ');
        
        let message = `Olá *${data.guestName.split(' ')[0]}*! Sua reserva na *${cabinNamesString}* foi iniciada. Código de acesso: *${mainToken}*. Confirme seus dados aqui: ${dynamicLink}`;

        if (whatsappTemplate) {
            message = whatsappTemplate;
            message = message.replace(/{preCheckInLink}/gi, dynamicLink);
            message = message.replace(/{portalLink}/gi, dynamicLink);
            message = message.replace('https://portal.fazendadorosa.com.br/pre-check-in', dynamicLink); 

            message = message.replace(/{guestName}/gi, data.guestName.split(' ')[0]);
            message = message.replace(/{cabinName}/gi, cabinNamesString); 
            message = message.replace(/{token}/gi, mainToken);
            
            if (!message.includes(dynamicLink) && !message.includes(mainToken)) {
                message += `\n\nLink: ${dynamicLink}`;
            }
        }

        const result = await sendWhatsAppMessage(data.guestPhone, message);
        
        if (result.success && mainStayId) {
            try {
                await adminDb.collection('message_logs').add({
                    type: 'whatsappPreCheckIn', 
                    content: message,
                    guestName: data.guestName,
                    stayId: mainStayId,
                    actor: 'Sistema (Fast Stay)',
                    sentAt: Timestamp.now(),
                    status: 'sent_via_api',
                    phone: data.guestPhone
                });
                await adminDb.collection('stays').doc(mainStayId).update({
                    'communicationStatus.preCheckInSentAt': Timestamp.now()
                });
            } catch (e) { console.log("Erro log msg", e); }
        }
        
        revalidatePath('/admin/stays');
        revalidatePath('/admin/comunicacao');

        return { 
            success: true, 
            message: `Reserva criada para ${cabinNamesList.length} cabana(s)! Link enviado.` 
        };

    } catch (error: any) {
        console.error("Erro Fast Stay:", error);
        return { success: false, message: error.message };
    }
}