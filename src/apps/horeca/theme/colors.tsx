import React, { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import { vars } from 'nativewind';
import { usePreferencesStore } from '@shared/preferences/preferencesStore';

export const horecaLightColors = {
  primary: '#13213C',
  primaryContainer: '#2F3C53',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#f1f2f3',

  secondary: '#B6944A',
  secondaryContainer: '#f9f6f1',
  onSecondary: '#13213C',
  onSecondaryContainer: '#533f15',

  tertiary: '#1B7F77',
  tertiaryContainer: '#dbebe9',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#0a3330',

  productAccent: '#D2674B',

  surface: '#ffffff',
  surfaceBright: '#ffffff',
  surfaceDim: '#eef0f4',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f8f6f1',
  surfaceContainer: '#f1f2f3',
  surfaceContainerHigh: '#eef0f4',
  surfaceContainerHighest: '#e3e4e8',
  inputBackground: '#eef0f4',

  onSurface: '#13213C',
  onSurfaceVariant: '#5B6579',
  background: '#F8F6F1',
  onBackground: '#13213C',

  outline: '#5B6579',
  outlineVariant: '#D5D9E1',
  ghostBorder: 'rgba(213, 217, 225, 0.4)',

  error: '#A8342B',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#690005',

  warning: '#9A5B00',

  // Semantic status colors
  statusAvailable: '#1B7F77',
  statusOccupied: '#D2674B',
  statusReserved: '#9A5B00',
  statusDirty: '#5B6579',

  // KOT status colors
  kotNew: '#2A5BA6',
  kotPreparing: '#9A5B00',
  kotReady: '#1B7F77',
  kotServed: '#5B6579',
};

export const horecaDarkColors: typeof horecaLightColors = {
  primary: '#B6944A',
  primaryContainer: '#2F3C53',
  onPrimary: '#13213C',
  onPrimaryContainer: '#f9f6f1',

  secondary: '#D2674B',
  secondaryContainer: '#3d201a',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#fdeee9',

  tertiary: '#549F99',
  tertiaryContainer: '#0e4642',
  onTertiary: '#0a3330',
  onTertiaryContainer: '#dbebe9',

  productAccent: '#D2674B',

  surface: '#2F3C53',
  surfaceBright: '#3b4962',
  surfaceDim: '#0E1830',
  surfaceContainerLowest: '#0a1220',
  surfaceContainerLow: '#13213C',
  surfaceContainer: '#233045',
  surfaceContainerHigh: '#2F3C53',
  surfaceContainerHighest: '#3b4962',
  inputBackground: '#243043',

  onSurface: '#ffffff',
  onSurfaceVariant: '#CBCED4',
  background: '#13213C',
  onBackground: '#ffffff',

  outline: '#AFB4BD',
  outlineVariant: '#4C566B',
  ghostBorder: 'rgba(76, 86, 107, 0.3)',

  error: '#ffb4ab',
  errorContainer: '#690005',
  onError: '#690005',
  onErrorContainer: '#ffdad6',

  warning: '#C8AF77',

  statusAvailable: '#549F99',
  statusOccupied: '#D2674B',
  statusReserved: '#C8AF77',
  statusDirty: '#AFB4BD',

  kotNew: '#6D9BD6',
  kotPreparing: '#C8AF77',
  kotReady: '#549F99',
  kotServed: '#AFB4BD',
};

export const HORECA_DEFAULT_RADIUS = 5;
export const HORECA_DEFAULT_CONTROL_HEIGHT = 58;

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
    '--color-input': toRgbChannels(colors.inputBackground),
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
    '--color-product-accent': toRgbChannels(colors.productAccent || '#D2674B'),
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

  const toggleTheme = useCallback(() => {
    const next = scheme === 'dark' ? 'light' : 'dark';
    usePreferencesStore.getState().setThemePreference(next);
  }, [scheme]);

  const value = useMemo(
    () => ({ isDark, scheme, colors, toggleTheme }),
    [isDark, scheme, colors, toggleTheme],
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
  if (context && context.colors) {
    return context.colors;
  }
  return horecaLightColors;
}
