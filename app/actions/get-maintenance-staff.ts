// app/actions/get-maintenance-staff.ts

"use server";

import { adminAuth } from "@/lib/firebase-admin";
import { UserRole } from "@/context/AuthContext";
import { StaffMember } from "@/types/maintenance";

/**
 * Busca todos os usuários do Firebase Auth que possuem
 * a custom claim 'role' definida como 'manutencao'.
 */
export async function getMaintenanceStaff(): Promise<StaffMember[]> {
    const staff: StaffMember[] = [];
    
    try {
        const listUsersResult = await adminAuth.listUsers();

        listUsersResult.users.forEach(user => {
            const role = (user.customClaims?.role as UserRole) || null; // Pega a role

            // Vamos incluir todos que têm uma role de staff
            if (role === 'manutencao' || role === 'super_admin' || role === 'recepcao') {
                // ## INÍCIO DA CORREÇÃO ##
                // Adicionamos o campo 'role' que estava faltando
                staff.push({
                    uid: user.uid,
                    email: user.email || 'Email não disponível',
                    name: user.displayName || user.email || user.uid,
                    role: role, // <-- PROPRIEDADE ADICIONADA
                });
                // ## FIM DA CORREÇÃO ##
            }
        });

        const sortedStaff = staff.sort((a, b) => a.name.localeCompare(b.name));

        // Força a serialização para um objeto "plano" (plain object)
        return JSON.parse(JSON.stringify(sortedStaff));

    } catch (error: any) {
        console.error("Erro ao buscar equipe de manutenção:", error.message);
        return [];
    }
}