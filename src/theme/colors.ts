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
  tertiary: string;
  background: string;
  surface: string;
  onPrimary: string;
  /** Text/icon colour on the secondary (orange) token. Never white or light gray. */
  onSecondary: string;
  /** Default body text colour on background/surface/tertiary. */
  text: string;
};

const lightColors: ThemeColors = {
  primary: '#3A104D',
  secondary: '#FF9F43',
  tertiary: '#F3E8FF',
  background: '#FFFFFF',
  surface: '#F9F6FC',
  onPrimary: '#FFFFFF',
  onSecondary: '#3A104D',
  text: '#3A104D',
};

const darkColors: ThemeColors = {
  primary: '#C084FC',
  secondary: '#FFAE57',
  tertiary: '#2A1B3D',
  background: '#120E16',
  surface: '#1D1726',
  onPrimary: '#120E16',
  onSecondary: '#120E16',
  text: '#C084FC',
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
  tertiary: '--color-tertiary',
  background: '--color-background',
  surface: '--color-surface',
  onPrimary: '--color-on-primary',
  onSecondary: '--color-on-secondary',
  text: '--color-text',
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
