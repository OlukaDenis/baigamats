import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, View } from 'react-native';
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  KeyIcon,
  ShieldCheckIcon,
} from 'react-native-heroicons/outline';
import { env } from '@shared/config/env';
import { tokenStorage } from '@shared/services/tokenStorage';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { LoginResponse, MeResponse } from '@horeca/api/schemas';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { FormField } from '@horeca/components/molecules/FormField';
import {
  ScreenTemplate,
  type ScreenScrollViewInstance,
} from '@horeca/components/templates/ScreenTemplate';
import { appModal } from '@horeca/components/molecules/modal/appModalStore';
import { useHorecaAuthStore } from '../store/horecaAuthStore';

const ALLOWED_ME_ROLES: ReadonlySet<MeResponse['role']> = new Set([
  'manager',
  'cashier',
  'waiter',
  'kitchen',
  'admin',
  'owner',
  'staff',
]);

function buildInitialMeFromLogin(res: LoginResponse): MeResponse {
  const rawRole = res.profile?.role?.trim().toLowerCase() as MeResponse['role'] | undefined;
  const role: MeResponse['role'] =
    rawRole && ALLOWED_ME_ROLES.has(rawRole) ? rawRole : 'staff';
  const email = res.user?.email?.trim() ?? '';
  const fallbackName = email ? email.split('@')[0] : 'Staff Member';

  return {
    userId: res.user?.id ?? '',
    name: fallbackName,
    organizationId: res.profile?.organizationId ?? '',
    role,
    permissions: [],
  };
}

