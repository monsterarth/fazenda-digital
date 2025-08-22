"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ConciergeBell, Coffee, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Estadia', icon: Home },
  { href: '/servicos', label: 'Serviços', icon: ConciergeBell },
  { href: '/cafe', label: 'Café', icon: Coffee },
  { href: '/eventos', label: 'Eventos', icon: PartyPopper },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item) => {
          // A aba 'Estadia' (/dashboard) tem correspondência exata, as outras não.
          const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-muted group",
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