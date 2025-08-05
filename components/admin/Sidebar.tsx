"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Utensils, Calendar, Users, Settings, BarChart2, MessageSquareQuote, Palette, Coffee, BedDouble, Wrench } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Property } from '@/types'; // Importando o tipo Property

interface SidebarProps {
    property: Property | null; // Adicionando property como prop
}

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <Link href={href} passHref>
            <Button
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
            >
                {children}
            </Button>
        </Link>
    );
};

export function Sidebar({ property }: SidebarProps) {
    const propertyName = property?.name || 'Painel Admin';

    return (
        <aside className="w-64 h-screen flex flex-col border-r bg-muted/40 p-4">
            <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">{propertyName}</h2>
            </div>
            <nav className="flex-1 space-y-2">
                <NavLink href="/admin/dashboard"><Home className="mr-2 h-4 w-4" />Dashboard</NavLink>
                <NavLink href="/admin/pedidos/cafe"><Utensils className="mr-2 h-4 w-4" />Pedidos de Café</NavLink>
                <NavLink href="/admin/agendamentos"><Calendar className="mr-2 h-4 w-4" />Agendamentos</NavLink>
                <NavLink href="/admin/stays"><Users className="mr-2 h-4 w-4" />Gestão de Estadias</NavLink>
                
                <Accordion type="multiple" className="w-full">
                    <AccordionItem value="settings">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline [&[data-state=open]>svg]:rotate-180">
                            <div className="flex items-center">
                                <Settings className="mr-2 h-4 w-4" /> Configurações
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-4 space-y-1">
                            <NavLink href="/admin/settings/personalizacao"><MessageSquareQuote className="mr-2 h-4 w-4" />Personalização</NavLink>
                            <NavLink href="/admin/settings/aparencia"><Palette className="mr-2 h-4 w-4" />Aparência</NavLink>
                            <NavLink href="/admin/settings/cafe"><Coffee className="mr-2 h-4 w-4" />Cardápio Café</NavLink>
                            <NavLink href="/admin/settings/cabanas"><BedDouble className="mr-2 h-4 w-4" />Cabanas</NavLink>
                            <NavLink href="/admin/settings/servicos"><Wrench className="mr-2 h-4 w-4" />Serviços</NavLink>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </nav>
        </aside>
    );
}