// app/api/admin/guests/lookup/route.ts

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { Guest } from '@/types/guest';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

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

        const guestsRef = collection(db, 'guests');
        const q = query(guestsRef, where('cpf', '==', numericCpf), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return NextResponse.json(null); // Nenhum hóspede encontrado
        }

        const guest = {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data()
        } as Guest;

        return NextResponse.json(guest);

    } catch (error) {
        console.error("Erro ao buscar hóspede por CPF:", error);
        return new NextResponse("Erro interno do servidor.", { status: 500 });
    }
}