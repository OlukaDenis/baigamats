import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowRightIcon,
  ComputerDesktopIcon,
  KeyIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { env } from '@shared/config/env';
import { getDeviceSecret } from '@shared/services/deviceSecret';
import { tokenStorage } from '@shared/services/tokenStorage';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { StaffMember } from '@horeca/api/schemas';
import { useHorecaTheme } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Button } from '@horeca/components/atoms/Button';
import { NumPad } from '@horeca/components/organisms/NumPad';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useHorecaAuthStore } from '../store/horecaAuthStore';

const PIN_LENGTH = 4;

export const PinLockScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme, colors } = useHorecaTheme();
  const loginSuccess = useHorecaAuthStore(state => state.loginSuccess);
  const unlockWithStaff = useHorecaAuthStore(state => state.unlockWithStaff);
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const lastUsername = useHorecaAuthStore(state => state.lastUsername);
  const setLastUsername = useHorecaAuthStore(state => state.setLastUsername);
  const switchToPasswordLogin = useHorecaAuthStore(state => state.switchToPasswordLogin);

  const [username, setUsername] = useState<string>(() => lastUsername || '');
  const [pin, setPin] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Pre-fill username from cached last username if available
  useEffect(() => {
    if (lastUsername && !username) {
      setUsername(lastUsername);
    }
  }, [lastUsername, username]);

  // Live counting digital clock (updates every second)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
      setCurrentDate(
        now
          .toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
          .toUpperCase(),
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
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
        // Cache the successful username
        setLastUsername(username.trim());
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
        setLastUsername(username.trim());
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
      className="bg-background"
      contentContainerClassName="px-4 py-2 justify-between flex-grow"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-between"
      >
        {/* Top Header Bar */}
        <View className="flex-row items-center justify-between pb-3 border-b border-border/50">
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mr-2.5">
              <ComputerDesktopIcon color={colors.primary} size={20} />
            </View>
            <View>
              <AppText variant="label" className="font-bold text-text">
                HorecaPOS
              </AppText>
              <AppText variant="caption" className="text-[10px] text-text-secondary">
                Terminal Locked
              </AppText>
            </View>
          </View>

          <View className="flex-row items-center">
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

        {/* Center Section: Live Clock, Title, Centered Custom Username Field, Circular Action & PIN Dots */}
        <View className="items-center justify-center my-3 mt-7">
          {/* Bigger Digital Clock with Seconds */}
          <View className="items-center mb-5">
            <View className="px-5 py-2.5 rounded-full bg-surface border border-border/80 shadow-md flex-row items-center">
              <View className="h-2.5 w-2.5 rounded-full bg-status-available mr-2.5" />
              {/* <AppText variant="caption" className="font-mono text-xs font-bold text-text-secondary tracking-widest mr-1.5">
                {currentDate}
              </AppText> */}
              <AppText variant="display" className="font-mono text-3xl font-black text-primary tracking-wider">
                {currentTime || '00:00:00'}
              </AppText>
            </View>
          </View>

          {/* Screen Title */}
          <AppText variant="title" className="text-2xl font-black text-text text-center tracking-tight">
            PIN Sign In
          </AppText>
          <AppText variant="caption" className="text-text-secondary mt-1 mb-4 text-center font-medium">
            Enter your credentials to unlock terminal
          </AppText>

          {/* Custom Username Field with Centered Text */}
          <View className="w-full max-w-xs mb-4">
            <View className="relative flex-row items-center justify-center rounded-2xl bg-surface border border-border px-4 py-2.5 shadow-sm focus:border-primary">
              <View className="absolute left-3.5">
                <UserIcon color={colors.onSurfaceVariant} size={18} />
              </View>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor={colors.onSurfaceVariant}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                editable={!isVerifying}
                style={{
                  color: colors.onSurface,
                  textAlign: 'center',
                }}
                className="w-full text-base font-bold py-1 px-7"
              />
            </View>
          </View>



          {/* PIN Indicators / Dots */}
          <View className="flex-row items-center justify-center py-6">
            {Array.from({ length: PIN_LENGTH }, (_, index) => {
              const isFilled = pin.length > index;
              return (
                <View
                  key={index}
                  className={`mx-2.5 h-4 w-4 rounded-full border transition-all ${isFilled
                    ? 'bg-primary border-primary scale-110'
                    : 'bg-surface border-border'
                    }`}
                />
              );
            })}
          </View>
        </View>

        {/* Bottom Section: Numeric Keypad docked at the bottom */}
        <View style={{ paddingBottom: Math.max(insets.bottom, 10) }} className="mt-auto">
          {/* Circular Round Sign-In Action Button above the PIN boxes */}
          <View className="items-center mb-10">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign In"
              disabled={!canSubmit}
              onPress={handleSignIn}
              style={{
                backgroundColor: canSubmit ? colors.primary : colors.surfaceDim,
                borderColor: canSubmit ? colors.primary : colors.outlineVariant,
                transform: [{ scale: canSubmit ? 1 : 0.95 }],
              }}
              className="h-14 w-14 rounded-full border-2 items-center justify-center shadow-lg active:opacity-80"
            >
              {isVerifying ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <ArrowRightIcon
                  color={canSubmit ? colors.onPrimary : colors.onSurfaceVariant}
                  size={24}
                  strokeWidth={2.5}
                />
              )}
            </Pressable>
          </View>

          <NumPad
            onDigitPress={handleDigitPress}
            onClearPress={handleClear}
            onBackspacePress={handleBackspace}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenTemplate>
  );
};
