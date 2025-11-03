// app/api/admin/staff/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin'; // SDK Admin

// ++ ESTA É A CORREÇÃO ++
// 1. Importamos o Timestamp do ADMIN e damos um 'alias'
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
// 2. Importamos o Timestamp do CLIENTE (que é o que a interface StaffProfile usa)
import { Timestamp as ClientTimestamp } from 'firebase/firestore'; 
// ++ FIM DA CORREÇÃO ++

import { StaffProfile } from '@/types/maintenance';

/**
 * API para criar um novo funcionário (usuário no Auth) e seu
 * perfil no Firestore ('staff_profiles').
 * Apenas 'super_admin' pode chamar esta API.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar o token do chamador (deve ser super_admin)
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorização ausente.' }, { status: 401 });
    }
    
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken); 

    if (decodedToken.role !== 'super_admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas Super Admins podem criar funcionários.' }, { status: 403 });
    }

    // 2. Obter os dados do novo funcionário do body
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes: name, email, password, role.' }, { status: 400 });
    }

    // 3. Criar o usuário no Firebase Authentication
    const userRecord = await adminAuth.createUser({ 
      email: email,
      password: password,
      displayName: name,
      disabled: false,
    });

    // 4. Definir a 'role' do usuário (Custom Claim)
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: role }); 

    // 5. Criar o perfil do funcionário na coleção 'staff_profiles'
    const newStaffProfile: Omit<StaffProfile, 'id'> = {
      name: name,
      email: email,
      role: role,
      isActive: true,
      // ++ CORREÇÃO: Usamos o AdminTimestamp para criar o valor,
      // mas fazemos um 'cast' para o ClientTimestamp para satisfazer a interface.
      createdAt: AdminTimestamp.now() as ClientTimestamp,
    };
    
    // O ID do documento é o UID do usuário
    // O adminDb.set() aceitará o objeto AdminTimestamp sem problemas.
    await adminDb.collection('staff_profiles').doc(userRecord.uid).set(newStaffProfile); 

    // 6. [Específico da Manutenção] Se a role for 'manutencao', cria o perfil de performance.
    if (role === 'manutencao') {
      await adminDb.collection('maintenance_staff').doc(userRecord.uid).set({ 
        id: userRecord.uid,
        name: name,
        isActive: true,
        totalPoints: 0,
      });
    }

    return NextResponse.json({ success: true, uid: userRecord.uid, message: `Funcionário ${name} criado com sucesso.` }, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar funcionário [API]:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'Este e-mail já está em uso.' }, { status: 409 });
    }
    
    return NextResponse.json({ error: `Falha ao criar funcionário: ${error.message}` }, { status: 500 });
  }
}