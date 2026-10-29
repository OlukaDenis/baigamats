import { useRef, useState } from 'react';
import { View } from 'react-native';
import {
  ArrowRightIcon,
  LockClosedIcon,
  UserIcon,
  UserPlusIcon,
} from 'react-native-heroicons/outline';

import type { AuthStackScreenProps } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import type { AppTextInputInstance } from '../../../components/atoms/AppTextInput';
import { Button } from '../../../components/atoms/Button';
import { AlertBanner } from '../../../components/molecules/AlertBanner';
import { FormField } from '../../../components/molecules/FormField';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  getAuthErrorMessage,
  useLoginMutation,
} from '../hooks/useAuthMutations';
import { loginRequestSchema } from '../schemas/authSchemas';

export function LoginScreen({ navigation }: AuthStackScreenProps<'Login'>) {
  const { colors } = useTheme();
  const loginMutation = useLoginMutation();
  const passwordInputRef = useRef<AppTextInputInstance>(null);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    login_id?: string;
    password?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setSubmitError(null);
    const parsed = loginRequestSchema.safeParse({
      login_id: loginId,
      password,
    });

    if (!parsed.success) {
      const nextErrors: { login_id?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'login_id' && !nextErrors.login_id) {
          nextErrors.login_id = issue.message;
        }
        if (field === 'password' && !nextErrors.password) {
          nextErrors.password = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    try {
      const response = await loginMutation.mutateAsync(parsed.data);
      if ('mfa_required' in response && response.mfa_required === true) {
        navigation.navigate('MfaVerify');
      }
    } catch (error) {
      setSubmitError(
        getAuthErrorMessage(error, 'Unable to sign in. Check your credentials.'),
      );
    }
  };

  return (
    <ScreenTemplate>
      <View className="mb-6 items-center rounded-3xl border border-border bg-surface px-6 py-8 shadow-sm">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-secondary shadow-sm">
          <LockClosedIcon
            color={colors.onSecondary}
            size={30}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="display" className="text-center font-bold text-text-primary">
          Sign in
        </AppText>
        <AppText className="mt-2 text-center text-sm text-text-secondary leading-5">
          Use your email address or staff username to access your Baigamats business.
        </AppText>
      </View>

      {submitError ? <AlertBanner message={submitError} /> : null}

      <View className="mb-6 rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <FormField
          label="Email or staff username"
          placeholder="jane@company.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordInputRef.current?.focus()}
          leftIcon={
            <UserIcon
              color={colors.textSecondary}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          }
          value={loginId}
          onChangeText={value => {
            setLoginId(value);
            if (fieldErrors.login_id) {
              setFieldErrors(prev => ({ ...prev, login_id: undefined }));
            }
          }}
          error={fieldErrors.login_id}
        />

        <FormField
          ref={passwordInputRef}
          label="Password"
          placeholder="Enter your password"
          isPassword
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="go"
          leftIcon={
            <LockClosedIcon
              color={colors.textSecondary}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          }
          value={password}
          onChangeText={value => {
            setPassword(value);
            if (fieldErrors.password) {
              setFieldErrors(prev => ({ ...prev, password: undefined }));
            }
          }}
          error={fieldErrors.password}
          onSubmitEditing={handleSignIn}
        />

        <Button
          label="Sign in"
          loading={loginMutation.isPending}
          onPress={handleSignIn}
          className="mt-2"
          rightIcon={
            <ArrowRightIcon
              color={colors.onPrimary}
              size={18}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          }
        />
      </View>

      <View className="mb-4 items-center rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <AppText className="mb-3 text-center text-sm text-text-secondary">
          Are you a SACCO or Cooperative Member?
        </AppText>
        <Button
          label="Member Sign In (PIN)"
          variant="outline"
          disabled={loginMutation.isPending}
          onPress={() => navigation.navigate('MemberLogin')}
          className="w-full"
        />
      </View>

      <View className="items-center rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <AppText className="mb-3 text-center text-sm text-text-secondary">
          New to Baigamats? Create a business account.
        </AppText>
        <Button
          label="Create an account"
          variant="outline"
          disabled={loginMutation.isPending}
          onPress={() => navigation.navigate('Register')}
          className="w-full"
          leftIcon={
            <UserPlusIcon
              color={colors.primary}
              size={18}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          }
        />
      </View>
    </ScreenTemplate>
  );
}
