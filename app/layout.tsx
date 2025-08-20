// fazenda-digital/app/layout.tsx

import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/context/AuthContext";
import { PropertyProvider } from "@/context/PropertyContext";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Fazenda Digital",
  description: "Portal do Hóspede e Painel de Gestão",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <AuthProvider>
          <PropertyProvider>
            {/* INÍCIO DA ALTERAÇÃO */}
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow">{children}</main>
              <footer className="w-full py-4 px-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Fazenda Digital 2025 © Synapse Beta V2.2 — Desenvolvido por{" "}
                  <a
                    href="https://instagram.com/petrytech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-4 hover:text-primary"
                  >
                    Petry Tech
                  </a>
                  . Todos os direitos reservados.
                </p>
              </footer>
            </div>
            {/* FIM DA ALTERAÇÃO */}
          </PropertyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}