'use server'

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';
import { revalidatePath } from 'next/cache';

// Função auxiliar para gerar 6 dígitos numéricos
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
    }
}

export async function createFastStayAction(data: FastStayData) {
    try {
        console.log("Criando Fast Stay (Token Numérico)...", data);
        
        // GERAÇÃO DO TOKEN NUMÉRICO
        let token = generateNumericToken();
        
        // (Opcional) Segurança extra: verificar se o token já existe
        // Como a chance é 1 em 1 milhão e o fluxo é rápido, o risco de colisão é baixo,
        // mas em produção crítica faríamos um loop de verificação aqui.

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

        // 2. Lógica do CPF (Se fornecido)
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
        const totalGuests = data.guests.adults + data.guests.children + data.guests.babies;

        await stayRef.set({
            token: token,
            status: 'pending_guest_data', 
            checkInDate: checkInISO,
            checkOutDate: checkOutISO,
            guestName: data.guestName,
            numberOfGuests: totalGuests,
            cabinId: data.cabinId,
            cabinName: cabinName,
            guestId: guestId,
            guestPhone: data.guestPhone,
            tempGuestPhone: data.guestPhone,
            guestCount: {
                adults: data.guests.adults,
                children: data.guests.children,
                babies: data.guests.babies,
                total: totalGuests
            },
            source: 'fast_reception',
            createdAt: Timestamp.now(),
        });

        // 4. Preparar Mensagem do WhatsApp
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

        console.log(`[FastStay] Enviando Whats para ${data.guestPhone} com token ${token}`);
        const result = await sendWhatsAppMessage(data.guestPhone, message);
        
        revalidatePath('/admin/stays');

        return { 
            success: true, 
            message: result.success 
                ? "Estadia criada e Link enviado!" 
                : `Estadia criada, WhatsApp falhou.` 
        };

    } catch (error: any) {
        console.error("Erro Fast Stay:", error);
        return { success: false, message: error.message };
    }
}