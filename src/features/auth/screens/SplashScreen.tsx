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
        className="flex-1 items-center justify-center px-4"
      >
        <View className="mb-8 w-full items-center rounded-3xl border border-border bg-surface px-6 py-10 shadow-sm">
          <View className="mb-5 h-20 w-20 items-center justify-center rounded-2xl bg-secondary shadow-sm">
            <SparklesIcon
              color={colors.onSecondary}
              size={38}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <AppText variant="display" className="text-center font-bold text-text-primary">
            Baigamats
          </AppText>
          <AppText className="mt-2 text-center text-sm text-text-secondary">
            Business payments, invoices & shop management
          </AppText>
        </View>

        <View className="flex-row items-center rounded-full border border-border bg-surface px-5 py-3 shadow-sm">
          <ActivityIndicator size="small" color={colors.primary} />
          <AppText variant="label" className="ml-3 text-text-primary">
            Preparing your workspace...
          </AppText>
        </View>
      </View>
    </ScreenTemplate>
  );
}
