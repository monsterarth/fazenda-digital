// app/api/admin/staff/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';
import { StaffMember } from '@/types/maintenance';
import { UserRole } from '@/context/AuthContext';

const staffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["recepcao", "marketing", "cafe", "manutencao", "guarita", "super_admin"]),
});

// ## INÍCIO DA CORREÇÃO (GET) ##
// GET: Buscar toda a equipe COM ROLES
export async function GET(req: NextRequest) {
  try {
    // Lista os usuários básicos
    const listUsersResult = await adminAuth.listUsers(1000); // Limite de 1000
    
    // Para obter 'customClaims', precisamos buscar cada usuário individualmente.
    const staffPromises = listUsersResult.users.map(async (user) => {
      // Busca o registro completo do usuário para acessar 'customClaims'
      const userRecord = await adminAuth.getUser(user.uid);
      const role = (userRecord.customClaims?.role as UserRole) || null;

      return {
        uid: user.uid,
        email: user.email || 'N/A',
        name: user.displayName || user.email || 'N/A',
        role: role, // <-- Retorna a role!
      };
    });

    const staff = await Promise.all(staffPromises);

    return NextResponse.json({ staff });

  } catch (error: any) {
    return NextResponse.json({ message: `Erro ao buscar equipe: ${error.message}` }, { status: 500 });
  }
}
// ## FIM DA CORREÇÃO (GET) ##

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
    });

    // 2. Define a Custom Claim (Role)
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

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

// ## INÍCIO DA ADIÇÃO (DELETE) ##
// DELETE: Excluir um usuário
export async function DELETE(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ message: "UID do usuário é obrigatório." }, { status: 400 });
    }

    // Exclui o usuário do Firebase Authentication
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ message: "Usuário excluído com sucesso!" });

  } catch (error: any) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json({ message: `Erro ao excluir usuário: ${error.message}` }, { status: 500 });
  }
}
// ## FIM DA ADIÇÃO (DELETE) ##