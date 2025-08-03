import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google"
import "./globals.css";
import { cn } from "@/lib/utils"
import { PropertyProvider } from "@/context/PropertyContext"; // Importar

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Synapse Hospitality",
  description: "Plataforma de experiência do hóspede",
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
        {/* Envolver o children com o Provider */}
        <PropertyProvider>
          {children}
        </PropertyProvider>
      </body>
    </html>
  );
}