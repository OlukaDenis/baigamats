import { Linking, View } from 'react-native';
import {
  ArrowTopRightOnSquareIcon,
  BuildingStorefrontIcon,
} from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { useTheme } from '../../../theme/ThemeProvider';

const WEB_PORTAL_URL = 'https://business.baigamats.com';

export function OrganizationSetupBanner() {
  const { colors } = useTheme();

  const handleOpenPortal = () => {
    Linking.openURL(WEB_PORTAL_URL).catch(() => undefined);
  };

  return (
    <View
      accessibilityRole="summary"
      className="mb-6 rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <View className="mb-3 flex-row items-center">
        <View className="mr-3 rounded-xl bg-secondary p-3 shadow-sm">
          <BuildingStorefrontIcon
            color={colors.onSecondary}
            size={22}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <View className="flex-1">
          <AppText variant="title" className="font-bold text-text-primary">
            Complete Organization Setup
          </AppText>
          <AppText variant="label" className="mt-0.5 text-xs text-text-secondary">
            Action required on web portal
          </AppText>
        </View>
      </View>
      <AppText className="mb-4 text-sm text-text-secondary leading-5">
        Your account is signed in, but your business organization has not been
        configured yet. Complete your organization setup on the Baigamats portal to
        unlock shop, invoices, and collections.
      </AppText>
      <Button
        label="Open Business Portal"
        variant="secondary"
        onPress={handleOpenPortal}
        rightIcon={
          <ArrowTopRightOnSquareIcon
            color={colors.onSecondary}
            size={18}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        }
      />
    </View>
  );
}
