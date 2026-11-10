import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, View } from 'react-native';
import { BuildingStorefrontIcon, SparklesIcon } from 'react-native-heroicons/outline';
import { APP_VERSION } from '@shared/utils/appVersion';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';

export interface HorecaSplashScreenProps {
  message?: string;
}

/**
 * Splash screen for the Baigamats HORECA POS application.
 * Displayed during app initialization, auth hydration, and offline store warmup.
 */
export const HorecaSplashScreen: React.FC<HorecaSplashScreenProps> = ({
  message = 'Initializing...',
}) => {
  const colors = useHorecaColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <ScreenTemplate scrollable={false} className="bg-background">
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading Baigamats HORECA POS"
        className="flex-1 items-center justify-between px-6 py-12"
      >
        {/* Spacer for vertical balance */}
        <View className="h-6" />

        {/* Center: Brand Card */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
          className="w-full max-w-sm items-center"
        >
          {/* Hero Icon Container */}
          <View className="relative mb-6">
            <View className="h-24 w-24 items-center justify-center rounded-horeca bg-primary/10 border-2 border-primary/25 shadow-lg">
              <BuildingStorefrontIcon
                color={colors.primary}
                size={48}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
          </View>

          {/* App Title & Subtitle */}
          <AppText
            variant="display"
            className="text-center font-black text-text tracking-tight text-3xl"
          >
            Baigamats HORECA
          </AppText>
          <AppText
            variant="label"
            className="mt-1 text-center font-semibold text-primary tracking-wide text-xs uppercase"
          >
            Point of Sale System
          </AppText>
          <AppText
            variant="caption"
            className="mt-2 text-center text-text-secondary text-xs max-w-[240px]"
          >
            Tables, kitchen orders, inventory & fast checkout
          </AppText>

          {/* Loading Indicator Pill */}
          <View className="mt-10 flex-row items-center rounded-horeca bg-surface px-5 py-2.5">
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" className="ml-3 font-medium text-text">
              {message}
            </AppText>
          </View>
        </Animated.View>

        {/* Footer: Version and status */}
        <View className="items-center pb-2">
          <AppText variant="caption" className="text-[11px] font-mono text-text-secondary">
            v{APP_VERSION}
          </AppText>
          <AppText variant="caption" className="mt-0.5 text-[10px] text-text-secondary/70">
            Enterprise POS System
          </AppText>
        </View>
      </View>
    </ScreenTemplate>
  );
};
