// app/api/admin/staff/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';
import { StaffMember } from '@/types/maintenance';
import { UserRole } from '@/context/AuthContext';

// Schema principal (usado no POST)
const staffSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(["recepcao", "marketing", "cafe", "manutencao", "guarita", "super_admin"]),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").optional(),
});

// ++ NOVO: Schema para o PUT (todos os campos são opcionais)
const staffUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["recepcao", "marketing", "cafe", "manutencao", "guarita", "super_admin"]).optional(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").optional(),
});


// GET: Buscar toda a equipe COM ROLES
export async function GET(req: NextRequest) {
  try {
    const listUsersResult = await adminAuth.listUsers(1000); 
    
    const staffPromises = listUsersResult.users.map(async (user) => {
      const userRecord = await adminAuth.getUser(user.uid);
      const role = (userRecord.customClaims?.role as UserRole) || null;

      return {
        uid: user.uid,
        email: user.email || 'N/A',
        name: user.displayName || user.email || 'N/A',
        role: role,
      };
    });

    const staff = await Promise.all(staffPromises);
    return NextResponse.json({ staff });

  } catch (error: any) {
    return NextResponse.json({ message: `Erro ao buscar equipe: ${error.message}` }, { status: 500 });
  }
}

// POST: Criar um novo membro (com senha)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Usa o schema principal que exige 'email', 'name', 'role'
    const validation = staffSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 });
    }
    
    const { email, name, role, password } = validation.data;

    if (!password) {
      return NextResponse.json({ message: "A senha é obrigatória para criar um novo usuário." }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email,
      password: password,
      displayName: name,
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    return NextResponse.json({ message: "Usuário criado com senha e role definida!", uid: userRecord.uid });

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ message: "Este email já está em uso." }, { status: 409 });
    }
    return NextResponse.json({ message: `Erro ao criar usuário: ${error.message}` }, { status: 500 });
  }
}

// ++ ATUALIZADO: PUT agora pode atualizar 'name', 'role' ou 'password'
export async function PUT(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ message: "UID do usuário é obrigatório." }, { status: 400 });
    }
    
    const body = await req.json();
    // Usa o novo schema de atualização (campos opcionais)
    const validation = staffUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 });
    }
    
    const { role, name, password } = validation.data;

    // Se nenhum dado foi enviado, retorna erro.
    if (!role && !name && !password) {
      return NextResponse.json({ message: "Nenhum dado fornecido para atualização." }, { status: 400 });
    }

    // Objeto para armazenar atualizações do usuário
    let userUpdate: { displayName?: string; password?: string } = {};

    // 1. Atualiza a Custom Claim (Role) se fornecida
    if (role) {
      await adminAuth.setCustomUserClaims(uid, { role });
    }
    
    // 2. Adiciona o nome ao objeto de atualização, se fornecido
    if (name) {
      userUpdate.displayName = name;
    }

    // 3. Adiciona a senha ao objeto de atualização, se fornecida
    if (password) {
      userUpdate.password = password;
    }

    // 4. Executa a atualização no Auth (se houver nome ou senha)
    if (Object.keys(userUpdate).length > 0) {
      await adminAuth.updateUser(uid, userUpdate);
    }

    return NextResponse.json({ message: "Usuário atualizado com sucesso!" });

  } catch (error: any) {
    return NextResponse.json({ message: `Erro ao atualizar usuário: ${error.message}` }, { status: 500 });
  }
}

// DELETE: Excluir um usuário
export async function DELETE(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ message: "UID do usuário é obrigatório." }, { status: 400 });
    }

    await adminAuth.deleteUser(uid);

    return NextResponse.json({ message: "Usuário excluído com sucesso!" });

  } catch (error: any) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json({ message: `Erro ao excluir usuário: ${error.message}` }, { status: 500 });
  }
}