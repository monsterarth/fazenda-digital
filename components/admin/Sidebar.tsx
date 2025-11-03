//components/admin/Sidebar.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, BedDouble, Coffee, Calendar, BarChart2, Settings, LogOut,
    Home, Paintbrush, Utensils, CalendarCheck, MessageSquare, FileText, Wrench, Shield, Users,
    ConciergeBell, Book // Ícone para Guias
} from 'lucide-react';
// ++ ATUALIZADO: Importa useAuth e o novo UserRole
import { useAuth, UserRole } from '@/context/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import { toast } from 'sonner';
import Image from 'next/image';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { useProperty } from '@/context/PropertyContext';

// ++ ATUALIZADO: Adicionado 'Manutenção'
const mainNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/stays', label: 'Estadias', icon: BedDouble },
    { href: "/admin/comunicacao", label: "Comunicação", icon: MessageSquare },
    { href: "/admin/hospedes", label: "Hóspedes", icon: Users },
    { href: '/admin/pedidos/cafe', label: 'Pedidos Café', icon: Coffee },
    { href: '/admin/agendamentos', label: 'Agendamentos', icon: Calendar },
    { href: '/admin/solicitacoes', label: 'Solicitações', icon: ConciergeBell },
    { href: '/admin/manutencao', label: 'Manutenção', icon: Wrench }, // ++ NOVO LINK
    { href: '/admin/pesquisas/overview', label: 'Pesquisas', icon: BarChart2 },
];

// ++ ATUALIZADO: Adicionado 'Gerenciar Equipe'
const settingsNavItems = [
    { href: '/admin/settings/cabanas', label: 'Cabanas', icon: Home },
    { href: '/admin/settings/personalizacao', label: 'Personalização', icon: Paintbrush },
    { href: '/admin/settings/cafe', label: 'Cardápio Café', icon: Utensils },
    { href: '/admin/settings/agendamentos', label: 'Gerenciar Agend.', icon: CalendarCheck },
    { href: '/admin/settings/pesquisas', label: 'Gerenciar Pesquisas', icon: FileText },
    { href: '/admin/settings/servicos', label: 'Itens', icon: Wrench },
    { href: '/admin/settings/guias', label: 'Guias e Manuais', icon: Book }, 
    { href: '/admin/settings/politicas', label: 'Políticas', icon: Shield },
    { href: '/admin/settings/equipe', label: 'Gerenciar Equipe', icon: Users }, // ++ NOVO LINK
];

// ++ NOVO: Mapa de Permissões (quem pode ver o quê)
type Role = UserRole; // 'super_admin' | 'recepcao' | 'marketing' | 'cafe' | 'manutencao' | 'guarita' | null

const permissions: Record<string, (Role)[]> = {
    // === Main Nav ===
    '/admin/dashboard': ['recepcao'],
    '/admin/stays': ['recepcao'],
    '/admin/comunicacao': ['recepcao'],
    '/admin/hospedes': ['recepcao'],
    '/admin/pedidos/cafe': ['recepcao', 'cafe'],
    '/admin/agendamentos': ['recepcao'],
    '/admin/solicitacoes': ['recepcao'],
    '/admin/manutencao': ['recepcao', 'manutencao'],
    '/admin/pesquisas/overview': ['recepcao', 'marketing'],

    // === Settings Nav ===
    '/admin/settings/cabanas': ['recepcao'],
    '/admin/settings/personalizacao': [], // Apenas super_admin
    '/admin/settings/cafe': ['recepcao', 'cafe'],
    '/admin/settings/agendamentos': ['recepcao'],
    '/admin/settings/pesquisas': ['recepcao', 'marketing'],
    '/admin/settings/servicos': ['recepcao'],
    '/admin/settings/guias': ['recepcao'],
    '/admin/settings/politicas': [], // Apenas super_admin
    '/admin/settings/equipe': [], // ++ NOVO: Apenas super_admin
};

// ++ NOVO: Helper de verificação
/**
 * Verifica se o usuário tem permissão para acessar uma rota.
 * 'super_admin' sempre tem permissão.
 */
const checkPermission = (role: Role, href: string): boolean => {
    if (role === 'super_admin') {
        return true;
    }
    if (!role) {
        return false;
    }
    // Verifica se a rota está no mapa de permissões e se a role está incluída
    return permissions[href]?.includes(role) ?? false;
};


export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    // ++ ATUALIZADO: Puxa 'user' e 'userRole'
    const { user, userRole } = useAuth();
    const { property } = useProperty();

    const handleLogout = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            toast.success("Logout realizado com sucesso.");
            router.push('/admin/login');
        } catch (error) {
            toast.error("Erro ao fazer logout.");
            console.error("Logout error:", error);
        }
    };

    // ++ ATUALIZADO: NavLink agora aceita 'disabled'
    const NavLink = ({ href, label, icon: Icon, disabled }: {
        href: string,
        label: string,
        icon: React.ElementType,
        disabled?: boolean
    }) => {
        const isActive = pathname.startsWith(href);

        // Se estiver desabilitado, renderiza um <span>
        if (disabled) {
            return (
                <span className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed opacity-70",
                    isActive && "text-gray-400" // Garante que mesmo ativo, pareça desabilitado
                )}>
                    <Icon className="h-4 w-4" />
                    {label}
                </span>
            );
        }

        // Se estiver habilitado, renderiza um <Link>
        return (
            <Link href={href} className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                isActive && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
            )}>
                <Icon className="h-4 w-4" />
                {label}
            </Link>
        );
    };

    // ++ NOVO: Verifica permissão para o grupo de Configurações
    const canAccessSettings = settingsNavItems.some(item => checkPermission(userRole, item.href));

    return (
        <aside className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-[60px] items-center border-b px-6">
                    <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
                        {property?.logoUrl && <Image src={property.logoUrl} alt="Logo" width={32} height={32} className="rounded-md" />}
                        <span className="">{property?.name || 'Admin'}</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-4 text-sm font-medium">
                        
                        {/* ++ ATUALIZADO: Mapeamento com verificação de permissão */}
                        {mainNavItems.map(item => {
                            const hasPermission = checkPermission(userRole, item.href);
                            return <NavLink key={item.href} {...item} disabled={!hasPermission} />
                        })}

                        <Accordion type="single" collapsible className="w-full mt-2" defaultValue={settingsNavItems.some(item => pathname.startsWith(item.href)) ? "settings" : undefined}>
                            <AccordionItem value="settings" className="border-b-0">
                                
                                {/* ++ ATUALIZADO: Trigger desabilitado se não houver acesso a NENHUM item */}
                                <AccordionTrigger
                                    disabled={!canAccessSettings}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 [&[data-state=open]>svg]:rotate-180",
                                        settingsNavItems.some(item => pathname.startsWith(item.href)) && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
                                        !canAccessSettings && "text-gray-400 cursor-not-allowed opacity-70"
                                    )}>
                                    <Settings className="h-4 w-4" />
                                    <span>Configurações</span>
                                </AccordionTrigger>
                                <AccordionContent className="pl-7 pt-2">
                                    <nav className="grid gap-1">
                                        
                                        {/* ++ ATUALIZADO: Mapeamento com verificação de permissão */}
                                        {settingsNavItems.map(item => {
                                             const hasPermission = checkPermission(userRole, item.href);
                                             return <NavLink key={item.href} {...item} disabled={!hasPermission} />
                                        })}
                                    </nav>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                    </nav>
                </div>
                {user && (
                    <div className="mt-auto p-4 border-t">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                        >
                            <LogOut className="h-4 w-4" />
                            Sair
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}