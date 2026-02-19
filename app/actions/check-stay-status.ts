'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';

export type StayStatusResponse = {
    valid: boolean;
    message?: string;
    action?: 'GO_TO_FORM' | 'SHOW_WAITING' | 'DO_LOGIN' | 'SHOW_ENDED';
    stayData?: any; 
};

export async function checkStayStatusAction(token: string): Promise<StayStatusResponse> {
    noStore(); 
    
    try {
        // 1. Validação do Token
        if (!token || token.length < 3) {
            return { valid: false, message: "Código inválido." };
        }

        console.log(`[CheckStatus] Verificando token: ${token}`);

        // 2. Busca da Estadia no Firestore
        const snapshot = await adminDb.collection('stays')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { valid: false, message: "Reserva não encontrada. Verifique o código." };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        const status = data.status || 'pending_guest_data'; 

        // ---------------------------------------------------------
        // NOVO: Busca Inteligente do Perfil do Hóspede (Guest Profile)
        // ---------------------------------------------------------
        let guestProfile: any = null;
        
        // Coleta possíveis chaves para encontrar o hóspede (CPF na estadia, GuestID, etc)
        const possibleIds = [
            data.guestId,           
            data.guestDocument,     
            data.cpf,               
            data.document           
        ].filter(id => id && typeof id === 'string');

        const uniqueIds = Array.from(new Set(possibleIds));

        for (const rawId of uniqueIds) {
            if (guestProfile) break;
            const cleanId = rawId.replace(/\D/g, ''); 
            
            if (cleanId.length >= 10) { 
                // Tenta pelo ID do documento (Se o ID do doc for o CPF)
                const docRef = await adminDb.collection('guests').doc(cleanId).get();
                if (docRef.exists) {
                    guestProfile = docRef.data();
                    break;
                }
                // Tenta query pelo campo 'document' dentro do doc
                const queryCpf = await adminDb.collection('guests').where('document', '==', cleanId).limit(1).get();
                if (!queryCpf.empty) {
                    guestProfile = queryCpf.docs[0].data();
                    break;
                }
            }
        }
        // ---------------------------------------------------------

        // 3. Lógica de Grupo
        let relatedStays: any[] = [];
        
        if (data.groupId) {
            const groupSnap = await adminDb.collection('stays')
                .where('groupId', '==', data.groupId)
                .get();
            
            relatedStays = groupSnap.docs.map(d => ({
                id: d.id,
                cabinId: d.data().cabinId,
                cabinName: d.data().cabinName,
                status: d.data().status,
                guestCount: d.data().guestCount || { adults: 1, children: 0, babies: 0, total: 1 }
            }));
            
            relatedStays.sort((a, b) => a.cabinName.localeCompare(b.cabinName));
        } else {
            relatedStays = [{ 
                id: doc.id, 
                cabinId: data.cabinId, 
                cabinName: data.cabinName,
                guestCount: data.guestCount 
            }];
        }

        // 4. Roteamento Inteligente
        if (status === 'pending_guest_data') {
            
            let normalizedPets: any = 0;
            if (Array.isArray(data.pets)) {
                normalizedPets = data.pets;
            } else {
                normalizedPets = Number(data.pets) || 0;
            }

            return {
                valid: true,
                action: 'GO_TO_FORM',
                stayData: {
                    id: doc.id,
                    groupId: data.groupId,
                    
                    // --- DADOS PESSOAIS E ENDEREÇO (Prioridade: Perfil > Estadia) ---
                    guestName: guestProfile?.name || data.guestName,
                    guestPhone: guestProfile?.phone || data.guestPhone || data.tempGuestPhone,
                    email: guestProfile?.email || data.email || '',
                    guestId: guestProfile?.document || data.guestId || '', // CPF
                    
                    // Endereço completo puxado do perfil (se existir)
                    address: guestProfile?.address || data.address || {
                        cep: '', street: '', number: '', complement: '', 
                        neighborhood: '', city: '', state: '', country: 'Brasil'
                    },
                    
                    // Outros dados complementares
                    vehiclePlate: guestProfile?.vehiclePlate || data.vehiclePlate || '',
                    isForeigner: guestProfile?.isForeigner || data.isForeigner || false,
                    country: guestProfile?.country || data.country || 'Brasil',
                    
                    // --- DADOS DA ESTADIA (Imutáveis) ---
                    cabinName: data.cabinName,
                    cabinId: data.cabinId,
                    checkInDate: data.checkInDate, 
                    checkOutDate: data.checkOutDate,
                    guestCount: data.guestCount,
                    pets: normalizedPets,
                    
                    relatedStays: relatedStays 
                }
            };
        }

        if (status === 'pending_validation') {
            return {
                valid: true,
                action: 'SHOW_WAITING',
                stayData: {
                    guestName: data.guestName,
                    cabinName: data.cabinName
                }
            };
        }

        if (status === 'active') {
            return {
                valid: true,
                action: 'DO_LOGIN',
                stayData: {
                    token: token 
                }
            };
        }

        if (status === 'checked_out') {
            return {
                valid: true,
                action: 'SHOW_ENDED',
                message: "Esta estadia já foi encerrada."
            };
        }

        return { valid: false, message: "Status da estadia desconhecido." };

    } catch (error: any) {
        console.error("Erro ao verificar status:", error);
        return { valid: false, message: "Erro interno ao verificar reserva." };
    }
}