// app/api/admin/staff/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';
// ## INÍCIO DA CORREÇÃO ##
// Substituído 'StaffProfile' por 'StaffMember'
import { StaffMember } from '@/types/maintenance';
// ## FIM DA CORREÇÃO ##
import { UserRole } from '@/context/AuthContext';

const staffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["recepcao", "marketing", "cafe", "manutencao", "guarita", "super_admin"]),
});

// GET: Buscar toda a equipe
export async function GET(req: NextRequest) {
  try {
    const listUsersResult = await adminAuth.listUsers();
    
    // ## INÍCIO DA CORREÇÃO ##
    // Mapeia para o tipo 'StaffMember'
    const staff: StaffMember[] = listUsersResult.users.map(user => ({
    // ## FIM DA CORREÇÃO ##
      uid: user.uid,
      email: user.email || 'N/A',
      name: user.displayName || user.email || 'N/A',
      // Note: A role não é facilmente acessível aqui em massa,
      // mas o 'get-maintenance-staff' (action) faz isso.
      // Esta API é mais para gerenciamento.
    }));

    return NextResponse.json({ staff });
  } catch (error: any) {
    return NextResponse.json({ message: `Erro ao buscar equipe: ${error.message}` }, { status: 500 });
  }
}

// POST: Criar um novo membro (convite)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = staffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 });
    }
    
    const { email, name, role } = validation.data;

    // 1. Cria o usuário no Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      displayName: name,
      // (Opcional) Gerar senha temporária ou enviar link de redefinição
    });

    // 2. Define a Custom Claim (Role)
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // (Opcional) Enviar email de "boas-vindas" ou "defina sua senha"

    return NextResponse.json({ message: "Usuário criado e role definida!", uid: userRecord.uid });

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ message: "Este email já está em uso." }, { status: 409 });
    }
    return NextResponse.json({ message: `Erro ao criar usuário: ${error.message}` }, { status: 500 });
  }
}

// PUT: Atualizar a role de um membro existente
export async function PUT(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ message: "UID do usuário é obrigatório." }, { status: 400 });
    }
    
    const body = await req.json();
    // Para 'PUT', só precisamos da 'role' e 'name'
    const validation = staffSchema.pick({ role: true, name: true }).safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 });
    }
    
    const { role, name } = validation.data;

    // 1. Atualiza a Custom Claim (Role)
    await adminAuth.setCustomUserClaims(uid, { role });
    
    // 2. Atualiza o nome
    await adminAuth.updateUser(uid, { displayName: name });

    return NextResponse.json({ message: "Role e nome atualizados com sucesso!" });

  } catch (error: any) {
    return NextResponse.json({ message: `Erro ao atualizar usuário: ${error.message}` }, { status: 500 });
  }
}