//components\theme\PropertyThemeProvider.tsx
"use client";

import { useProperty } from "@/context/PropertyContext";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";

extend([mixPlugin]);

// Função para converter uma cor HEX para o formato HSL que o Tailwind espera ("H S% L%")
const toHslString = (color: string) => {
  const { h, s, l } = colord(color).toHsl();
  return `${h} ${s}% ${l}%`;
};

const isColorLight = (hex: string) => colord(hex).isLight();

export function PropertyThemeProvider({ children }: { children: React.ReactNode }) {
  const { property, loading } = useProperty();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  if (loading || !property?.colors) {
    return <>{children}</>;
  }

  const baseColors = {
    background: property.colors.background, // #F7FDF2
    primary: property.colors.primary,     // #97A25F
  };
  
  const isLight = isColorLight(baseColors.background);
  
  const derivedColors = {
    foreground: isLight ? colord(baseColors.primary).darken(0.35).toHex() : colord(baseColors.background).lighten(0.8).toHex(),
    card: isLight ? '#FFFFFF' : colord(baseColors.background).lighten(0.05).toHex(),
    border: isLight ? colord(baseColors.background).darken(0.08).toHex() : colord(baseColors.background).lighten(0.1).toHex(),
    secondary: colord(baseColors.primary).saturate(0.1).lighten(0.3).toHex(),
    muted: isLight ? colord(baseColors.background).darken(0.05).toHex() : colord(baseColors.background).lighten(0.05).toHex(),
    accent: isLight ? colord(baseColors.background).darken(0.03).toHex() : colord(baseColors.background).lighten(0.08).toHex(),
  };

  const themeColors = { ...baseColors, ...derivedColors };

  // --- INÍCIO DA CORREÇÃO ---
  // Convertendo todas as cores para o formato HSL string antes de criar as variáveis CSS
  const cssVariables = `
    :root {
      --background: ${toHslString(themeColors.background)};
      --foreground: ${toHslString(themeColors.foreground)};
      
      --card: ${toHslString(themeColors.card)};
      --card-foreground: ${toHslString(themeColors.foreground)};
      
      --popover: ${toHslString(themeColors.card)};
      --popover-foreground: ${toHslString(themeColors.foreground)};
      
      --primary: ${toHslString(themeColors.primary)};
      --primary-foreground: ${toHslString(isColorLight(themeColors.primary) ? '#0D172A' : '#FFFFFF')};
      
      --secondary: ${toHslString(themeColors.secondary)};
      --secondary-foreground: ${toHslString(themeColors.foreground)};
      
      --muted: ${toHslString(themeColors.muted)};
      --muted-foreground: ${toHslString(colord(themeColors.foreground).alpha(0.7).toHex())};
      
      --accent: ${toHslString(themeColors.accent)};
      --accent-foreground: ${toHslString(themeColors.foreground)};
      
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;

      --border: ${toHslString(themeColors.border)};
      --input: ${toHslString(themeColors.border)};
      --ring: ${toHslString(themeColors.primary)};

      --radius: 0.75rem;
    }
  `;
  // --- FIM DA CORREÇÃO ---

  return (
    <>
      <style>{cssVariables}</style>
      {children}
    </>
  );
}