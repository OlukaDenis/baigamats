import { useState } from 'react';
import { View } from 'react-native';
import {
  ArrowLeftIcon,
  KeyIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from 'react-native-heroicons/outline';

import type { AuthStackScreenProps } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { AlertBanner } from '../../../components/molecules/AlertBanner';
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
        <View className="items-center rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-secondary shadow-sm">
            <ShieldExclamationIcon
              color={colors.onSecondary}
              size={30}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <AppText variant="title" className="mb-2 text-center font-bold text-text-primary">
            Two-step verification expired
          </AppText>
          <AppText className="mb-6 text-center text-sm text-text-secondary leading-5">
            Please return to the sign-in screen and enter your credentials again.
          </AppText>
          <Button
            label="Back to sign in"
            onPress={handleBackToLogin}
            className="w-full"
          />
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
      <View className="mb-6 items-center rounded-3xl border border-border bg-surface px-6 py-8 shadow-sm">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-secondary shadow-sm">
          <ShieldCheckIcon
            color={colors.onSecondary}
            size={30}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="display" className="text-center font-bold text-text-primary">
          Two-step sign-in
        </AppText>
        <AppText className="mt-2 text-center text-sm text-text-secondary leading-5">
          Enter the 6-digit code from your authenticator app for{' '}
          <AppText className="font-semibold text-text-primary">
            {pendingMfa.loginId}
          </AppText>
          .
        </AppText>
      </View>

      {submitError ? <AlertBanner message={submitError} /> : null}

      <View className="mb-6 rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <FormField
          label="Authenticator code"
          placeholder="123456"
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={6}
          textContentType="oneTimeCode"
          leftIcon={
            <KeyIcon
              color={colors.textSecondary}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          }
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
        leftIcon={
          <ArrowLeftIcon
            color={colors.primary}
            size={18}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        }
      />
    </ScreenTemplate>
  );
}
