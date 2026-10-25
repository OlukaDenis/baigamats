import { create } from 'zustand';

import type { ColorScheme } from '../../../theme/colors';

export type ThemePreference = ColorScheme | 'system';

type PreferencesState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

/**
 * Shared client-side user preferences.
 *
 * Not persisted yet: add a storage adapter (e.g. zustand `persist` + an approved
 * storage library) once persistence is a product requirement.
 */
export const usePreferencesStore = create<PreferencesState>()(set => ({
  themePreference: 'system',
  setThemePreference: themePreference => set({ themePreference }),
}));
