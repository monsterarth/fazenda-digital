'use server'

import { adminDb } from '@/lib/firebase-admin';
import { unstable_noStore as noStore } from 'next/cache';
import { startOfMonth, endOfMonth, subDays, addDays } from 'date-fns';
import { Cabin, Stay, PreCheckIn } from '@/types';

export interface SchedulerData {
    cabins: Cabin[];
    stays: Stay[];         // Lista unificada para o Mapa
    fastStays: Stay[];     // Apenas para a lista da aba "Aguardando"
    pendingCheckIns: PreCheckIn[]; // Para a lista legado
}

export async function getSchedulerData(startDateStr?: string, endDateStr?: string): Promise<SchedulerData> {
    noStore();
    
    try {
        const now = new Date();
        const start = startDateStr ? new Date(startDateStr) : subDays(startOfMonth(now), 7);
        const end = endDateStr ? new Date(endDateStr) : addDays(endOfMonth(now), 7);

        // 1. Buscas Paralelas
        const [cabinsSnap, staysSnap, fastStaysSnap, preCheckInsSnap] = await Promise.all([
            // A. Cabanas
            adminDb.collection('cabins').orderBy('posicao', 'asc').get(),
            
            // B. Estadias para o Mapa (Todas que ocupam espaço)
            // Inclui: Ativas, Check-out, Canceladas (para histórico), Pendentes de Validação e Fast Stays
            adminDb.collection('stays')
                .where('status', 'in', ['active', 'checked_out', 'canceled', 'pending_validation', 'pending_guest_data']) 
                .get(),

            // C. Apenas Fast Stays (para a lista lateral/aba)
            adminDb.collection('stays')
                .where('status', '==', 'pending_guest_data')
                .orderBy('createdAt', 'desc')
                .get(),

            // D. Pré-Check-ins Legado (apenas lista)
            adminDb.collection('preCheckIns')
                .where('status', '==', 'pendente')
                .get()
        ]);

        const cabins = cabinsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cabin[];
        const fastStays = fastStaysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Stay[];
        const pendingCheckIns = preCheckInsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PreCheckIn[];

        // Processar estadias para o Mapa
        const allStays = staysSnap.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Garante formato ISO
                    checkInDate: typeof data.checkInDate === 'string' ? data.checkInDate : data.checkInDate?.toDate?.()?.toISOString(),
                    checkOutDate: typeof data.checkOutDate === 'string' ? data.checkOutDate : data.checkOutDate?.toDate?.()?.toISOString(),
                } as Stay;
            })
            // Filtra o que está dentro da visualização do calendário
            .filter(stay => {
                if (!stay.checkInDate || !stay.checkOutDate) return false;
                const stayStart = new Date(stay.checkInDate);
                const stayEnd = new Date(stay.checkOutDate);
                return stayStart < end && stayEnd > start;
            });

        return {
            cabins: JSON.parse(JSON.stringify(cabins)),
            stays: JSON.parse(JSON.stringify(allStays)),
            fastStays: JSON.parse(JSON.stringify(fastStays)),
            pendingCheckIns: JSON.parse(JSON.stringify(pendingCheckIns))
        };

    } catch (error) {
        console.error("Erro ao buscar dados do scheduler:", error);
        return { cabins: [], stays: [], fastStays: [], pendingCheckIns: [] };
    }
}