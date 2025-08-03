"use client";

import { useGuest } from '@/context/GuestProvider';
import { useProperty } from '@/context/PropertyContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import { Loader2, LogOut } from 'lucide-react';
import { PropertyThemeProvider } from '@/components/theme/PropertyThemeProvider';

export default function ProtectedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { property, loading: propertyLoading } = useProperty();
  const { stay, isAuthenticated, isLoading: guestLoading, logout } = useGuest();
  const router = useRouter();

  // Efeito para garantir a autenticação nesta área protegida
  useEffect(() => {
    if (!guestLoading && !isAuthenticated) {
      router.replace('/portal');
    }
  }, [isAuthenticated, guestLoading, router]);

  const handleLogout = () => {
    logout();
    router.replace('/portal');
  };

  const isLoading = propertyLoading || guestLoading || !isAuthenticated;

  // Mostra um loader em tela cheia enquanto carrega ou se não estiver autenticado
  if (isLoading || !stay || !property) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PropertyThemeProvider>
      <div className="min-h-screen bg-background text-foreground antialiased">
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              {property.logoUrl && (
                <Image
                  src={property.logoUrl}
                  alt={`Logo de ${property.name}`}
                  width={40}
                  height={40}
                  className="rounded-md object-cover"
                />
              )}
              <h1 className="text-xl font-bold text-foreground">{property.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right sm:hidden">
                <h2 className="font-semibold text-sm">{stay.guestName.split(' ')[0]}</h2>
                <p className="text-xs text-muted-foreground">{stay.cabinName}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="mt-12 border-t py-6">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {property.name}.</p>
            <p>Uma solução <a href="https://petry.tech" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary/80 hover:underline">Synapse by PetryTech</a>.</p>
          </div>
        </footer>
      </div>
    </PropertyThemeProvider>
  );
}