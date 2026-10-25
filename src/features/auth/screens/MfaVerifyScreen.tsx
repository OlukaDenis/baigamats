import { useState } from 'react';
import { View } from 'react-native';
import { ShieldCheckIcon } from 'react-native-heroicons/outline';

import type { AuthStackScreenProps } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { FormField } from '../../../components/molecules/FormField';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  getAuthErrorMessage,
  useVerifyMfaMutation,
} from '../hooks/useAuthMutations';
import { mfaCodeSchema } from '../schemas/authSchemas';
import { useAuthStore } from '../store/authStore';

export function MfaVerifyScreen({
  navigation,
}: AuthStackScreenProps<'MfaVerify'>) {
  const { colors } = useTheme();
  const pendingMfa = useAuthStore(state => state.pendingMfa);
  const clearPendingMfa = useAuthStore(state => state.clearPendingMfa);
  const verifyMfaMutation = useVerifyMfaMutation();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleBackToLogin = () => {
    clearPendingMfa();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Login');
    }
  };

  if (!pendingMfa) {
    return (
      <ScreenTemplate>
        <View className="rounded-2xl bg-surface p-6">
          <AppText variant="title" className="mb-2">
            Two-step verification expired
          </AppText>
          <AppText className="mb-4">
            Please return to the sign-in screen and enter your credentials again.
          </AppText>
          <Button label="Back to sign in" onPress={handleBackToLogin} />
        </View>
      </ScreenTemplate>
    );
  }

  const handleVerify = async () => {
    setSubmitError(null);
    const parsedCode = mfaCodeSchema.safeParse(code);
    if (!parsedCode.success) {
      setCodeError(parsedCode.error.issues[0]?.message);
      return;
    }

    setCodeError(undefined);
    try {
      await verifyMfaMutation.mutateAsync({
        factor_id: pendingMfa.factorId,
        code: parsedCode.data,
        mfa_session: pendingMfa.mfaSession,
      });
    } catch (error) {
      setSubmitError(
        getAuthErrorMessage(
          error,
          'Invalid authenticator code. Please try again.',
        ),
      );
    }
  };

  return (
    <ScreenTemplate>
      <View className="mb-8 items-center rounded-2xl bg-tertiary px-6 py-8">
        <View className="mb-3 rounded-full bg-secondary p-4">
          <ShieldCheckIcon
            color={colors.onSecondary}
            size={28}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="display" className="text-center">
          Two-step sign-in
        </AppText>
        <AppText className="mt-2 text-center">
          Enter the 6-digit code from your authenticator app for{' '}
          {pendingMfa.loginId}.
        </AppText>
      </View>

      {submitError ? (
        <View
          accessibilityRole="alert"
          className="mb-5 rounded-xl bg-secondary p-4"
        >
          <AppText variant="label" className="text-on-secondary">
            {submitError}
          </AppText>
        </View>
      ) : null}

      <View className="mb-6 rounded-2xl bg-surface p-5">
        <FormField
          label="Authenticator code"
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          value={code}
          onChangeText={value => {
            setCode(value.replace(/\D/g, ''));
            if (codeError) {
              setCodeError(undefined);
            }
          }}
          error={codeError}
          helperText="Enter the 6-digit verification code"
          onSubmitEditing={handleVerify}
        />

        <Button
          label="Verify & sign in"
          loading={verifyMfaMutation.isPending}
          onPress={handleVerify}
          className="mt-2"
        />
      </View>

      <Button
        label="Back to sign in"
        variant="outline"
        disabled={verifyMfaMutation.isPending}
        onPress={handleBackToLogin}
      />
    </ScreenTemplate>
  );
}
