// components/admin/Header.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, BedDouble, Coffee, Calendar, BarChart2, Settings, LogOut,
    Home, Paintbrush, Utensils, CalendarCheck, MessageSquare, FileText, Wrench, Shield, Users,
    ConciergeBell, Book, // Ícone para Guias
    Menu // ++ Ícone do Hambúrguer ++
} from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import { toast } from 'sonner';
import Image from 'next/image';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useProperty } from '@/context/PropertyContext';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// === INÍCIO: Lógica copiada de Sidebar.tsx ===
// Mantemos essa lógica sincronizada entre os dois arquivos.

// ++ ATUALIZADO: Adicionado 'Manutenção'
const mainNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/stays', label: 'Estadias', icon: BedDouble },
    { href: "/admin/comunicacao", label: "Comunicação", icon: MessageSquare },
    { href: "/admin/hospedes", label: "Hóspedes", icon: Users },
    { href: '/admin/pedidos/cafe', label: 'Pedidos Café', icon: Coffee },
    { href: '/admin/agendamentos', label: 'Agendamentos', icon: Calendar },
    { href: '/admin/solicitacoes', label: 'Solicitações', icon: ConciergeBell },
    { href: '/admin/manutencao', label: 'Manutenção', icon: Wrench },
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
    { href: '/admin/settings/equipe', label: 'Gerenciar Equipe', icon: Users },
];

// ++ NOVO: Mapa de Permissões
type Role = UserRole;
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
    '/admin/settings/equipe': [], // Apenas super_admin
};

// ++ NOVO: Helper de verificação
const checkPermission = (role: Role, href: string): boolean => {
    if (role === 'super_admin') {
        return true;
    }
    if (!role) {
        return false;
    }
    return permissions[href]?.includes(role) ?? false;
};
// === FIM: Lógica copiada de Sidebar.tsx ===


export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, userRole } = useAuth();
    const { property } = useProperty();
    const [isOpen, setIsOpen] = useState(false); // Estado para controlar o Sheet

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

    // NavLink modificado para fechar o Sheet ao clicar
    const NavLink = ({ href, label, icon: Icon, disabled }: {
        href: string,
        label: string,
        icon: React.ElementType,
        disabled?: boolean
    }) => {
        const isActive = pathname.startsWith(href);

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
            <Link
                href={href}
                onClick={() => setIsOpen(false)} // Fecha o Sheet ao navegar
                className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
                    isActive && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                )}>
                <Icon className="h-4 w-4" />
                {label}
            </Link>
        );
    };

    const canAccessSettings = settingsNavItems.some(item => checkPermission(userRole, item.href));

    return (
        // Este header só aparece em telas menores (lg:hidden)
        <header className="flex h-14 items-center gap-4 border-b bg-gray-100/40 px-4 dark:bg-gray-800/40 lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menu de navegação</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col p-0">
                    {/* Conteúdo do Sheet - essencialmente uma cópia do Sidebar */}
                    <div className="flex h-[60px] items-center border-b px-6">
                        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold" onClick={() => setIsOpen(false)}>
                            {property?.logoUrl && <Image src={property.logoUrl} alt="Logo" width={32} height={32} className="rounded-md" />}
                            <span className="">{property?.name || 'Admin'}</span>
                        </Link>
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <nav className="grid items-start px-4 text-sm font-medium">
                            {mainNavItems.map(item => {
                                const hasPermission = checkPermission(userRole, item.href);
                                return <NavLink key={item.href} {...item} disabled={!hasPermission} />
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
                </SheetContent>
            </Sheet>

            {/* Logo no centro do Header Mobile */}
            <div className="flex-1 text-center">
                <Link href="/admin/dashboard" className="flex items-center justify-center gap-2 font-semibold text-lg">
                    {property?.logoUrl && <Image src={property.logoUrl} alt="Logo" width={28} height={28} className="rounded-md" />}
                    <span className="">{property?.name || 'Admin'}</span>
                </Link>
            </div>
            
            {/* Espaçador para manter o logo centralizado */}
            <div className="w-8"></div>
        </header>
    );
}