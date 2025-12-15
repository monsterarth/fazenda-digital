'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';

export type StayStatusResponse = {
    valid: boolean;
    message?: string;
    action?: 'GO_TO_FORM' | 'SHOW_WAITING' | 'DO_LOGIN' | 'SHOW_ENDED';
    stayData?: any; // Dados para pré-preencher o formulário ou mostrar na tela
};

export async function checkStayStatusAction(token: string): Promise<StayStatusResponse> {
    noStore(); // Garante que não haja cache na validação
    
    try {
        // 1. Validação básica
        if (!token || token.length < 3) {
            return { valid: false, message: "Código inválido." };
        }

        console.log(`[CheckStatus] Verificando token: ${token}`);

        // 2. Busca no Firestore
        const snapshot = await adminDb.collection('stays')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { valid: false, message: "Reserva não encontrada. Verifique o código." };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        const status = data.status || 'pending_guest_data'; // Fallback seguro

        console.log(`[CheckStatus] Estadia encontrada. Status: ${status} | Pets: ${JSON.stringify(data.pets)}`);

        // 3. Roteamento Inteligente (State Machine)
        
        // CASO A: Hóspede ainda não preencheu os dados
        if (status === 'pending_guest_data') {
            
            // Normalização rápida dos pets para garantir integridade
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
                    guestName: data.guestName,
                    guestPhone: data.guestPhone || data.tempGuestPhone, // Prioriza o oficial
                    guestId: data.guestId, // CPF se houver
                    email: data.email,
                    cabinName: data.cabinName,
                    cabinId: data.cabinId,
                    // Passamos as datas para mostrar no cabeçalho do form se quiser
                    checkInDate: data.checkInDate, 
                    checkOutDate: data.checkOutDate,
                    guestCount: data.guestCount,
                    
                    // --- CORREÇÃO AQUI: Passando os dados de Pets e Placa ---
                    pets: normalizedPets,
                    vehiclePlate: data.vehiclePlate || ''
                }
            };
        }

        // CASO B: Hóspede já preencheu, mas recepção não aprovou
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

        // CASO C: Estadia Ativa (Login direto)
        if (status === 'active') {
            return {
                valid: true,
                action: 'DO_LOGIN',
                stayData: {
                    token: token // Confirma o token para o login
                }
            };
        }

        // CASO D: Estadia Encerrada
        if (status === 'checked_out') {
            return {
                valid: true,
                action: 'SHOW_ENDED',
                message: "Esta estadia já foi encerrada."
            };
        }

        // Fallback para status desconhecidos
        return { valid: false, message: "Status da estadia desconhecido." };

    } catch (error: any) {
        console.error("Erro ao verificar status:", error);
        return { valid: false, message: "Erro interno ao verificar reserva." };
    }
}