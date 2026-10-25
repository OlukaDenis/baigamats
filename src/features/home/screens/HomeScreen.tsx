import { View } from 'react-native';
import { SparklesIcon } from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { ThemePreferenceSelector } from '../../preferences/components/ThemePreferenceSelector';

export function HomeScreen() {
  const { colors } = useTheme();

  return (
    <ScreenTemplate>
      <View className="mb-8 items-center rounded-2xl bg-tertiary px-6 py-10">
        <View className="mb-4 rounded-full bg-secondary p-4">
          <SparklesIcon
            color={colors.onSecondary}
            size={32}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="display" className="text-center">
          Baigamats
        </AppText>
        <AppText className="mt-2 text-center">
          Your project is ready. Start building in src/features.
        </AppText>
      </View>

      <View className="mb-8 rounded-2xl bg-surface p-5">
        <AppText variant="title" className="mb-4">
          Appearance
        </AppText>
        <ThemePreferenceSelector />
      </View>

      <View className="gap-3">
        <Button label="Primary action" />
        <Button label="Secondary action" variant="secondary" />
      </View>
    </ScreenTemplate>
  );
}
