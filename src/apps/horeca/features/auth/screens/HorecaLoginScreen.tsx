import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  KeyIcon,
  ShieldCheckIcon,
} from 'react-native-heroicons/outline';
import { env } from '@shared/config/env';
import { tokenStorage } from '@shared/services/tokenStorage';
import { horecaApi } from '@horeca/api/horecaApiClient';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { FormField } from '@horeca/components/molecules/FormField';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useHorecaAuthStore } from '../store/horecaAuthStore';

export const HorecaLoginScreen: React.FC = () => {
  const colors = useHorecaColors();
  const loginSuccess = useHorecaAuthStore(state => state.loginSuccess);
  const switchToPinLogin = useHorecaAuthStore(state => state.switchToPinLogin);

  const [loginId, setLoginId] = useState<string>('staff.alex');
  const [password, setPassword] = useState<string>('Pass1234!');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // MFA state
  const [isMfaStep, setIsMfaStep] = useState<boolean>(false);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [mfaSession, setMfaSession] = useState<{ accessToken: string; refreshToken: string } | null>(null);

  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email or staff username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await horecaApi.login({ loginId: loginId.trim(), password });

      if (res.mfaRequired && res.factorId && res.mfaSession) {
        setIsMfaStep(true);
        setFactorId(res.factorId);
        setMfaSession(res.mfaSession);
      } else if (res.session?.accessToken) {
        await tokenStorage.saveTokens({
          accessToken: res.session.accessToken,
          refreshToken: res.session.refreshToken,
        });
        const me = await horecaApi.me();
        let staffList: any[] = [];
        try {
          staffList = await horecaApi.getStaff();
          useHorecaAuthStore.getState().setStaffList(staffList);
        } catch {
          // staff endpoint might require manager or be empty
        }
        loginSuccess(me, staffList[0]);
      }
    } catch (err: any) {
      if (env.ENABLE_MOCK) {
        const mockMe = {
          userId: 'staff-01',
          name: 'Alex R.',
          organizationId: 'org-demo',
          role: 'manager' as const,
          permissions: ['tables:read', 'tables:write', 'orders:read', 'orders:write', 'billing:write'],
        };
        loginSuccess(mockMe);
      } else {
        const errorMsg =
          err?.response?.data?.message || err?.message || 'Invalid username or password';
        Alert.alert('Sign In Failed', errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaCode || mfaCode.length !== 6 || !mfaSession) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await horecaApi.mfaVerify(factorId, mfaCode, mfaSession);
      if (res.session?.accessToken) {
        await tokenStorage.saveTokens({
          accessToken: res.session.accessToken,
          refreshToken: res.session.refreshToken,
        });
        const me = await horecaApi.me();
        let staffList: any[] = [];
        try {
          staffList = await horecaApi.getStaff();
          useHorecaAuthStore.getState().setStaffList(staffList);
        } catch {
          // ignore
        }
        loginSuccess(me, staffList[0]);
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || 'Invalid or expired code.';
      Alert.alert('Verification Failed', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenTemplate
      scrollable
      withTopInset
      withBottomInset
      className="bg-background"
      contentContainerClassName="px-5 py-6 justify-center"
    >
      <View className="w-full max-w-md self-center">
        {/* Brand Header */}
        <View className="items-center mb-8">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-3 shadow-sm">
            <BuildingStorefrontIcon color={colors.primary} size={32} />
          </View>
          <AppText variant="display" className="text-2xl font-bold text-text text-center">
            Baigamats HORECA
          </AppText>
          <AppText variant="caption" className="text-text-secondary mt-1 text-center font-medium">
            Restaurant, Bar & Hospitality POS
          </AppText>
        </View>

        {/* Login Form Card */}
        <View className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {!isMfaStep ? (
            <>
              <AppText variant="title" className="text-text font-bold mb-1">
                Terminal Sign In
              </AppText>
              <AppText variant="caption" className="text-text-secondary mb-6">
                Sign in with your staff account or management credentials.
              </AppText>

              <FormField
                label="Staff Username or Email"
                placeholder="e.g. staff.alex or manager@bistro.com"
                value={loginId}
                onChangeText={setLoginId}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <FormField
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                isPassword
              />

              <Button
                label="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                className="mt-2"
              />

              {/* Divider & Login with PIN Option */}
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-[1px] bg-border" />
                <AppText variant="caption" className="mx-3 text-text-secondary font-semibold uppercase tracking-wider text-[11px]">
                  OR
                </AppText>
                <View className="flex-1 h-[1px] bg-border" />
              </View>

              <Button
                label="Login with PIN"
                variant="secondary"
                onPress={switchToPinLogin}
                leftIcon={<KeyIcon color={colors.primary} size={20} />}
              />
            </>
          ) : (
            <>
              <View className="items-center mb-5">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
                  <ShieldCheckIcon color={colors.primary} size={24} />
                </View>
                <AppText variant="title" className="text-text font-bold">
                  Two-Factor Verification
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-center mt-1">
                  Enter the 6-digit authentication code sent to your registered device.
                </AppText>
              </View>

              <FormField
                label="Verification Code"
                placeholder="000000"
                value={mfaCode}
                onChangeText={setMfaCode}
                keyboardType="number-pad"
                maxLength={6}
              />

              <Button
                label="Verify & Enter"
                onPress={handleVerifyMfa}
                loading={isLoading}
                className="mt-2"
              />

              <Button
                label="Back to Sign In"
                variant="ghost"
                onPress={() => setIsMfaStep(false)}
                leftIcon={<ArrowLeftIcon color={colors.primary} size={18} />}
                className="mt-3"
              />
            </>
          )}
        </View>
      </View>
    </ScreenTemplate>
  );
};
