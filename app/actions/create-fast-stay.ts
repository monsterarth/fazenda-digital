'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { revalidatePath } from 'next/cache';

function generateNumericToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

interface FastStayData {
    cpf?: string;
    guestName: string;
    guestPhone: string;
    cabinId: string;
    checkInDate: string; 
    checkOutDate: string;
    guests: {
        adults: number;
        children: number;
        babies: number;
        pets: number;
    }
}

export async function createFastStayAction(data: FastStayData) {
    try {
        console.log("Criando Fast Stay...", data);
        
        const token = generateNumericToken();

        // 1. Buscar Cabana e Configuração
        const [cabinSnap, propertySnap] = await Promise.all([
            adminDb.collection('cabins').doc(data.cabinId).get(),
            adminDb.collection('properties').doc('default').get()
        ]);

        if (!cabinSnap.exists) throw new Error("Cabana não encontrada");
        const cabinName = cabinSnap.data()?.name;
        
        const propertyData = propertySnap.data();
        let whatsappTemplate = propertyData?.messages?.whatsappPreCheckIn || propertyData?.whatsappPreCheckIn;

        let guestId = null;

        // 2. Lógica do CPF (Atualização de Cadastro)
        if (data.cpf && data.cpf.length >= 11) {
            // Remove formatação para garantir consistência
            guestId = data.cpf.replace(/\D/g, '');
            
            const guestRef = adminDb.collection('guests').doc(guestId);
            const guestSnap = await guestRef.get();
            
            // Dados vitais que sempre atualizamos com o input da recepção
            const guestUpdatePayload: any = {
                name: data.guestName,
                phone: data.guestPhone, // O telefone da recepção é a verdade absoluta agora
                lastStay: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            if (guestSnap.exists) {
                // Hóspede existe: Atualizamos telefone e nome, MANTENDO endereço antigo
                await guestRef.update(guestUpdatePayload);
            } else {
                // Hóspede novo: Criamos do zero
                await guestRef.set({
                    ...guestUpdatePayload,
                    cpf: guestId,
                    createdAt: Timestamp.now(),
                    email: "", 
                    address: {
                        street: "", number: "", complement: "", 
                        neighborhood: "", city: "", state: "", cep: "", country: "Brasil"
                    } 
                });
            }
        }

        // 3. Criar a Estadia
        const stayRef = adminDb.collection('stays').doc();
        const checkInISO = new Date(data.checkInDate + 'T16:00:00').toISOString();
        const checkOutISO = new Date(data.checkOutDate + 'T12:00:00').toISOString();
        
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
            
            guestId: guestId, // Vincula o ID (CPF) à estadia
            guestPhone: data.guestPhone,
            tempGuestPhone: data.guestPhone, // Backup
            
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

        // 4. Mensagem WhatsApp e Log
        const dynamicLink = `https://portal.fazendadorosa.com.br/pre-check-in?token=${token}`;
        
        let message = `Olá *${data.guestName.split(' ')[0]}*! Sua reserva na *${cabinName}* foi criada. Código de acesso: *${token}*. Confirme seus dados aqui: ${dynamicLink}`;

        if (whatsappTemplate) {
            if (whatsappTemplate.includes('{preCheckInLink}')) {
                 message = whatsappTemplate.replace('{preCheckInLink}', dynamicLink);
            } else if (whatsappTemplate.includes('{precheckinlink}')) {
                message = whatsappTemplate.replace('{precheckinlink}', dynamicLink);
            } else if (whatsappTemplate.includes('https://portal.fazendadorosa.com.br/pre-check-in')) {
                message = whatsappTemplate.replace('https://portal.fazendadorosa.com.br/pre-check-in', dynamicLink);
            } else {
                message = `${whatsappTemplate}\n\nLink: ${dynamicLink}`;
            }
            
            message = message.replace('{guestName}', data.guestName.split(' ')[0]);
            message = message.replace('{cabinName}', cabinName);
            message = message.replace('{token}', token);
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
            } catch (logError) {
                console.error("Erro log mensagem:", logError);
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