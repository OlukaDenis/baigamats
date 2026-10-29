import { Pressable, View } from 'react-native';
import {
  DevicePhoneMobileIcon,
  MoonIcon,
  SunIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { useTheme } from '../../../theme/ThemeProvider';
import { usePreferencesStore, type ThemePreference } from '../store/preferencesStore';

const options: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemePreferenceSelector() {
  const { colors } = useTheme();
  const preference = usePreferencesStore(state => state.themePreference);
  const setPreference = usePreferencesStore(state => state.setThemePreference);

  const renderIcon = (value: ThemePreference, color: string) => {
    const props = {
      color,
      size: 16,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no' as const,
    };
    if (value === 'light') {
      return <SunIcon {...props} />;
    }
    if (value === 'dark') {
      return <MoonIcon {...props} />;
    }
    return <DevicePhoneMobileIcon {...props} />;
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Appearance"
      className="flex-row rounded-xl border border-border bg-surface p-1.5"
    >
      {options.map(option => {
        const selected = option.value === preference;
        const iconColor = selected ? colors.onPrimary : colors.textPrimary;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => setPreference(option.value)}
            className={`min-h-12 flex-1 flex-row items-center justify-center rounded-lg px-2 active:opacity-80 ${
              selected ? 'bg-primary' : ''
            }`}
          >
            {renderIcon(option.value, iconColor)}
            <AppText
              variant="label"
              className={`ml-1.5 ${
                selected ? 'font-semibold text-on-primary' : 'text-content'
              }`}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
