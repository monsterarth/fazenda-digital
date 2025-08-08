"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Property } from '@/types';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, BedDouble, Coffee, Calendar, BarChart2, Settings, LogOut,
    Home, Paintbrush, Utensils, CalendarCheck, FileText, Wrench, Shield
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


// Lista de navegação principal
const mainNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/stays', label: 'Estadias', icon: BedDouble },
    { href: '/admin/pedidos/cafe', label: 'Pedidos Café', icon: Coffee },
    { href: '/admin/agendamentos', label: 'Agendamentos', icon: Calendar },
    { href: '/admin/pesquisas/overview', label: 'Pesquisas', icon: BarChart2 }, // Rota de exemplo
];

// Lista de navegação de configurações
const settingsNavItems = [
    { href: '/admin/settings/cabanas', label: 'Cabanas', icon: Home },
    { href: '/admin/settings/personalizacao', label: 'Personalização', icon: Paintbrush },
    { href: '/admin/settings/cafe', label: 'Cardápio Café', icon: Utensils },
    { href: '/admin/settings/agendamentos', label: 'Gerenciar Agend.', icon: CalendarCheck },
    { href: '/admin/settings/pesquisas', label: 'Gerenciar Pesquisas', icon: FileText },
    { href: '/admin/settings/servicos', label: 'Serviços', icon: Wrench },
    { href: '/admin/settings/politicas', label: 'Políticas', icon: Shield },
];


export function Sidebar({ property }: { property: Property | null }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

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

    const NavLink = ({ href, label, icon: Icon }: { href: string, label: string, icon: React.ElementType }) => {
        const isActive = pathname === href;
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
                        {mainNavItems.map(item => <NavLink key={item.href} {...item} />)}

                        <Accordion type="single" collapsible className="w-full mt-2">
                            <AccordionItem value="settings" className="border-b-0">
                                <AccordionTrigger className={cn(
                                     "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 [&[data-state=open]>svg]:rotate-180",
                                     settingsNavItems.some(item => pathname.startsWith(item.href)) && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                                )}>
                                     <Settings className="h-4 w-4" />
                                     <span>Configurações</span>
                                </AccordionTrigger>
                                <AccordionContent className="pl-7 pt-2">
                                     <nav className="grid gap-1">
                                        {settingsNavItems.map(item => <NavLink key={item.href} {...item} />)}
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