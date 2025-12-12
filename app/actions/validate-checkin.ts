'use server'

import { adminDb } from '@/lib/firebase-admin';
import { PreCheckIn, Stay, Cabin, Guest, Property } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { normalizeString } from '@/lib/utils';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client'; // Importamos nosso client

const generateToken = (): string => Math.floor(100000 + Math.random() * 900000).toString();

interface ValidationData {
    cabinId: string;
    dates: {
        from: Date;
        to: Date;
    };
}

export async function validateCheckinAction(checkInId: string, data: ValidationData, adminEmail: string) {
    try {
        // 1. Buscas iniciais no Banco de Dados
        const preCheckInRef = adminDb.collection('preCheckIns').doc(checkInId);
        const preCheckInSnap = await preCheckInRef.get();
        if (!preCheckInSnap.exists) {
            throw new Error("Pré-check-in não encontrado. Pode já ter sido validado.");
        }
        const selectedCheckIn = { ...preCheckInSnap.data(), id: preCheckInSnap.id } as PreCheckIn;

        const cabinRef = adminDb.collection('cabins').doc(data.cabinId);
        const cabinSnap = await cabinRef.get();
        if (!cabinSnap.exists) {
            throw new Error("Cabana selecionada não foi encontrada.");
        }
        const selectedCabin = { id: cabinSnap.id, ...cabinSnap.data() } as Cabin;

        // Buscamos as configurações da propriedade para pegar o Template do WhatsApp
        const propertySnap = await adminDb.collection('properties').doc('default').get();
        const propertyData = propertySnap.exists ? (propertySnap.data() as Property) : null;

        // 2. Normalização de dados
        const normalizedGuestName = normalizeString(selectedCheckIn.leadGuestName);
        const normalizedCompanions = selectedCheckIn.companions?.map(c => ({
            ...c,
            fullName: normalizeString(c.fullName)
        })) || [];

        // 3. Preparação do Batch (Escrita em Lote)
        const batch = adminDb.batch();

        const stayRef = adminDb.collection('stays').doc();
        const token = generateToken();
        const checkInTimestamp = Timestamp.fromDate(new Date(data.dates.from));
        
        const newStay: Omit<Stay, 'id'> = {
            guestName: normalizedGuestName,
            cabinId: selectedCabin.id,
            cabinName: selectedCabin.name,
            checkInDate: data.dates.from.toISOString(),
            checkOutDate: data.dates.to.toISOString(),
            numberOfGuests: 1 + (normalizedCompanions.length || 0),
            token: token,
            status: 'active',
            preCheckInId: selectedCheckIn.id,
            createdAt: checkInTimestamp,
            pets: selectedCheckIn.pets || [],
        };
        batch.set(stayRef, newStay);

        batch.update(preCheckInRef, { 
            status: 'validado', 
            stayId: stayRef.id,
            leadGuestName: normalizedGuestName,
            companions: normalizedCompanions,
        });

        const numericCpf = selectedCheckIn.leadGuestDocument.replace(/\D/g, '');
        const guestRef = adminDb.collection('guests').doc(numericCpf);
        const guestSnap = await guestRef.get();

        if (guestSnap.exists) {
            const guestData = guestSnap.data() as Guest;
            batch.update(guestRef, {
                stayHistory: [...(guestData.stayHistory || []), stayRef.id],
                updatedAt: checkInTimestamp,
                name: normalizedGuestName,
                email: selectedCheckIn.leadGuestEmail,
                phone: selectedCheckIn.leadGuestPhone,
                address: selectedCheckIn.address,
            });
        } else {
            const newGuest: Omit<Guest, 'id'> = {
                name: normalizedGuestName,
                document: numericCpf,
                email: selectedCheckIn.leadGuestEmail,
                phone: selectedCheckIn.leadGuestPhone,
                address: selectedCheckIn.address,
                isForeigner: selectedCheckIn.isForeigner,
                country: selectedCheckIn.address.country,
                createdAt: checkInTimestamp,
                updatedAt: checkInTimestamp,
                stayHistory: [stayRef.id],
            };
            batch.set(guestRef, newGuest);
        }

        const logRef = adminDb.collection('activity_logs').doc();
        batch.set(logRef, {
            timestamp: Timestamp.now(),
            type: 'checkin_validated',
            actor: { type: 'admin', identifier: adminEmail },
            details: `Pré-check-in de ${normalizedGuestName} validado.`,
            link: '/admin/stays'
        });

        // 4. Executa a gravação no banco
        await batch.commit();

        // 5. Integração WhatsApp (Pós-gravação)
        // Só executamos se o commit acima não der erro.
        let whatsappStatus = "não enviado";
        
        if (propertyData && propertyData.messages?.whatsappWelcome && selectedCheckIn.leadGuestPhone) {
            try {
                const firstName = normalizedGuestName.split(' ')[0];
                const portalLink = `https://portal.fazendadorosa.com.br/?token=${token}`;
                
                // Variáveis disponíveis para substituição no template
                const replacements: { [key: string]: string } = {
                    '{guestName}': firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase(),
                    '{propertyName}': propertyData.name || 'Fazenda Digital',
                    '{cabinName}': selectedCabin.name,
                    '{wifiSsid}': selectedCabin.wifiSsid || 'Não informado',
                    '{wifiPassword}': selectedCabin.wifiPassword || 'Não informado',
                    '{portalLink}': portalLink,
                    '{token}': token,
                    // Adicionando variáveis extras que podem ser úteis
                    '{checkInTime}': '15:00', // Padrão, ou pegar de propertyData se existir
                    '{gateCode}': 'Verificar no Portal' 
                };

                let messageBody = propertyData.messages.whatsappWelcome;

                // Executa as substituições
                Object.entries(replacements).forEach(([key, value]) => {
                    messageBody = messageBody.replace(new RegExp(key, 'g'), value);
                });

                console.log(`[Validation] Tentando enviar WhatsApp para ${selectedCheckIn.leadGuestPhone}`);
                
                // Dispara o envio via Docker
                const zapResult = await sendWhatsAppMessage(selectedCheckIn.leadGuestPhone, messageBody);
                
                if (zapResult.success) {
                    whatsappStatus = "enviado com sucesso";
                } else {
                    whatsappStatus = `erro no envio: ${zapResult.error}`;
                    console.error("[Validation] Erro WhatsApp:", zapResult.error);
                }

            } catch (zapError) {
                console.error("[Validation] Erro ao processar envio de WhatsApp:", zapError);
                whatsappStatus = "erro inesperado no envio";
            }
        }

        // 6. Revalidação de Cache e Retorno
        revalidatePath('/admin/stays');
        revalidatePath('/admin/hospedes');

        return { 
            success: true, 
            message: `Estadia validada! WhatsApp: ${whatsappStatus}.`, 
            token: token 
        };

    } catch (error: any) {
        console.error("ERRO NA SERVER ACTION (validateCheckinAction):", error);
        return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
    }
}