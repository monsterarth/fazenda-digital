"use client";

import { useProperty } from "@/context/PropertyContext";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";

extend([mixPlugin]);

// Função para determinar se uma cor é "clara" ou "escura"
const isColorLight = (hex: string) => colord(hex).isLight();

export function PropertyThemeProvider({ children }: { children: React.ReactNode }) {
  const { property, loading } = useProperty();
  const { setTheme } = useTheme();

  useEffect(() => {
    // Força o tema 'light' no portal para garantir consistência com o tema da propriedade
    setTheme('light');
  }, [setTheme]);

  if (loading || !property?.colors) {
    return <>{children}</>;
  }

  // --- LÓGICA DE GERAÇÃO DE TEMA ---
  // Pega as cores base que existem no seu Firestore
  const baseColors = {
    background: property.colors.background, // Ex: #F7FDF2 (bege claro)
    primary: property.colors.primary,     // Ex: #97A25F (verde)
  };

  // Determina as cores de texto e UI com base no fundo
  const isLight = isColorLight(baseColors.background);
  const derivedColors = {
    foreground: isLight ? colord(baseColors.primary).darken(0.35).toHex() : colord(baseColors.background).lighten(0.8).toHex(),
    card: isLight ? '#FFFFFF' : colord(baseColors.background).lighten(0.05).toHex(),
    border: isLight ? colord(baseColors.background).darken(0.08).toHex() : colord(baseColors.background).lighten(0.1).toHex(),
    secondary: colord(baseColors.primary).saturate(0.1).lighten(0.3).toHex() // Cor secundária derivada da primária
  };

  // Monta o objeto final de cores
  const themeColors = { ...baseColors, ...derivedColors };

  // Gera as variáveis CSS sem usar oklch, o que simplifica e evita erros.
  // O navegador aplicará o override sobre o :root do seu globals.css sem problemas.
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