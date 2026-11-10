import React, { useMemo } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import {
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
} from 'react-native-heroicons/outline';
import { AppText } from '@horeca/components/atoms/AppText';
import { useHorecaColors } from '@horeca/theme/colors';
import { AirtelSvgLogo, MtnSvgLogo, TelecomBadge } from './TelecomLogos';

export type TelecomProvider = 'mtn' | 'airtel' | 'unknown';

export const MTN_PREFIXES = ['077', '078', '079', '076', '039'] as const;
export const AIRTEL_PREFIXES = ['070', '074', '073', '075', '072'] as const;

/**
 * Detects whether a phone number belongs to MTN or Airtel in Uganda.
 * Supports standard local format (07X...), international (+2567X...), or bare (7X...).
 */
export function detectTelecomProvider(rawPhone: string): TelecomProvider {
  if (!rawPhone) return 'unknown';

  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return 'unknown';

  let normalized = digits;
  if (normalized.startsWith('256')) {
    normalized = '0' + normalized.slice(3);
  } else if (!normalized.startsWith('0') && (normalized.startsWith('7') || normalized.startsWith('3'))) {
    normalized = '0' + normalized;
  }

  if (normalized.length >= 3) {
    const prefix = normalized.slice(0, 3);
    if ((MTN_PREFIXES as readonly string[]).includes(prefix)) {
      return 'mtn';
    }
    if ((AIRTEL_PREFIXES as readonly string[]).includes(prefix)) {
      return 'airtel';
    }
  }

  return 'unknown';
}

export interface MobileMoneyInputProps extends Omit<TextInputProps, 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string | null;
  onProviderChange?: (provider: TelecomProvider) => void;
  className?: string;
}

/**
 * Custom Mobile Money phone input with real-time ISP / telecom auto-detection.
 * Uses official MTN and Airtel SVG logos as the user types.
 */
export const MobileMoneyInput: React.FC<MobileMoneyInputProps> = ({
  value,
  onChangeText,
  label = 'Customer Mobile Number',
  error,
  onProviderChange,
  className = '',
  editable = true,
  ...inputProps
}) => {
  const colors = useHorecaColors();

  const provider = useMemo(() => {
    const detected = detectTelecomProvider(value);
    onProviderChange?.(detected);
    return detected;
  }, [value, onProviderChange]);

  const cleanDigits = value.replace(/\D/g, '');
  const hasMinDigits = cleanDigits.length >= 3;

  return (
    <View className={`w-full ${className}`.trim()}>
      {/* Label and Detected Carrier Status */}
      <View className="flex-row items-center justify-between mb-1.5">
        <AppText variant="caption" className="text-text-secondary font-semibold uppercase text-[11px]">
          {label}
        </AppText>
      </View>

      {/* Input Field Container */}
      <View
        className="flex-row items-center rounded-horeca bg-input border px-3.5 py-1.5 min-h-[58px]"
        style={{
          borderColor:
            error
              ? colors.error
              : provider === 'mtn'
                ? '#eab308'
                : provider === 'airtel'
                  ? '#ef4444'
                  : colors.outlineVariant,
        }}
      >
        {/* Country Flag & Code */}
        <View className="flex-row items-center mr-2.5 pr-2.5 border-r border-border">
          <AppText className="text-base mr-1">🇺🇬</AppText>
          <AppText variant="label" className="font-bold text-text text-sm">
            +256
          </AppText>
        </View>

        {/* Text Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          placeholder="7xx xxx xxx"
          placeholderTextColor={colors.onSurfaceVariant}
          editable={editable}
          style={{ color: colors.onSurface }}
          className="flex-1 text-base font-bold py-1.5"
          accessibilityLabel="Mobile Money phone number"
          {...inputProps}
        />

        {/* Dynamic Telecom Logo / Indicator */}
        <View className="ml-2">
          {provider === 'mtn' ? (
            <MtnSvgLogo />
          ) : provider === 'airtel' ? (
            <AirtelSvgLogo />
          ) : null}
        </View>
      </View>

      {/* Helper / Detection Hint */}
      <View className="mt-1.5 px-0.5">
        {error ? (
          <AppText variant="caption" className="text-error text-[11px] font-medium">
            {error}
          </AppText>
        ) : provider === 'mtn' ? (
          <AppText variant="caption" className="text-yellow-700 dark:text-yellow-400 text-[11px] font-medium">
            MTN MoMo •  STK Push prompt will be sent
          </AppText>
        ) : provider === 'airtel' ? (
          <AppText variant="caption" className="text-red-700 dark:text-red-400 text-[11px] font-medium">
            Airtel Money • STK Push prompt will be sent
          </AppText>
        ) : hasMinDigits ? (
          <View className="flex-row items-center">
            <ExclamationTriangleIcon color={colors.warning} size={12} />
            <AppText variant="caption" className="text-warning text-[11px] ml-1 font-medium">
              Unknown prefix. MTN: 077, 078, 079, 076, 039 • Airtel: 070, 074, 073, 075, 072
            </AppText>
          </View>
        ) : (
          <AppText variant="caption" className="text-text-secondary text-[11px]">
            Provide a valid mobile money number to continue
          </AppText>
        )}
      </View>
    </View>
  );
};
