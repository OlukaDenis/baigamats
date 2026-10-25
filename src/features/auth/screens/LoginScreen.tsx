import { useState } from 'react';
import { View } from 'react-native';
import { LockClosedIcon } from 'react-native-heroicons/outline';

import type { AuthStackScreenProps } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
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
      <View className="mb-8 items-center rounded-2xl bg-tertiary px-6 py-8">
        <View className="mb-3 rounded-full bg-secondary p-4">
          <LockClosedIcon
            color={colors.onSecondary}
            size={28}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="display" className="text-center">
          Sign in
        </AppText>
        <AppText className="mt-2 text-center">
          Use your email address or staff username to access your Baigamats business.
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
          label="Email or staff username"
          placeholder="jane@company.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
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
          label="Password"
          placeholder="Enter your password"
          isPassword
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
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
        />
      </View>

      <View className="items-center rounded-2xl bg-surface p-5">
        <AppText className="mb-3 text-center">
          New to Baigamats? Create a business account.
        </AppText>
        <Button
          label="Create an account"
          variant="outline"
          disabled={loginMutation.isPending}
          onPress={() => navigation.navigate('Register')}
          className="w-full"
        />
      </View>
    </ScreenTemplate>
  );
}
