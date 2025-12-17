'use server'

import { adminDb } from '@/lib/firebase-admin';
import { PreCheckIn, Stay, Cabin, Guest, Property } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { normalizeString } from '@/lib/utils';
import { sendWhatsAppMessage } from '@/lib/whatsapp-client';

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
        console.log(`[Validate] Iniciando validação para ID: ${checkInId}`);

        // 1. Identificar a Fonte (Se é uma Estadia já existente ou um Pré-Check-in isolado)
        let stayRef = adminDb.collection('stays').doc(checkInId);
        let preCheckInRef = adminDb.collection('preCheckIns').doc(checkInId);

        const [staySnap, preCheckInSnap] = await Promise.all([
            stayRef.get(),
            preCheckInRef.get()
        ]);

        let sourceData: any = null;
        let isExistingStay = false;
        let preCheckInId: string | null = null;

        // LÓGICA DE DETECÇÃO DE DUPLICIDADE
        if (staySnap.exists) {
            // CENÁRIO 1: O ID passado JÁ É de uma estadia (Fluxo Fast Stay)
            console.log("[Validate] Documento encontrado na coleção 'stays'. Atualizando estadia existente.");
            sourceData = { ...staySnap.data(), id: staySnap.id };
            isExistingStay = true;
            
            // Se tiver um preCheckInId vinculado na estadia, atualizamos ele também
            if (sourceData.preCheckInId) {
                preCheckInId = sourceData.preCheckInId;
                preCheckInRef = adminDb.collection('preCheckIns').doc(sourceData.preCheckInId);
            }
        } else if (preCheckInSnap.exists) {
            // CENÁRIO 2: O ID passado é de um Pré-Check-in (Fluxo Web Padrão)
            console.log("[Validate] Documento encontrado na coleção 'preCheckIns'.");
            sourceData = { ...preCheckInSnap.data(), id: preCheckInSnap.id };
            preCheckInId = preCheckInSnap.id;

            // Verificar se esse Pré-Check-in já tem uma estadia criada (Prevenção extra)
            if (sourceData.stayId) {
                console.log(`[Validate] Este pré-check-in já possui a estadia ${sourceData.stayId}. Alternando para modo de atualização.`);
                stayRef = adminDb.collection('stays').doc(sourceData.stayId);
                isExistingStay = true;
            } else {
                console.log("[Validate] Criando NOVA estadia a partir do pré-check-in.");
                stayRef = adminDb.collection('stays').doc(); // Gera novo ID apenas aqui
                isExistingStay = false;
            }
        } else {
            throw new Error("Documento de origem (Estadia ou Pré-Check-in) não encontrado.");
        }

        // 2. Buscar Dados da Cabana e Propriedade (Comum a ambos)
        const cabinRef = adminDb.collection('cabins').doc(data.cabinId);
        const cabinSnap = await cabinRef.get();
        if (!cabinSnap.exists) throw new Error("Cabana selecionada não foi encontrada.");
        const selectedCabin = { id: cabinSnap.id, ...cabinSnap.data() } as Cabin;

        const propertySnap = await adminDb.collection('properties').doc('default').get();
        const propertyData = propertySnap.exists ? (propertySnap.data() as Property) : null;

        // 3. Normalização e CÁLCULO DE GUEST COUNT (ACF)
        const rawName = sourceData.leadGuestName || sourceData.guestName || "Hóspede";
        const normalizedGuestName = normalizeString(rawName);
        
        const rawCompanions = sourceData.companions || [];
        const normalizedCompanions = rawCompanions.map((c: any) => ({
            ...c,
            fullName: normalizeString(c.fullName)
        }));

        // LÓGICA ACF: Conta o hóspede principal como Adulto + Acompanhantes
        let adults = 1; // Hóspede principal conta como adulto
        let children = 0;
        let babies = 0;

        normalizedCompanions.forEach((c: any) => {
            if (c.category === 'adult') adults++;
            else if (c.category === 'child') children++;
            else if (c.category === 'baby') babies++;
            else {
                // Fallback para legado (se vier idade numérica antiga)
                const age = parseInt(c.age);
                if (!isNaN(age)) {
                    if (age >= 18) adults++;
                    else if (age >= 6) children++;
                    else babies++;
                } else {
                    adults++; // Padrão se não souber
                }
            }
        });

        const totalGuests = adults + children + babies;

        // 4. Preparação do Batch
        const batch = adminDb.batch();
        const checkInTimestamp = Timestamp.fromDate(new Date(data.dates.from));
        
        // Se a estadia já existe, mantemos o token dela. Se nova, geramos um.
        const token = (isExistingStay && sourceData.token) ? sourceData.token : generateToken();

        const stayPayload: any = {
            status: 'active',
            guestName: normalizedGuestName,
            cabinId: selectedCabin.id,
            cabinName: selectedCabin.name,
            checkInDate: data.dates.from.toISOString(),
            checkOutDate: data.dates.to.toISOString(),
            
            numberOfGuests: totalGuests,
            guestCount: {
                adults,
                children,
                babies,
                total: totalGuests
            },
            
            token: token,
            pets: sourceData.pets || [],
            updatedAt: Timestamp.now(),
        };

        if (!isExistingStay) {
            stayPayload.createdAt = checkInTimestamp;
            stayPayload.preCheckInId = preCheckInId;
        }

        if (isExistingStay) {
            batch.update(stayRef, stayPayload);
        } else {
            batch.set(stayRef, stayPayload);
        }

        // Atualiza o Status do Pré-Check-in (se existir referência)
        if (preCheckInId) {
            batch.update(preCheckInRef, { 
                status: 'validado', 
                stayId: stayRef.id,
                leadGuestName: normalizedGuestName,
                companions: normalizedCompanions,
            });
        }

        // 5. Atualização/Criação do Perfil do Hóspede (Guest)
        const rawDoc = sourceData.leadGuestDocument || sourceData.guestId || sourceData.cpf;
        
        if (rawDoc) {
            const numericCpf = rawDoc.replace(/\D/g, '');
            if (numericCpf) {
                const guestRef = adminDb.collection('guests').doc(numericCpf);
                const guestSnap = await guestRef.get();

                const guestCommonData = {
                    name: normalizedGuestName,
                    email: sourceData.leadGuestEmail || sourceData.email || "",
                    phone: sourceData.leadGuestPhone || sourceData.guestPhone || "",
                    address: sourceData.address || {},
                    updatedAt: Timestamp.now(),
                };

                if (guestSnap.exists) {
                    const guestData = guestSnap.data() as Guest;
                    const history = new Set(guestData.stayHistory || []);
                    history.add(stayRef.id);

                    batch.update(guestRef, {
                        ...guestCommonData,
                        stayHistory: Array.from(history),
                    });
                } else {
                    batch.set(guestRef, {
                        ...guestCommonData,
                        document: numericCpf,
                        isForeigner: !!sourceData.isForeigner,
                        country: sourceData.address?.country || 'Brasil',
                        createdAt: Timestamp.now(),
                        stayHistory: [stayRef.id],
                    });
                }
            }
        }

        // Log de Atividade
        const logRef = adminDb.collection('activity_logs').doc();
        batch.set(logRef, {
            timestamp: Timestamp.now(),
            type: 'checkin_validated',
            actor: { type: 'admin', identifier: adminEmail },
            details: `Estadia de ${normalizedGuestName} validada via ${isExistingStay ? 'Atualização Fast Stay' : 'Novo Check-in'}.`,
            link: '/admin/stays'
        });

        // 6. Executa a gravação
        await batch.commit();

        // 7. Integração WhatsApp (Boas Vindas)
        let whatsappStatus = "não enviado";
        const guestPhone = sourceData.leadGuestPhone || sourceData.guestPhone;

        // Só envia mensagem se tiver telefone e configuração ativa
        if (propertyData && propertyData.messages?.whatsappWelcome && guestPhone) {
            try {
                const firstName = normalizedGuestName.split(' ')[0];
                const portalLink = `https://portal.fazendadorosa.com.br/?token=${token}`;
                
                const replacements: { [key: string]: string } = {
                    '{guestName}': firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase(),
                    '{propertyName}': propertyData.name || 'Fazenda Digital',
                    '{cabinName}': selectedCabin.name,
                    '{wifiSsid}': selectedCabin.wifiSsid || 'Não informado',
                    '{wifiPassword}': selectedCabin.wifiPassword || 'Não informado',
                    '{portalLink}': portalLink,
                    '{token}': token,
                    '{checkInTime}': '15:00',
                    '{gateCode}': 'Verificar no Portal' 
                };

                let messageBody = propertyData.messages.whatsappWelcome;

                Object.entries(replacements).forEach(([key, value]) => {
                    messageBody = messageBody.replace(new RegExp(key, 'g'), value);
                });

                console.log(`[Validation] Enviando WhatsApp para ${guestPhone}`);
                const zapResult = await sendWhatsAppMessage(guestPhone, messageBody);
                
                if (zapResult.success) {
                    whatsappStatus = "enviado com sucesso";
                    
                    // --- CORREÇÃO: REGISTRO DO LOG PARA TIMELINE ---
                    try {
                        // A) Log na coleção message_logs (Para a Timeline funcionar)
                        await adminDb.collection('message_logs').add({
                            type: 'whatsappWelcome', // ID CRUCIAL
                            content: messageBody,
                            guestName: normalizedGuestName,
                            stayId: stayRef.id,
                            actor: adminEmail, 
                            sentAt: Timestamp.now(),
                            status: 'sent_via_api',
                            phone: guestPhone
                        });

                        // B) Atualiza status na estadia (Redundância)
                        await stayRef.update({
                            'communicationStatus.welcomeMessageSentAt': Timestamp.now()
                        });
                        
                    } catch (logErr) {
                        console.error("Erro ao registrar log de boas-vindas:", logErr);
                    }
                    // --------------------------------------------------

                } else {
                    whatsappStatus = `erro no envio: ${zapResult.error}`;
                }
            } catch (zapError) {
                console.error("[Validation] Erro envio WhatsApp:", zapError);
            }
        }

        revalidatePath('/admin/stays');
        revalidatePath('/admin/hospedes');
        revalidatePath('/admin/comunicacao'); // Garante que o painel atualize

        return { 
            success: true, 
            message: `Estadia validada com sucesso! (${isExistingStay ? 'Atualizada' : 'Criada'}). WhatsApp: ${whatsappStatus}.`, 
            token: token 
        };

    } catch (error: any) {
        console.error("ERRO NA SERVER ACTION (validateCheckinAction):", error);
        return { success: false, message: error.message || "Ocorreu um erro desconhecido." };
    }
}