import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BuildingOffice2Icon,
  LockClosedIcon,
  ShieldExclamationIcon,
  UserIcon,
} from 'react-native-heroicons/outline';

import type { AuthStackParamList } from '../../../app/navigation/types';
import { AppText } from '../../../components/atoms/AppText';
import { Button } from '../../../components/atoms/Button';
import { AlertBanner } from '../../../components/molecules/AlertBanner';
import { FormField } from '../../../components/molecules/FormField';
import { ScreenTemplate } from '../../../components/templates/ScreenTemplate';
import { useTheme } from '../../../theme/ThemeProvider';
import { ApiError } from '../../../services/api/client';
import { memberAuthApi } from '../api/memberAuthApi';
import { memberLoginRequestSchema } from '../schemas/memberAuthSchemas';
import { useAuthStore } from '../store/authStore';

export function MemberLoginScreen() {
  const { colors } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'MemberLogin'>>();
  const setMemberAuthenticated = useAuthStore(
    state => state.setMemberAuthenticated,
  );

  const [org, setOrg] = useState('');
  const [memberNo, setMemberNo] = useState('');
  const [pin, setPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    org?: string;
    member_no?: string;
    password?: string;
  }>({});

  const handleLogin = async () => {
    setErrorMessage(null);
    setFieldErrors({});

    const validation = memberLoginRequestSchema.safeParse({
      org,
      member_no: memberNo,
      password: pin,
    });

    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        org: formatted.org?._errors[0],
        member_no: formatted.member_no?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setLoading(true);

    try {
      const response = await memberAuthApi.login(validation.data);

      await setMemberAuthenticated({
        session: response.session,
        member: response.member,
        organization: response.organization,
        mustChangePassword: Boolean(response.must_change_password),
      });

      if (response.must_change_password) {
        navigation.navigate('ChangePin', { isMandatory: true });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'session_active' || err.status === 409) {
          setErrorMessage(
            'You are currently signed in on another device. Please log out from that device first or wait for the session to lapse.',
          );
        } else if (err.errorCode === 'account_locked' || (err.status === 403 && err.errorCode !== 'password_change_required')) {
          setErrorMessage(
            'Your account has been locked due to 5 incorrect attempts. Please visit your cooperative branch to unlock it.',
          );
        } else if (err.errorCode === 'password_change_required') {
          navigation.navigate('ChangePin', { isMandatory: true });
        } else if (err.status === 426) {
          setErrorMessage(
            err.message || 'An application update is required. Please update via the app store.',
          );
        } else {
          setErrorMessage(err.message || 'Sign in failed. Please verify your credentials.');
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to connect. Please check your network and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenTemplate>
      <View className="mb-6 items-center">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-sm">
          <BuildingOffice2Icon
            color={colors.onPrimary}
            size={32}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText
          variant="display"
          accessibilityRole="header"
          className="text-center font-bold text-text-primary"
        >
          Cooperative Member Sign In
        </AppText>
        <AppText className="mt-2 text-center text-sm text-text-secondary">
          Access your savings, shares, and welfare balances.
        </AppText>
      </View>

      {errorMessage ? <AlertBanner message={errorMessage} /> : null}

      <View className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <FormField
          label="Cooperative Address / Slug"
          placeholder="e.g. kagera-sacco"
          value={org}
          onChangeText={text => {
            setOrg(text);
            if (fieldErrors.org) setFieldErrors(prev => ({ ...prev, org: undefined }));
          }}
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.org}
          helperText="The unique name or code assigned to your SACCO"
        />

        <FormField
          label="Member Number or Phone"
          placeholder="e.g. M-1049 or 0772123456"
          value={memberNo}
          onChangeText={text => {
            setMemberNo(text);
            if (fieldErrors.member_no) {
              setFieldErrors(prev => ({ ...prev, member_no: undefined }));
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.member_no}
        />

        <FormField
          label="Security PIN (4 or 5 digits)"
          placeholder="••••"
          value={pin}
          onChangeText={text => {
            // Numeric only
            const cleaned = text.replace(/[^0-9]/g, '').slice(0, 5);
            setPin(cleaned);
            if (fieldErrors.password) {
              setFieldErrors(prev => ({ ...prev, password: undefined }));
            }
          }}
          keyboardType="numeric"
          isPassword
          maxLength={5}
          error={fieldErrors.password}
        />

        <Button
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          className="mt-4"
        />

        <View className="mt-6 flex-row items-center justify-center border-t border-border pt-4">
          <AppText className="text-sm text-text-secondary">
            Field Officer or Staff?{' '}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to Staff Sign In"
            onPress={() => navigation.navigate('Login')}
          >
            <AppText className="font-semibold text-primary underline">
              Staff Portal
            </AppText>
          </Pressable>
        </View>
      </View>
    </ScreenTemplate>
  );
}
