import { useState } from 'react';
import { View } from 'react-native';
import {
  EnvelopeIcon,
  UserPlusIcon,
} from 'react-native-heroicons/outline';

import type { AuthStackScreenProps } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { FormField } from '../../../components/molecules/FormField';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import {
  getAuthErrorMessage,
  useRegisterMutation,
} from '../hooks/useAuthMutations';
import { registerRequestSchema } from '../schemas/authSchemas';

export function RegisterScreen({
  navigation,
}: AuthStackScreenProps<'Register'>) {
  const { colors } = useTheme();
  const registerMutation = useRegisterMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null,
  );

  const handleRegister = async () => {
    setSubmitError(null);
    const parsed = registerRequestSchema.safeParse({ email, password });

    const nextErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' && !nextErrors.email) {
          nextErrors.email = issue.message;
        }
        if (field === 'password' && !nextErrors.password) {
          nextErrors.password = issue.message;
        }
      }
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(nextErrors).length > 0 || !parsed.success) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    try {
      const response = await registerMutation.mutateAsync(parsed.data);
      setConfirmationMessage(
        response.message ||
          'We sent a confirmation link to your email address. After confirming, sign in to set up your business.',
      );
    } catch (error) {
      setSubmitError(
        getAuthErrorMessage(
          error,
          'Unable to create account right now. Please try again.',
        ),
      );
    }
  };

  if (confirmationMessage) {
    return (
      <ScreenTemplate>
        <View className="mb-8 items-center rounded-2xl bg-tertiary px-6 py-8">
          <View className="mb-4 rounded-full bg-secondary p-4">
            <EnvelopeIcon
              color={colors.onSecondary}
              size={32}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <AppText variant="display" className="text-center">
            Check your email
          </AppText>
          <AppText className="mt-3 text-center">{confirmationMessage}</AppText>
        </View>

        <Button
          label="Return to sign in"
          onPress={() => navigation.navigate('Login')}
        />
      </ScreenTemplate>
    );
  }

  return (
    <ScreenTemplate>
      <View className="mb-8 items-center rounded-2xl bg-tertiary px-6 py-8">
        <View className="mb-3 rounded-full bg-secondary p-4">
          <UserPlusIcon
            color={colors.onSecondary}
            size={28}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="display" className="text-center">
          Create an account
        </AppText>
        <AppText className="mt-2 text-center">
          Register with your email address to start accepting mobile money payments
          and managing your shop.
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
          label="Email address"
          placeholder="you@business.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={value => {
            setEmail(value);
            if (fieldErrors.email) {
              setFieldErrors(prev => ({ ...prev, email: undefined }));
            }
          }}
          error={fieldErrors.email}
        />

        <FormField
          label="Password"
          placeholder="At least 8 characters"
          isPassword
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          value={password}
          onChangeText={value => {
            setPassword(value);
            if (fieldErrors.password) {
              setFieldErrors(prev => ({ ...prev, password: undefined }));
            }
          }}
          error={fieldErrors.password}
          helperText="Minimum 8 characters"
        />

        <FormField
          label="Confirm password"
          placeholder="Re-enter your password"
          isPassword
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          value={confirmPassword}
          onChangeText={value => {
            setConfirmPassword(value);
            if (fieldErrors.confirmPassword) {
              setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }
          }}
          error={fieldErrors.confirmPassword}
          onSubmitEditing={handleRegister}
        />

        <Button
          label="Create account"
          loading={registerMutation.isPending}
          onPress={handleRegister}
          className="mt-2"
        />
      </View>

      <View className="items-center rounded-2xl bg-surface p-5">
        <AppText className="mb-3 text-center">Already have an account?</AppText>
        <Button
          label="Back to sign in"
          variant="outline"
          disabled={registerMutation.isPending}
          onPress={() => navigation.navigate('Login')}
          className="w-full"
        />
      </View>
    </ScreenTemplate>
  );
}
