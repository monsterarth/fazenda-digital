"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Coffee, Home, ConciergeBell, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/cabana', label: 'Sua Cabana', icon: Building2 },
  { href: '/cafe', label: 'Café', icon: Coffee },
  { href: '/dashboard', label: 'Home', icon: Home, isCentral: true },
  { href: '/servicos', label: 'Serviços', icon: ConciergeBell },
  { href: '/eventos', label: 'Eventos', icon: PartyPopper },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    // ++ CORREÇÃO: Adicionado bg-background e border-t para consistência visual ++
    <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
      <div className="grid h-full grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
          // A correspondência exata para a Home, e 'startsWith' para as outras seções
          const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
          
          if (item.isCentral) {
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className="inline-flex flex-col items-center justify-center"
              >
                {/* ++ CORREÇÃO: Estilo do botão central refinado com sombra e anel de foco ++ */}
                <div className={cn(
                  "flex items-center justify-center w-16 h-16 -mt-8 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105",
                  isActive && "ring-4 ring-primary/30"
                )}>
                  <item.icon className="w-7 h-7" />
                </div>
              </Link>
            );
          }
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "inline-flex flex-col items-center justify-center px-2 pt-2 text-center hover:bg-muted group transition-colors",
                // ++ CORREÇÃO: Usando cores do tema para o estado ativo/inativo ++
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}