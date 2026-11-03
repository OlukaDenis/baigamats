import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import { vars } from 'nativewind';
import { usePreferencesStore } from '@shared/preferences/preferencesStore';

export const horecaLightColors = {
  primary: '#094cb2',
  primaryContainer: '#3366cc',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#e7ebff',

  secondary: '#5a5f63',
  secondaryContainer: '#dfe3e8',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#606569',

  tertiary: '#6d5e00',
  tertiaryContainer: '#bfab49',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#4a3f00',

  surface: '#faf9fa',
  surfaceBright: '#faf9fa',
  surfaceDim: '#dbdadb',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f3f4',
  surfaceContainer: '#efedee',
  surfaceContainerHigh: '#e9e8e9',
  surfaceContainerHighest: '#e3e2e3',

  onSurface: '#1b1c1d',
  onSurfaceVariant: '#434653',
  background: '#faf9fa',
  onBackground: '#1b1c1d',

  outline: '#737784',
  outlineVariant: '#c3c6d5',
  ghostBorder: 'rgba(195, 198, 213, 0.25)',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  warning: '#d97706',

  // Semantic status colors
  statusAvailable: '#16a34a',
  statusOccupied: '#094cb2',
  statusReserved: '#d97706',
  statusDirty: '#dc2626',

  // KOT status colors
  kotNew: '#3b82f6',
  kotPreparing: '#f59e0b',
  kotReady: '#10b981',
  kotServed: '#6b7280',
};

export const horecaDarkColors: typeof horecaLightColors = {
  primary: '#6094fc',
  primaryContainer: '#1a3e8a',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#d9e2ff',

  secondary: '#b0b5ba',
  secondaryContainer: '#222830',
  onSecondary: '#11151a',
  onSecondaryContainer: '#dbe0e5',

  tertiary: '#f0d268',
  tertiaryContainer: '#544700',
  onTertiary: '#3c3200',
  onTertiaryContainer: '#ffe177',

  surface: '#0f141c',
  surfaceBright: '#222b3a',
  surfaceDim: '#0a0e14',
  surfaceContainerLowest: '#070a10',
  surfaceContainerLow: '#111822',
  surfaceContainer: '#161e2a',
  surfaceContainerHigh: '#1c2635',
  surfaceContainerHighest: '#243043',

  onSurface: '#dae2fd',
  onSurfaceVariant: '#8f95a5',
  background: '#0b1326',
  onBackground: '#dae2fd',

  outline: '#8d919f',
  outlineVariant: '#434753',
  ghostBorder: 'rgba(195, 198, 213, 0.15)',

  error: '#ffb4ab',
  errorContainer: '#93000a',
  onError: '#690005',
  onErrorContainer: '#ffdad6',

  warning: '#f59e0b',

  statusAvailable: '#22c55e',
  statusOccupied: '#6094fc',
  statusReserved: '#f59e0b',
  statusDirty: '#ef4444',

  kotNew: '#60a5fa',
  kotPreparing: '#fbbf24',
  kotReady: '#34d399',
  kotServed: '#9ca3af',
};

// Default static fallback export
export const horecaColors = horecaLightColors;
export type HorecaColors = typeof horecaLightColors;

export function getHorecaColors(scheme: 'light' | 'dark'): HorecaColors {
  return scheme === 'dark' ? horecaDarkColors : horecaLightColors;
}

interface HorecaThemeContextValue {
  isDark: boolean;
  scheme: 'light' | 'dark';
  colors: HorecaColors;
  toggleTheme: () => void;
}

const HorecaThemeContext = createContext<HorecaThemeContextValue>({
  isDark: false,
  scheme: 'light',
  colors: horecaLightColors,
  toggleTheme: () => {},
});

export function toRgbChannels(color: string): string {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r} ${g} ${b}`;
  }
  const match = color.match(/\(([^)]+)\)/);
  if (match) {
    const parts = match[1].split(',').map(p => p.trim());
    return `${parts[0]} ${parts[1]} ${parts[2]}`;
  }
  return '0 0 0';
}

export function toHorecaCssVariables(colors: HorecaColors): Record<string, string> {
  return {
    '--color-primary': toRgbChannels(colors.primary),
    '--color-secondary': toRgbChannels(colors.secondary),
    '--color-tertiary': toRgbChannels(colors.tertiary),
    '--color-background': toRgbChannels(colors.background),
    '--color-surface': toRgbChannels(colors.surface),
    '--color-border': toRgbChannels(colors.outlineVariant || colors.outline),
    '--color-text': toRgbChannels(colors.onSurface),
    '--color-text-primary': toRgbChannels(colors.onSurface),
    '--color-text-secondary': toRgbChannels(colors.onSurfaceVariant),
    '--color-on-primary': toRgbChannels(colors.onPrimary),
    '--color-on-secondary': toRgbChannels(colors.onSecondary),
    '--color-error': toRgbChannels(colors.error),
    '--color-on-error': toRgbChannels(colors.onError),
    '--color-success': toRgbChannels(colors.statusAvailable),
    '--color-status-available': toRgbChannels(colors.statusAvailable),
    '--color-status-occupied': toRgbChannels(colors.statusOccupied),
    '--color-status-reserved': toRgbChannels(colors.statusReserved),
    '--color-status-dirty': toRgbChannels(colors.statusDirty),
  };
}

const cssVariablesByScheme: Record<'light' | 'dark', ReturnType<typeof vars>> = {
  light: vars(toHorecaCssVariables(horecaLightColors)),
  dark: vars(toHorecaCssVariables(horecaDarkColors)),
};

export const HorecaThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const preference = usePreferencesStore(state => state.themePreference);

  const scheme: 'light' | 'dark' =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const isDark = scheme === 'dark';
  const colors = isDark ? horecaDarkColors : horecaLightColors;

  const toggleTheme = () => {
    const next = scheme === 'dark' ? 'light' : 'dark';
    usePreferencesStore.getState().setThemePreference(next);
  };

  const value = useMemo(
    () => ({ isDark, scheme, colors, toggleTheme }),
    [isDark, scheme, colors],
  );

  return (
    <HorecaThemeContext.Provider value={value}>
      <View className="flex-1" style={cssVariablesByScheme[scheme]}>
        {children}
      </View>
    </HorecaThemeContext.Provider>
  );
};

export function useHorecaTheme(): HorecaThemeContextValue {
  return useContext(HorecaThemeContext);
}

export function useHorecaColors(): HorecaColors {
  const context = useContext(HorecaThemeContext);
  const systemScheme = useColorScheme();
  if (context && context.colors) {
    return context.colors;
  }
  return systemScheme === 'dark' ? horecaDarkColors : horecaLightColors;
}
