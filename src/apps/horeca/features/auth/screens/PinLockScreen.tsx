import React, { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import {
  ComputerDesktopIcon,
  KeyIcon,
  MoonIcon,
  SunIcon,
} from 'react-native-heroicons/outline';
import { env } from '@shared/config/env';
import { getDeviceSecret } from '@shared/services/deviceSecret';
import { tokenStorage } from '@shared/services/tokenStorage';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { StaffMember } from '@horeca/api/schemas';
import { useHorecaTheme } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { FormField } from '@horeca/components/molecules/FormField';
import { NumPad } from '@horeca/components/organisms/NumPad';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useHorecaAuthStore } from '../store/horecaAuthStore';

const PIN_LENGTH = 4;

export const PinLockScreen: React.FC = () => {
  const { isDark, toggleTheme, colors } = useHorecaTheme();
  const loginSuccess = useHorecaAuthStore(state => state.loginSuccess);
  const unlockWithStaff = useHorecaAuthStore(state => state.unlockWithStaff);
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const switchToPasswordLogin = useHorecaAuthStore(state => state.switchToPasswordLogin);

  const [username, setUsername] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase(),
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 30_000);
    return () => clearInterval(timer);
  }, []);

  const handleDigitPress = (digit: string) => {
    if (isVerifying) return;
    setPin(prev => (prev.length < PIN_LENGTH ? prev + digit : prev));
  };

  const handleClear = () => setPin('');
  const handleBackspace = () => setPin(prev => prev.slice(0, -1));

  const canSubmit = username.trim().length > 0 && pin.length === PIN_LENGTH && !isVerifying;

  const handleSignIn = async () => {
    if (!canSubmit) return;
    setIsVerifying(true);

    try {
      const deviceSecret = await getDeviceSecret();
      const res = await horecaApi.pinLogin({
        username: username.trim(),
        pin,
        deviceSecret,
      });

      if (res.session?.accessToken) {
        await tokenStorage.saveTokens({
          accessToken: res.session.accessToken,
          refreshToken: res.session.refreshToken,
        });
        const me = await horecaApi.me();
        let staffList: StaffMember[] = [];
        try {
          staffList = await horecaApi.getStaff();
          useHorecaAuthStore.getState().setStaffList(staffList);
        } catch {
          // staff endpoint may be restricted for this role
        }
        loginSuccess(me, staffList.find(s => s.id === me.userId) ?? staffList[0]);
      } else {
        Alert.alert('Sign In Failed', 'Unexpected response from server.');
        setPin('');
      }
    } catch (err: any) {
      if (env.ENABLE_MOCK && activeStaff) {
        // Demo mode: unlock without a backend
        unlockWithStaff(activeStaff);
      } else {
        const message =
          err?.response?.data?.message || err?.message || 'Incorrect username or PIN.';
        Alert.alert('Sign In Failed', String(message));
        setPin('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <ScreenTemplate
      scrollable
      withTopInset
      withBottomInset
      className="bg-background"
      contentContainerClassName="px-4 py-3"
    >
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between pb-3 border-b border-border">
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mr-2.5">
            <ComputerDesktopIcon color={colors.primary} size={20} />
          </View>
          <View>
            <AppText variant="label" className="font-bold text-text">
              HorecaPOS
            </AppText>
          </View>
        </View>

        <View className="flex-row items-center">
          {/* <View className="items-end mr-3">
            <AppText variant="label" className="font-bold text-text">
              {currentTime || '12:54'}
            </AppText>
            <AppText variant="caption" className="text-[10px] text-text-secondary font-medium">
              {currentDate || 'FRI, OCT 24'}
            </AppText>
          </View> */}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle Theme"
            onPress={toggleTheme}
            className="h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border mr-2 active:opacity-70"
            hitSlop={6}
          >
            {isDark ? (
              <SunIcon color={colors.primary} size={16} />
            ) : (
              <MoonIcon color={colors.onSurfaceVariant} size={16} />
            )}
          </Pressable>

          <Button
            label="Password"
            variant="outline"
            size="sm"
            onPress={switchToPasswordLogin}
            leftIcon={<KeyIcon color={colors.primary} size={14} />}
          />
        </View>
      </View>

      {/* Username + PIN indicators */}
      <View className="mt-4">
        <AppText variant="title" className="text-text font-bold text-center">
          Staff PIN Sign In
        </AppText>
        <AppText variant="caption" className="text-text-secondary mt-0.5 mb-3 text-center font-medium">
          Enter your username and PIN
        </AppText>

        <FormField
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="e.g. denis"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          editable={!isVerifying}
          containerClassName="w-full max-w-sm self-center px-4 mb-2"
        />

        <View className="flex-row items-center justify-center mt-2">
          {Array.from({ length: PIN_LENGTH }, (_, index) => {
            const isFilled = pin.length > index;
            return (
              <View
                key={index}
                className={`mx-2 h-4 w-4 rounded-full border ${
                  isFilled
                    ? 'bg-primary border-primary'
                    : 'bg-surface border-border'
                }`}
              />
            );
          })}
        </View>
      </View>

      {/* Numeric Keypad */}
      <View className="my-3">
        <NumPad
          onDigitPress={handleDigitPress}
          onClearPress={handleClear}
          onBackspacePress={handleBackspace}
        />
      </View>

      <View className="w-full max-w-sm self-center px-4">
        <Button
          label={isVerifying ? 'Signing in...' : 'Sign In'}
          variant="primary"
          onPress={handleSignIn}
          disabled={!canSubmit}
        />
      </View>
    </ScreenTemplate>
  );
};
