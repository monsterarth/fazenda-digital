'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { revalidatePath } from 'next/cache';
import { isValidCPF } from '@/lib/validators'; 

function generateNumericToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

interface FastStayData {
    cpf?: string;
    guestName: string;
    guestPhone: string;
    cabinId: string; // Obrigatório para definir período
    checkInDate: string; // YYYY-MM-DD
    checkOutDate: string; // YYYY-MM-DD
    guests: {
        adults: number;
        children: number;
        babies: number;
        pets: number;
    }
}

export async function createFastStayAction(data: FastStayData) {
    try {
        if (data.cpf) {
            if (!isValidCPF(data.cpf)) {
                return { success: false, message: "O CPF informado é inválido." };
            }
        }

        const token = generateNumericToken();

        // 1. Buscar Cabana (Obrigatória)
        const cabinSnap = await adminDb.collection('cabins').doc(data.cabinId).get();
        if (!cabinSnap.exists) throw new Error("Cabana não encontrada");
        const cabinName = cabinSnap.data()?.name || "Cabana";
        
        // 2. Configurações e Template
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
                await guestRef.update(guestUpdatePayload);
            } else {
                await guestRef.set({
                    ...guestUpdatePayload,
                    cpf: guestId,
                    createdAt: Timestamp.now(),
                    email: "", 
                    address: {} 
                });
            }
        }

        // 4. Criar a Estadia
        const stayRef = adminDb.collection('stays').doc();
        
        // Define horários padrão (Check-in 14h / Check-out 12h)
        const checkInISO = new Date(`${data.checkInDate}T14:00:00`).toISOString();
        const checkOutISO = new Date(`${data.checkOutDate}T12:00:00`).toISOString();
        
        const totalHumans = data.guests.adults + data.guests.children + data.guests.babies;
        const totalPets = data.guests.pets;

        await stayRef.set({
            token: token,
            status: 'pending_guest_data', 
            
            checkInDate: checkInISO,
            checkOutDate: checkOutISO,
            
            guestName: data.guestName,
            numberOfGuests: totalHumans,
            
            cabinId: data.cabinId,
            cabinName: cabinName,
            
            guestId: guestId,
            guestPhone: data.guestPhone,
            tempGuestPhone: data.guestPhone,
            
            guestCount: {
                adults: data.guests.adults,
                children: data.guests.children,
                babies: data.guests.babies,
                total: totalHumans
            },
            
            pets: totalPets, 
            
            source: 'fast_reception',
            createdAt: Timestamp.now(),
        });

        // 5. Mensagem WhatsApp
        const dynamicLink = `https://portal.fazendadorosa.com.br/?token=${token}`;
        
        let message = `Olá *${data.guestName.split(' ')[0]}*! Sua reserva na *${cabinName}* foi iniciada. Código de acesso: *${token}*. Confirme seus dados aqui: ${dynamicLink}`;

        if (whatsappTemplate) {
            message = whatsappTemplate;
            message = message.replace(/{preCheckInLink}/gi, dynamicLink);
            message = message.replace(/{portalLink}/gi, dynamicLink);
            message = message.replace('https://portal.fazendadorosa.com.br/pre-check-in', dynamicLink); 

            message = message.replace(/{guestName}/gi, data.guestName.split(' ')[0]);
            message = message.replace(/{cabinName}/gi, cabinName);
            message = message.replace(/{token}/gi, token);
            
            if (!message.includes(dynamicLink) && !message.includes(token)) {
                message += `\n\nLink: ${dynamicLink}`;
            }
        }

        const result = await sendWhatsAppMessage(data.guestPhone, message);
        
        if (result.success) {
            try {
                await adminDb.collection('message_logs').add({
                    type: 'whatsappPreCheckIn', 
                    content: message,
                    guestName: data.guestName,
                    stayId: stayRef.id,
                    actor: 'Sistema (Fast Stay)',
                    sentAt: Timestamp.now(),
                    status: 'sent_via_api',
                    phone: data.guestPhone
                });

                await stayRef.update({
                    'communicationStatus.preCheckInSentAt': Timestamp.now()
                });
            } catch (error) {
                // Log silencioso
            }
        }
        
        revalidatePath('/admin/stays');
        revalidatePath('/admin/comunicacao');

        return { 
            success: true, 
            message: result.success ? "Estadia criada e Link enviado!" : "Estadia criada, mas erro no Whats." 
        };

    } catch (error: any) {
        console.error("Erro Fast Stay:", error);
        return { success: false, message: error.message };
    }
}