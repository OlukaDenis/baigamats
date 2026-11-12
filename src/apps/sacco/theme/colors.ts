/**
 * Brand colour tokens — the single source of truth for every colour in the app.
 *
 * Values come from the Baigamats Brand Kit (Version 1.0, 11 November 2026).
 * Primary: Baigamats Navy #13213C
 * Secondary: Baigamats Gold #B6944A
 * Tertiary: Baigamats Teal #1B7F77
 *
 * Safe text pairings adhere to WCAG AA:
 * - White on Navy (16.0 : 1)
 * - Gold on Navy (5.6 : 1)
 * - Navy on Gold (5.6 : 1)
 * - White on Teal (4.8 : 1)
 * - Deep Gold #8A6A1F on Paper (4.7 : 1)
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
  /** Tertiary / money confirmation token. */
  tertiary: string;
  error: string;
  onError: string;
  success: string;
};

const lightColors: ThemeColors = {
  primary: '#13213C',
  secondary: '#B6944A',
  background: '#F8F6F1',
  surface: '#FFFFFF',
  textPrimary: '#13213C',
  textSecondary: '#5B6579',
  onPrimary: '#FFFFFF',
  onSecondary: '#13213C',
  border: '#D5D9E1',
  text: '#13213C',
  tertiary: '#1B7F77',
  error: '#A8342B',
  onError: '#FFFFFF',
  success: '#1B7F77',
};

const darkColors: ThemeColors = {
  primary: '#B6944A',
  secondary: '#1B7F77',
  background: '#13213C',
  surface: '#2F3C53',
  textPrimary: '#FFFFFF',
  textSecondary: '#CBCED4',
  onPrimary: '#13213C',
  onSecondary: '#FFFFFF',
  border: '#4C566B',
  text: '#FFFFFF',
  tertiary: '#1B7F77',
  error: '#FFB4AB',
  onError: '#690005',
  success: '#549F99',
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
  error: '--color-error',
  onError: '--color-on-error',
  success: '--color-success',
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
