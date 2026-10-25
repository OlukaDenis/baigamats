import { ActivityIndicator, View } from 'react-native';
import { SparklesIcon } from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';

export function SplashScreen() {
  const { colors } = useTheme();

  return (
    <ScreenTemplate scrollable={false}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading Baigamats session"
        className="flex-1 items-center justify-center px-6"
      >
        <View className="mb-6 items-center rounded-3xl bg-tertiary p-8">
          <View className="mb-4 rounded-full bg-secondary p-5">
            <SparklesIcon
              color={colors.onSecondary}
              size={40}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <AppText variant="display" className="text-center">
            Baigamats
          </AppText>
          <AppText className="mt-2 text-center">
            Business payments, invoices & shop management
          </AppText>
        </View>

        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="label" className="mt-4">
          Preparing your workspace...
        </AppText>
      </View>
    </ScreenTemplate>
  );
}
