import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Inter as FontSans } from "next/font/google";
import { GuestProvider } from "@/context/GuestProvider";
import { PropertyProvider } from "@/context/PropertyContext";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Synapse",
  description: "A experiência digital para seus hóspedes",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* ++ CORREÇÃO: A ordem dos provedores foi invertida. ++ */}
          {/* GuestProvider agora é o pai, envolvendo tudo. */}
          <GuestProvider>
            {/* PropertyProvider agora é o filho e pode usar o hook useGuest() com segurança. */}
            <PropertyProvider>
              {children}
              <Toaster />
            </PropertyProvider>
          </GuestProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}