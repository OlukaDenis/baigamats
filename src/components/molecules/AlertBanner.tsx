import { View } from 'react-native';
import { ExclamationTriangleIcon } from 'react-native-heroicons/outline';

import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../atoms/AppText';

export type AlertBannerProps = {
  message: string;
  className?: string;
};

/**
 * Accessible alert banner that pairs an icon with high-contrast brand tokens
 * so status is never communicated by color alone.
 */
export function AlertBanner({ message, className = 'mb-5' }: AlertBannerProps) {
  const { colors } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={`flex-row items-center rounded-xl bg-secondary p-4 ${className}`.trim()}
    >
      <ExclamationTriangleIcon
        color={colors.onSecondary}
        size={22}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <AppText variant="label" className="ml-3 flex-1 text-on-secondary">
        {message}
      </AppText>
    </View>
  );
}
