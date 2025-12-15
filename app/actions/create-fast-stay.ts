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
        console.log("Criando Fast Stay (Estrutura Legada Ajustada)...", data);
        
        const token = generateNumericToken();

        // 1. Buscar Cabana e Propriedade
        const [cabinSnap, propertySnap] = await Promise.all([
            adminDb.collection('cabins').doc(data.cabinId).get(),
            adminDb.collection('properties').doc('default').get()
        ]);

        if (!cabinSnap.exists) throw new Error("Cabana não encontrada");
        const cabinName = cabinSnap.data()?.name;
        
        const propertyData = propertySnap.data();
        let whatsappTemplate = propertyData?.messages?.whatsappPreCheckIn || propertyData?.whatsappPreCheckIn;

        let guestId = null;

        // 2. Lógica do CPF
        if (data.cpf && data.cpf.length === 11) {
            guestId = data.cpf;
            const guestRef = adminDb.collection('guests').doc(guestId);
            const guestSnap = await guestRef.get();
            const guestPayload = {
                name: data.guestName,
                phone: data.guestPhone,
                lastStay: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            if (guestSnap.exists) {
                await guestRef.update(guestPayload);
            } else {
                await guestRef.set({
                    ...guestPayload,
                    cpf: data.cpf,
                    createdAt: Timestamp.now(),
                    email: "", 
                    address: {} 
                });
            }
        }

        // 3. Criar a Estadia
        const stayRef = adminDb.collection('stays').doc();
        const checkInISO = new Date(data.checkInDate + 'T16:00:00').toISOString();
        const checkOutISO = new Date(data.checkOutDate + 'T12:00:00').toISOString();
        
        // CORREÇÃO: Total conta apenas humanos
        const totalHumans = data.guests.adults + data.guests.children + data.guests.babies;
        const totalPets = data.guests.pets;

        await stayRef.set({
            token: token,
            status: 'pending_guest_data', 
            
            checkInDate: checkInISO,
            checkOutDate: checkOutISO,
            
            guestName: data.guestName,
            numberOfGuests: totalHumans, // Legado: apenas humanos
            
            cabinId: data.cabinId,
            cabinName: cabinName,
            
            guestId: guestId,
            guestPhone: data.guestPhone,
            tempGuestPhone: data.guestPhone,
            
            // CORREÇÃO: Estrutura do guestCount limpa (sem pets)
            guestCount: {
                adults: data.guests.adults,
                children: data.guests.children,
                babies: data.guests.babies,
                total: totalHumans
            },
            
            // CORREÇÃO: Pets na raiz
            pets: totalPets, 
            
            source: 'fast_reception',
            createdAt: Timestamp.now(),
        });

        // 4. Mensagem WhatsApp
        const dynamicLink = `https://portal.fazendadorosa.com.br/pre-check-in?token=${token}`;
        
        let message = `Olá *${data.guestName.split(' ')[0]}*! Sua reserva na *${cabinName}* foi criada. Código de acesso: *${token}*. Confirme seus dados aqui: ${dynamicLink}`;

        if (whatsappTemplate) {
            if (whatsappTemplate.includes('{precheckinlink}')) {
                message = whatsappTemplate.replace('{precheckinlink}', dynamicLink);
            } else if (whatsappTemplate.includes('https://portal.fazendadorosa.com.br/pre-check-in')) {
                message = whatsappTemplate.replace('https://portal.fazendadorosa.com.br/pre-check-in', dynamicLink);
            } else {
                message = `${whatsappTemplate}\n\nLink: ${dynamicLink}`;
            }
        }

        const result = await sendWhatsAppMessage(data.guestPhone, message);
        
        revalidatePath('/admin/stays');

        return { 
            success: true, 
            message: result.success ? "Estadia criada e Link enviado!" : "Estadia criada, mas erro no Whats." 
        };

    } catch (error: any) {
        console.error("Erro Fast Stay:", error);
        return { success: false, message: error.message };
    }
}