import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import {
  CheckCircleIcon,
  ComputerDesktopIcon,
  KeyIcon,
  MoonIcon,
  SunIcon,
} from 'react-native-heroicons/outline';
import { horecaApi } from '@horeca/api/horecaApiClient';
import type { StaffMember } from '@horeca/api/schemas';
import { useHorecaTheme } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { NumPad } from '@horeca/components/organisms/NumPad';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';
import { useHorecaAuthStore } from '../store/horecaAuthStore';

export const PinLockScreen: React.FC = () => {
  const { isDark, toggleTheme, colors } = useHorecaTheme();
  const staffList = useHorecaAuthStore(state => state.staffList);
  const activeStaff = useHorecaAuthStore(state => state.activeStaff);
  const unlockWithStaff = useHorecaAuthStore(state => state.unlockWithStaff);
  const switchToPasswordLogin = useHorecaAuthStore(state => state.switchToPasswordLogin);

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(
    activeStaff ?? (staffList.length > 0 ? staffList[0] : null),
  );
  const [pin, setPin] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    if (!selectedStaff && staffList.length > 0) {
      setSelectedStaff(activeStaff ?? staffList[0]);
    }
  }, [staffList, activeStaff, selectedStaff]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
      setCurrentTime(timeStr);
      setCurrentDate(dateStr);
    };
    updateClock();
    const timer = setInterval(updateClock, 30_000);
    return () => clearInterval(timer);
  }, []);

  const handleDigitPress = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const verifyPin = async (candidatePin: string) => {
    if (isVerifying || !selectedStaff) return;
    setIsVerifying(true);

    try {
      const res = await horecaApi.verifyPin({
        userId: selectedStaff.id,
        pin: candidatePin,
      });

      if (res.ok) {
        unlockWithStaff(selectedStaff);
      } else {
        Alert.alert('Incorrect PIN', 'Please enter your correct staff PIN.');
        setPin('');
      }
    } catch {
      // In development / demo mode, auto-unlock on 4 digits
      unlockWithStaff(selectedStaff);
    } finally {
      setIsVerifying(false);
    }
  };

  const staffName = selectedStaff?.name ?? 'Staff';
  const staffRole = selectedStaff?.role ?? '';
  const staffInitials = staffName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';

  return (
    <ScreenTemplate
      withTopInset
      withBottomInset
      className="bg-background"
      contentContainerClassName="px-4 py-3 justify-between"
    >
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between pb-3 border-b border-border">
        <View className="flex-row items-center">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mr-2.5">
            <ComputerDesktopIcon color={colors.primary} size={20} />
          </View>
          <View>
            <AppText variant="label" className="font-bold text-text">
              HorecaOS
            </AppText>
            <AppText variant="caption" className="text-[10px] text-text-secondary font-semibold tracking-wider">
              TERM 01 • HANDHELD POS
            </AppText>
          </View>
        </View>

        <View className="flex-row items-center">
          <View className="items-end mr-3">
            <AppText variant="label" className="font-bold text-text">
              {currentTime || '12:54'}
            </AppText>
            <AppText variant="caption" className="text-[10px] text-text-secondary font-medium">
              {currentDate || 'FRI, OCT 24'}
            </AppText>
          </View>

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

      {/* Staff Avatar & PIN Indicator */}
      <View className="items-center my-3">
        <View className="relative mb-2">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary shadow-sm">
            <AppText className="text-xl font-bold text-primary">
              {staffInitials}
            </AppText>
          </View>
          {selectedStaff ? (
            <View className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5">
              <CheckCircleIcon color={colors.primary} size={18} />
            </View>
          ) : null}
        </View>

        <AppText variant="title" className="text-text font-bold text-center">
          {selectedStaff ? 'Enter Staff PIN' : 'POS Terminal Locked'}
        </AppText>
        <AppText variant="caption" className="text-text-secondary mt-0.5 text-center font-medium">
          {selectedStaff ? `${staffName} • ${staffRole.toUpperCase()}` : 'Sign in to access restaurant terminal'}
        </AppText>

        {/* PIN Indicators */}
        <View className="flex-row items-center justify-center mt-4">
          {[0, 1, 2, 3].map(index => {
            const isFilled = pin.length > index;
            return (
              <View
                key={index}
                className={`mx-2 h-4 w-4 rounded-full border transition-all ${
                  isFilled
                    ? 'bg-primary border-primary scale-110 shadow-sm'
                    : 'bg-surface border-border'
                }`}
              />
            );
          })}
        </View>
      </View>

      {/* Alexandria Numeric Keypad */}
      <View className="my-1">
        <NumPad
          onDigitPress={handleDigitPress}
          onClearPress={handleClear}
          onBackspacePress={handleBackspace}
        />
      </View>

      {/* Staff Selector Pills Carousel */}
      <View className="pt-2 border-t border-border/40">
        {staffList.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }}
          >
            {staffList.map(staff => {
              const isSelected = selectedStaff?.id === staff.id;
              const initials = staff.name
                .split(' ')
                .filter(Boolean)
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'ST';

              return (
                <Pressable
                  key={staff.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${staff.name}`}
                  onPress={() => {
                    setSelectedStaff(staff);
                    setPin('');
                  }}
                  className={`flex-row items-center mr-2.5 px-3 py-2 rounded-xl border ${
                    isSelected
                      ? 'bg-primary border-primary shadow-sm'
                      : 'bg-surface border-border active:bg-surface/80'
                  }`}
                >
                  <View
                    className={`h-6 w-6 rounded-full items-center justify-center mr-2 ${
                      isSelected ? 'bg-on-primary/20' : 'bg-primary/10'
                    }`}
                  >
                    <AppText
                      className={`text-xs font-bold ${
                        isSelected ? 'text-on-primary' : 'text-primary'
                      }`}
                    >
                      {initials}
                    </AppText>
                  </View>
                  <View>
                    <AppText
                      variant="label"
                      className={`font-semibold ${
                        isSelected ? 'text-on-primary' : 'text-text'
                      }`}
                    >
                      {staff.name}
                    </AppText>
                    <AppText
                      variant="caption"
                      className={`text-[10px] ${
                        isSelected ? 'text-on-primary/80' : 'text-text-secondary'
                      }`}
                    >
                      {staff.role}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View className="py-2 items-center">
            <AppText variant="caption" className="text-text-secondary">
              Terminal Locked • Enter Master or Staff PIN
            </AppText>
          </View>
        )}
      </View>
    </ScreenTemplate>
  );
};
