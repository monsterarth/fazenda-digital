// components/admin/Sidebar.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, BedDouble, Coffee, Calendar, BarChart2, Settings, LogOut,
    Home, Paintbrush, Utensils, CalendarCheck, MessageSquare, FileText, Wrench, Shield, Users,
    ConciergeBell, Book,
    CalendarDays,
    ChefHat, // ++ NOVO: Para Cozinha
    Package, // ++ NOVO: Para Estoque
    Monitor  // ++ NOVO: Para Salão
} from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
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

// Array de navegação principal ATUALIZADO
const mainNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/stays', label: 'Estadias', icon: BedDouble },
    { href: "/admin/comunicacao", label: "Comunicação", icon: MessageSquare },
    { href: "/admin/hospedes", label: "Hóspedes", icon: Users },
    
    // ++ INÍCIO DA ADIÇÃO (Módulos Operacionais) ++
    { href: '/admin/salao', label: 'Salão', icon: Monitor }, // Novo módulo de Mesas
    { href: '/admin/cozinha', label: 'Cozinha', icon: ChefHat }, // Novo KDS
    // ++ FIM DA ADIÇÃO ++

    { href: '/admin/pedidos/cafe', label: 'Pedidos Café (Cestas)', icon: Coffee },
    { href: '/admin/agendamentos', label: 'Agendamentos', icon: Calendar },
    { href: '/admin/casamentos', label: 'Casamentos', icon: CalendarDays },
    { href: '/admin/solicitacoes', label: 'Solicitações', icon: ConciergeBell },
    { href: '/admin/manutencao', label: 'Manutenção', icon: Wrench },
    { href: '/admin/pesquisas/overview', label: 'Pesquisas', icon: BarChart2 },
];

// Array de navegação de configurações ATUALIZADO
const settingsNavItems = [
    { href: '/admin/settings/cabanas', label: 'Cabanas', icon: Home },
    { href: '/admin/settings/personalizacao', label: 'Personalização', icon: Paintbrush },
    
    // ++ INÍCIO DA ADIÇÃO (Estoque) ++
    { href: '/admin/settings/estoque', label: 'Estoque & Custos', icon: Package },
    // ++ FIM DA ADIÇÃO ++

    { href: '/admin/settings/cafe', label: 'Cardápio Café', icon: Utensils },
    { href: '/admin/settings/agendamentos', label: 'Gerenciar Agend.', icon: CalendarCheck },
    { href: '/admin/settings/pesquisas', label: 'Gerenciar Pesquisas', icon: FileText },
    { href: '/admin/settings/servicos', label: 'Itens', icon: Wrench },
    { href: '/admin/settings/guias', label: 'Guias e Manuais', icon: Book }, 
    { href: '/admin/settings/politicas', label: 'Políticas', icon: Shield },
    { href: '/admin/settings/equipe', label: 'Gerenciar Equipe', icon: Users },
];

type Role = UserRole; 

// Mapa de permissões ATUALIZADO
const permissions: Record<string, (Role)[]> = {
    // === Main Nav ===
    '/admin/dashboard': ['recepcao'],
    '/admin/stays': ['recepcao'],
    '/admin/comunicacao': ['recepcao'],
    '/admin/hospedes': ['recepcao'],
    
    // ++ NOVAS PERMISSÕES ++
    '/admin/salao': ['recepcao', 'cafe'],    // Garçons e Recepção acessam o Salão
    '/admin/cozinha': ['recepcao', 'cafe'],  // Cozinha e Recepção acessam o KDS
    // ++ FIM NOVAS PERMISSÕES ++

    '/admin/pedidos/cafe': ['recepcao', 'cafe'],
    '/admin/agendamentos': ['recepcao'],
    '/admin/casamentos': ['recepcao'],
    '/admin/solicitacoes': ['recepcao'],
    '/admin/manutencao': ['recepcao', 'manutencao'],
    '/admin/pesquisas/overview': ['recepcao', 'marketing'],

    // === Settings Nav ===
    '/admin/settings/cabanas': ['recepcao'],
    '/admin/settings/personalizacao': [], // Apenas super_admin
    
    // ++ NOVA PERMISSÃO ESTOQUE ++
    '/admin/settings/estoque': ['recepcao', 'cafe'], // Chef/Cozinha pode gerenciar estoque
    // ++ FIM NOVA PERMISSÃO ++

    '/admin/settings/cafe': ['recepcao', 'cafe'],
    '/admin/settings/agendamentos': ['recepcao'],
    '/admin/settings/pesquisas': ['recepcao', 'marketing'],
    '/admin/settings/servicos': ['recepcao'],
    '/admin/settings/guias': ['recepcao'],
    '/admin/settings/politicas': [], // Apenas super_admin
    '/admin/settings/equipe': [], // Apenas super_admin
};

// Função de verificação de permissão (sem alterações)
const checkPermission = (role: Role, href: string): boolean => {
    if (role === 'super_admin') {
        return true;
    }
    if (!role) {
        return false;
    }
    const baseHref = Object.keys(permissions).find(key => href.startsWith(key));
    if (!baseHref) {
        return false;
    }
    return permissions[baseHref]?.includes(role) ?? false;
};

/** Um simples ponto visual para notificações */
const NotificationDot = () => (
    <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
);

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, userRole } = useAuth();
    const { property } = useProperty();
    const { hasNewRequests, hasNewBookings } = useNotification();

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

    const NavLink = ({ href, label, icon: Icon, disabled, showDot }: {
        href: string,
        label: string,
        icon: React.ElementType,
        disabled?: boolean,
        showDot?: boolean 
    }) => {
        const isActive = (href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href));

        if (disabled) {
            return (
                <span className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed opacity-70",
                    isActive && "text-gray-400"
                )}>
                    <Icon className="h-4 w-4" />
                    {label}
                </span>
            );
        }

        return (
            <Link href={href} className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                isActive && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
            )}>
                <Icon className="h-4 w-4" />
                {label}
                {showDot && <NotificationDot />}
            </Link>
        );
    };

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
                        
                        {mainNavItems.map(item => {
                            const hasPermission = checkPermission(userRole, item.href);
                            
                            const showDot = (item.href === '/admin/solicitacoes' && hasNewRequests) ||
                                            (item.href === '/admin/agendamentos' && hasNewBookings);
                            
                            return <NavLink 
                                key={item.href} 
                                {...item} 
                                disabled={!hasPermission} 
                                showDot={showDot}
                            />
                        })}

                        <Accordion type="single" collapsible className="w-full mt-2" defaultValue={settingsNavItems.some(item => pathname.startsWith(item.href)) ? "settings" : undefined}>
                            <AccordionItem value="settings" className="border-b-0">
                                
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