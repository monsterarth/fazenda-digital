// components/theme/PropertyThemeProvider.tsx

"use client";

import { useProperty } from "@/context/PropertyContext";
import { useEffect } from "react";
import { colord, extend } from "colord";
import mixPlugin from "colord/plugins/mix";

extend([mixPlugin]);

const isColorLight = (hex: string) => colord(hex).isLight();

// Componente helper para gerar e injetar o CSS
const ThemeStyleInjector = ({ colors }: { colors: { [key: string]: string } }) => {
  const baseColors = {
    background: colors.background || '#FFFFFF',
    primary: colors.primary || '#000000',
  };

  const isLight = isColorLight(baseColors.background);
  
  // Lógica de derivação de cores (robusta para lidar com valores ausentes)
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

  return <style>{cssVariables}</style>;
};


export function PropertyThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeColors } = useProperty();

  return (
    <>
      {/* Renderiza o injetor de estilo APENAS quando as cores do tema estiverem disponíveis.
        Enquanto themeColors for nulo, a aplicação usará os estilos padrão do globals.css.
        Quando as cores chegarem do Firestore (ou forem atualizadas no preview),
        o ThemeStyleInjector aparecerá e aplicará as variáveis CSS, atualizando a UI.
        Isso é não-bloqueante e funciona de forma consistente em toda a aplicação.
      */}
      {themeColors && <ThemeStyleInjector colors={themeColors} />}
      {children}
    </>
  );
}