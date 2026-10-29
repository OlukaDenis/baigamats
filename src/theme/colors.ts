/**
 * Brand colour tokens — the single source of truth for every colour in the app.
 *
 * Values come from the branding rule (.agents/rules/branding-style.md).
 * Do not add hex codes that are not in that palette.
 *
 * These tokens are exposed to NativeWind as CSS variables (see ThemeProvider and
 * tailwind.config.js), so `bg-primary`, `text-on-primary`, etc. swap automatically
 * between light and dark mode. Use `useTheme().colors` only where a raw colour
 * value is required (icons, StatusBar, navigation theme).
 */

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  onPrimary: string;
  onSecondary: string;
  border: string;
  /** Primary body and heading text token. */
  text: string;
  /** Fallback mapping for tertiary containers (mapped to surface). */
  tertiary: string;
};

const lightColors: ThemeColors = {
  primary: '#1B1340',
  secondary: '#FF8A00',
  background: '#FFFFFF',
  surface: '#F7F7F9',
  textPrimary: '#111111',
  textSecondary: '#66666E',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  border: '#E5E5EB',
  text: '#111111',
  tertiary: '#F7F7F9',
};

const darkColors: ThemeColors = {
  primary: '#FFFFFF',
  secondary: '#FFA040',
  background: '#000000',
  surface: '#141416',
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9EA6',
  onPrimary: '#000000',
  onSecondary: '#000000',
  border: '#26262B',
  text: '#FFFFFF',
  tertiary: '#141416',
};

export const palettes: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

/** Converts `#RRGGBB` to the `R G B` channel string Tailwind's `<alpha-value>` expects. */
export function hexToRgbChannels(hex: string): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    throw new Error(`Invalid hex colour "${hex}". Expected #RRGGBB.`);
  }
  const [, r, g, b] = match;
  return `${parseInt(r, 16)} ${parseInt(g, 16)} ${parseInt(b, 16)}`;
}

const tokenToCssVar: Record<keyof ThemeColors, string> = {
  primary: '--color-primary',
  secondary: '--color-secondary',
  background: '--color-background',
  surface: '--color-surface',
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  onPrimary: '--color-on-primary',
  onSecondary: '--color-on-secondary',
  border: '--color-border',
  text: '--color-text',
  tertiary: '--color-tertiary',
};

/** Builds the CSS-variable map consumed by NativeWind's `vars()`. */
export function toCssVariables(colors: ThemeColors): Record<string, string> {
  return Object.fromEntries(
    (Object.keys(tokenToCssVar) as (keyof ThemeColors)[]).map(token => [
      tokenToCssVar[token],
      hexToRgbChannels(colors[token]),
    ]),
  );
}
