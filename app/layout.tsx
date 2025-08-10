import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Inter as FontSans } from "next/font/google";
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
          {/* PropertyProvider é global porque a página de login pública e o portal precisam dele.
              Ele agora será independente de outros contextos de autenticação. */}
          <PropertyProvider>
            {children}
            <Toaster />
          </PropertyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}