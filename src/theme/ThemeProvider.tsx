import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import { vars } from 'nativewind';

import { usePreferencesStore } from '../features/preferences/store/preferencesStore';
import {
  palettes,
  toCssVariables,
  type ColorScheme,
  type ThemeColors,
} from './colors';

type ThemeContextValue = {
  scheme: ColorScheme;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const cssVariablesByScheme: Record<ColorScheme, ReturnType<typeof vars>> = {
  light: vars(toCssVariables(palettes.light)),
  dark: vars(toCssVariables(palettes.dark)),
};

/**
 * Resolves the active colour scheme (user preference, falling back to the OS
 * setting) and exposes the brand tokens both as NativeWind CSS variables and
 * through `useTheme()`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = usePreferencesStore(state => state.themePreference);

  const scheme: ColorScheme =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const value = useMemo(
    () => ({ scheme, colors: palettes[scheme] }),
    [scheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View className="flex-1" style={cssVariablesByScheme[scheme]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>.');
  }
  return context;
}
