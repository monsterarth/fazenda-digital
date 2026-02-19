'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

// Navegação do submódulo de Casamentos
const tabsNav = [
  {
    name: 'Dashboard',
    href: '/admin/casamentos',
  },
  {
    name: 'Lista de Eventos',
    href: '/admin/casamentos/lista',
  },
  {
    name: 'Calendário',
    href: '/admin/casamentos/calendario', // Deixaremos pronto
  },
]

export default function CasamentosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          CRM de Casamentos
        </h2>
        {/* TODO: O botão 'Adicionar' do Dashboard pode vir para cá */}
      </div>

      {/* Navegação em Abas */}
      <nav className="flex space-x-2 lg:space-x-4 border-b">
        {tabsNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'font-semibold',
              pathname === item.href
                ? 'border-b-2 border-primary rounded-none text-primary hover:text-primary'
                : 'text-muted-foreground',
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {/* O conteúdo da página (seja o dashboard, a lista ou o calendário) 
          será renderizado aqui */}
      <div className="pt-4">{children}</div>
    </div>
  )
}