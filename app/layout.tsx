// app/layout.tsx

import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/context/AuthContext";
import { GuestProvider } from "@/context/GuestProvider";
import { PropertyProvider } from "@/context/PropertyContext";
import { Toaster } from "@/components/ui/sonner";
import { PropertyThemeProvider } from "@/components/theme/PropertyThemeProvider"; // IMPORTADO

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Fazenda do Rosa",
  description: "Portal do Hóspede",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <AuthProvider>
          <PropertyProvider>
            {/* O ThemeProvider agora envolve tudo que é do hóspede */}
            <PropertyThemeProvider> 
              <GuestProvider>
                {children}
                <Toaster />
              </GuestProvider>
            </PropertyThemeProvider>
          </PropertyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}