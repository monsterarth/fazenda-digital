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
            const role = user.customClaims?.role as UserRole;

            if (role === 'manutencao' || role === 'super_admin' || role === 'recepcao') {
                staff.push({
                    uid: user.uid,
                    email: user.email || 'Email não disponível',
                    name: user.displayName || user.email || user.uid,
                });
            }
        });

        const sortedStaff = staff.sort((a, b) => a.name.localeCompare(b.name));

        // ## INÍCIO DA CORREÇÃO ##
        // Força a serialização para um objeto "plano" (plain object)
        // para que possa ser passado com segurança de Server Components
        // para Client Components.
        return JSON.parse(JSON.stringify(sortedStaff));
        // ## FIM DA CORREÇÃO ##

    } catch (error: any) {
        console.error("Erro ao buscar equipe de manutenção:", error.message);
        return [];
    }
}