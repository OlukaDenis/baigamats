import { View } from 'react-native';
import { SparklesIcon } from 'react-native-heroicons/outline';

import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { OrganizationSetupBanner } from '../../auth/components/OrganizationSetupBanner';
import { useAuthStore } from '../../auth/store/authStore';
import { ThemePreferenceSelector } from '../../preferences/components/ThemePreferenceSelector';

export function HomeScreen() {
  const { colors } = useTheme();
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const needsOrganizationSetup = useAuthStore(
    state => state.needsOrganizationSetup,
  );

  return (
    <ScreenTemplate>
      <View className="mb-6 items-center rounded-2xl bg-tertiary px-6 py-10">
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
          {user?.email
            ? `Welcome back, ${user.email}`
            : 'Your business workspace is ready.'}
        </AppText>
        {profile?.role ? (
          <View className="mt-3 rounded-full bg-secondary px-3 py-1">
            <AppText variant="label" className="uppercase text-on-secondary">
              {profile.role}
            </AppText>
          </View>
        ) : null}
      </View>

      {needsOrganizationSetup ? <OrganizationSetupBanner /> : null}

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
