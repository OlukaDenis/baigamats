import { create } from 'zustand';

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = ColorScheme | 'system';

type PreferencesState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

/**
 * Shared client-side user preferences.
 */
export const usePreferencesStore = create<PreferencesState>()(set => ({
  themePreference: 'system',
  setThemePreference: themePreference => set({ themePreference }),
}));
