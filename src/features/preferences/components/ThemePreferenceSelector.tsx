import { Pressable, View } from 'react-native';

import { AppText } from '../../../components/atoms/AppText';
import { usePreferencesStore, type ThemePreference } from '../store/preferencesStore';

const options: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemePreferenceSelector() {
  const preference = usePreferencesStore(state => state.themePreference);
  const setPreference = usePreferencesStore(state => state.setThemePreference);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Appearance"
      className="flex-row rounded-xl bg-tertiary p-1"
    >
      {options.map(option => {
        const selected = option.value === preference;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => setPreference(option.value)}
            className={`min-h-12 flex-1 items-center justify-center rounded-lg ${
              selected ? 'bg-primary' : ''
            }`}
          >
            <AppText
              variant="label"
              className={selected ? 'text-on-primary' : 'text-content'}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
