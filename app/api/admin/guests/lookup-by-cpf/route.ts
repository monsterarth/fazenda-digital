// app/api/admin/guests/lookup-by-cpf/route.ts

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { PreCheckIn } from '@/types';

export async function POST(request: Request) {
    try {
        const { cpf } = await request.json();

        if (!cpf) {
            return new NextResponse("CPF é obrigatório.", { status: 400 });
        }
        
        const numericCpf = cpf.replace(/\D/g, '');
        if (numericCpf.length !== 11) {
             return new NextResponse("CPF inválido.", { status: 400 });
        }

        const preCheckInsRef = adminDb.collection('preCheckIns');
        const q = preCheckInsRef.where('leadGuestDocument', '==', numericCpf).limit(1);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return NextResponse.json(null);
        }

        const preCheckInData = querySnapshot.docs[0].data() as PreCheckIn;

        // CORREÇÃO: Retorna o campo 'document' para ser consistente com o tipo Guest
        const recurringGuestData = {
            id: querySnapshot.docs[0].id,
            name: preCheckInData.leadGuestName,
            document: preCheckInData.leadGuestDocument, // Alterado de 'cpf' para 'document'
            email: preCheckInData.leadGuestEmail,
            phone: preCheckInData.leadGuestPhone,
            isForeigner: preCheckInData.isForeigner,
            country: preCheckInData.address.country,
            address: preCheckInData.address,
        };

        return NextResponse.json(recurringGuestData);

    } catch (error) {
        console.error("Erro ao buscar hóspede por CPF:", error);
        return new NextResponse("Erro interno do servidor.", { status: 500 });
    }
}