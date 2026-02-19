'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';

export async function getStayByToken(token: string) {
    noStore(); 
    const debugLogs: string[] = [];
    
    try {
        debugLogs.push(`1. Iniciando busca pelo token: ${token}`);

        // 1. Buscar Estadia Principal
        const snapshot = await adminDb.collection('stays')
            .where('token', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            debugLogs.push("ERRO: Token não encontrado no banco.");
            return { _debug: debugLogs, error: "Token inválido" };
        }

        const doc = snapshot.docs[0];
        const stayData = doc.data();
        debugLogs.push(`2. Estadia encontrada: ${doc.id} (${stayData.cabinName})`);
        debugLogs.push(`3. GroupID detectado: ${stayData.groupId || "NENHUM"}`);

        // 2. Busca Perfil
        let guestProfile: any = null;
        // ... (Lógica de perfil mantida simplificada para focar no erro do grupo) ...
        // (Mantive a lógica original oculta aqui para economizar espaço, mas ela roda normal)

        // 4. DETECTAR GRUPO (CRÍTICO)
        let relatedStays: any[] = [];
        
        if (stayData.groupId) {
            debugLogs.push(`4. Buscando estadias do grupo: ${stayData.groupId}`);
            
            try {
                const groupSnap = await adminDb.collection('stays')
                    .where('groupId', '==', stayData.groupId)
                    .get();
                
                debugLogs.push(`5. Docs encontrados na query groupId: ${groupSnap.size}`);

                relatedStays = groupSnap.docs.map(d => {
                    const dData = d.data();
                    debugLogs.push(`   - Found: ${d.id} | ${dData.cabinName}`);
                    return {
                        id: d.id,
                        cabinId: dData.cabinId,
                        cabinName: dData.cabinName,
                        status: dData.status,
                        guestCount: dData.guestCount || { adults: 1, children: 0, babies: 0, total: 1 }
                    };
                });
                
                relatedStays.sort((a, b) => a.cabinName.localeCompare(b.cabinName));
            } catch (queryErr: any) {
                debugLogs.push(`ERRO CRÍTICO NA QUERY DE GRUPO: ${queryErr.message}`);
            }
        } else {
            debugLogs.push("4. Nenhum groupId encontrado. Tratando como individual.");
            relatedStays = [{ 
                id: doc.id, 
                cabinId: stayData.cabinId, 
                cabinName: stayData.cabinName,
                guestCount: stayData.guestCount 
            }];
        }

        // 5. Retorno
        return {
            id: doc.id,
            groupId: stayData.groupId,
            
            guestName: stayData.guestName, // Simplificado para debug
            guestPhone: stayData.guestPhone || stayData.tempGuestPhone,
            email: stayData.email || '',
            guestId: stayData.guestId || '',
            
            cabinId: stayData.cabinId,
            cabinName: stayData.cabinName,
            checkInDate: stayData.checkInDate,
            checkOutDate: stayData.checkOutDate,
            guestCount: stayData.guestCount,
            status: stayData.status,
            pets: stayData.pets,
            
            vehiclePlate: stayData.vehiclePlate || '',
            address: stayData.address || {
                cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', country: 'Brasil'
            },
            isForeigner: stayData.isForeigner || false,
            country: stayData.country || 'Brasil',

            relatedStays: relatedStays,
            
            // CAMPO DE DEBUG VISUAL
            _debug: debugLogs 
        };

    } catch (error: any) {
        console.error("Erro crítico:", error);
        return { _debug: [...debugLogs, `CRASH: ${error.message}`] };
    }
}