export const HorecaLoginScreen: React.FC = () => {
  const colors = useHorecaColors();
  const loginSuccess = useHorecaAuthStore(state => state.loginSuccess);
  const switchToPinLogin = useHorecaAuthStore(state => state.switchToPinLogin);

  const [loginId, setLoginId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // MFA state
  const [isMfaStep, setIsMfaStep] = useState<boolean>(false);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [mfaSession, setMfaSession] = useState<{ accessToken: string; refreshToken: string } | null>(null);

  // Keyboard scrolling so focused password/MFA input sits cleanly above the keyboard
  const scrollViewRef = useRef<ScreenScrollViewInstance>(null);
  const [scrollHeight, setScrollHeight] = useState<number>(0);
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<'loginId' | 'password' | 'mfa' | null>(null);
  const cardOffsetYRef = useRef<number>(0);
  const formOffsetYRef = useRef<number>(0);
  const fieldBoundsRef = useRef<Record<'loginId' | 'password' | 'mfa', { y: number; height: number }>>({
    loginId: { y: 0, height: 0 },
    password: { y: 0, height: 0 },
    mfa: { y: 0, height: 0 },
  });

  const scrollFieldAboveKeyboard = useCallback(
    (field: 'loginId' | 'password' | 'mfa') => {
      if (!scrollHeight) return;
      const bounds = fieldBoundsRef.current[field];
      const fieldBottomY =
        cardOffsetYRef.current + formOffsetYRef.current + bounds.y + bounds.height;
      const targetY = Math.max(0, fieldBottomY - scrollHeight + 16);
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    },
    [scrollHeight],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      if (focusedField) {
        requestAnimationFrame(() => scrollFieldAboveKeyboard(focusedField));
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [focusedField, scrollFieldAboveKeyboard]);

  useEffect(() => {
    if (keyboardVisible && focusedField) {
      scrollFieldAboveKeyboard(focusedField);
    }
  }, [keyboardVisible, focusedField, scrollHeight, scrollFieldAboveKeyboard]);

  // Return to username/password form on hardware back press when on MFA step
  useEffect(() => {
    if (!isMfaStep) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsMfaStep(false);
      return true;
    });
    return () => sub.remove();
  }, [isMfaStep]);

  const completeAuthSession = async (res: LoginResponse) => {
    if (!res.session?.accessToken) {
      return;
    }

    await tokenStorage.setSession({
      session: res.session,
      user: res.user,
      profile: res.profile,
    });

    const initialMe = buildInitialMeFromLogin(res);
    loginSuccess(initialMe, undefined, {
      user: res.user,
      profile: res.profile,
    });

    // Silently fetch full user details in the background without blocking navigation
    void horecaApi
      .me()
      .then(me => {
        useHorecaAuthStore.getState().setMe(me);
      })
      .catch(() => {});
  };

  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      appModal.warning('Required', 'Please enter your email or staff username and password.');
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
        await completeAuthSession(res);
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
        loginSuccess(mockMe, undefined, {
          user: { id: 'staff-01', email: 'alex@horeca.com' },
          profile: { organizationId: 'org-demo', role: 'manager' },
        });
      } else {
        const errorMsg =
          err?.response?.data?.message || err?.message || 'Invalid username or password';
        appModal.error('Sign In Failed', errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaCode || mfaCode.length !== 6 || !mfaSession) {
      appModal.warning('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await horecaApi.mfaVerify(factorId, mfaCode, mfaSession);
      if (res.session?.accessToken) {
        await completeAuthSession(res);
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || 'Invalid or expired code.';
      appModal.error('Verification Failed', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenTemplate
      scrollable
      scrollViewRef={scrollViewRef}
      scrollViewProps={{
        onLayout: event => setScrollHeight(event.nativeEvent.layout.height),
      }}
      withTopInset
      withBottomInset
      className="bg-background"
      contentContainerClassName={`px-5 py-6 ${keyboardVisible ? 'justify-start' : 'justify-center'}`}
    >
      <View
        onLayout={event => {
          cardOffsetYRef.current = event.nativeEvent.layout.y;
        }}
        className="w-full max-w-md self-center"
      >
        {/* Brand Header */}
        <View className="items-center mb-8">
          <View className="h-16 w-16 items-center justify-center rounded-horeca bg-primary/10 border border-primary/20 mb-3 shadow-sm">
            <BuildingStorefrontIcon color={colors.primary} size={32} />
          </View>
          <AppText variant="display" className="text-2xl font-bold text-text text-center">
            Baigamats HORECA
          </AppText>
          <AppText variant="caption" className="text-text-secondary mt-1 text-center font-medium">
            Restaurant, Hotel and Bar POS
          </AppText>
        </View>

        {/* Login Form Card */}
        <View
          onLayout={event => {
            formOffsetYRef.current = event.nativeEvent.layout.y;
          }}
          className="rounded-horeca p-6"
        >
          {!isMfaStep ? (
            <>
              <AppText variant="title" className="text-text font-bold mb-1">
                Terminal Sign In
              </AppText>
              <AppText variant="caption" className="text-text-secondary mb-6">
                Sign in with your staff account or management credentials.
              </AppText>

              <View
                onLayout={event => {
                  fieldBoundsRef.current.loginId = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
              >
                <FormField
                  label="Username or Email"
                  placeholder="Enter username or email"
                  value={loginId}
                  onChangeText={setLoginId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => {
                    setFocusedField('loginId');
                    scrollFieldAboveKeyboard('loginId');
                  }}
                />
              </View>

              <View
                onLayout={event => {
                  fieldBoundsRef.current.password = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
              >
                <FormField
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  onFocus={() => {
                    setFocusedField('password');
                    scrollFieldAboveKeyboard('password');
                  }}
                />
              </View>

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
                <View className="h-12 w-12 items-center justify-center rounded-horeca bg-primary/10 mb-2">
                  <ShieldCheckIcon color={colors.primary} size={24} />
                </View>
                <AppText variant="title" className="text-text font-bold">
                  Two-Factor Verification
                </AppText>
                <AppText variant="caption" className="text-text-secondary text-center mt-1">
                  Enter the 6-digit authentication code sent to your registered device.
                </AppText>
              </View>

              <View
                onLayout={event => {
                  fieldBoundsRef.current.mfa = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
              >
                <FormField
                  label="Verification Code"
                  placeholder="000000"
                  value={mfaCode}
                  onChangeText={setMfaCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  onFocus={() => {
                    setFocusedField('mfa');
                    scrollFieldAboveKeyboard('mfa');
                  }}
                />
              </View>

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
