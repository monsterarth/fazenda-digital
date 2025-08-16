// components/theme/PropertyThemeProvider.tsx

"use client";

import { useProperty } from "@/context/PropertyContext";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";
import { Loader2 } from "lucide-react"; // IMPORTADO

extend([mixPlugin]);

const isColorLight = (hex: string) => colord(hex).isLight();

export function PropertyThemeProvider({ children }: { children: React.ReactNode }) {
  const { property, loading } = useProperty();
  const { setTheme } = useTheme();

  useEffect(() => {
    // Força o tema 'light' para consistência com o tema da propriedade.
    // Isso é importante para que as cores base do tema (shadcn) não interfiram.
    setTheme('light');
  }, [setTheme]);

  // **INÍCIO DA CORREÇÃO 2: Exibir um loader enquanto o tema carrega**
  // Se os dados da propriedade ainda estão carregando, exibimos um loader em tela cheia.
  // Isso impede que a página seja renderizada sem o tema correto, evitando a tela preta.
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  // **FIM DA CORREÇÃO 2**

  // Se não há dados de cores, renderiza o conteúdo com o tema padrão.
  if (!property?.colors) {
    return <>{children}</>;
  }

  // --- LÓGICA DE GERAÇÃO DE TEMA (sem alterações) ---
  const baseColors = {
    background: property.colors.background,
    primary: property.colors.primary,
  };

  const isLight = isColorLight(baseColors.background);
  const derivedColors = {
    foreground: isLight ? colord(baseColors.primary).darken(0.35).toHex() : colord(baseColors.background).lighten(0.8).toHex(),
    card: isLight ? '#FFFFFF' : colord(baseColors.background).lighten(0.05).toHex(),
    border: isLight ? colord(baseColors.background).darken(0.08).toHex() : colord(baseColors.background).lighten(0.1).toHex(),
    secondary: colord(baseColors.primary).saturate(0.1).lighten(0.3).toHex()
  };

  const themeColors = { ...baseColors, ...derivedColors };

  const cssVariables = `
    :root {
      --background: ${themeColors.background};
      --foreground: ${themeColors.foreground};
      --card: ${themeColors.card};
      --card-foreground: ${themeColors.foreground};
      --popover: ${themeColors.card};
      --popover-foreground: ${themeColors.foreground};
      
      --primary: ${themeColors.primary};
      --primary-foreground: ${isColorLight(themeColors.primary) ? '#000000' : '#FFFFFF'};
      
      --secondary: ${themeColors.secondary};
      --secondary-foreground: ${themeColors.foreground};
      
      --muted: ${colord(themeColors.border).lighten(0.02).toHex()};
      --muted-foreground: ${colord(themeColors.foreground).alpha(0.7).toRgbString()};
      
      --accent: ${colord(themeColors.primary).lighten(0.1).toHex()};
      --accent-foreground: ${isColorLight(colord(themeColors.primary).lighten(0.1).toHex()) ? '#000000' : '#FFFFFF'};
      
      --border: ${themeColors.border};
      --input: ${themeColors.border};
      --ring: ${themeColors.primary};
    }
  `;

  return (
    <>
      <style>{cssVariables}</style>
      {children}
    </>
  );
}