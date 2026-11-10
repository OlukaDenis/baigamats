import React from 'react';
import { View, type ViewProps } from 'react-native';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from 'react-native-heroicons/outline';
import { useHorecaColors } from '../../theme/colors';
import { AppText } from '../atoms/AppText';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

export type AlertBannerProps = ViewProps & {
  severity?: AlertSeverity;
  title?: string;
  message: string;
  className?: string;
};

const containerSeverityClasses: Record<AlertSeverity, string> = {
  info: 'bg-primary/10 border-primary/25',
  warning: 'bg-status-reserved/10 border-status-reserved/25',
  error: 'bg-error/10 border-error/25',
  success: 'bg-status-available/10 border-status-available/25',
};

const titleSeverityClasses: Record<AlertSeverity, string> = {
  info: 'text-primary',
  warning: 'text-status-reserved',
  error: 'text-error',
  success: 'text-status-available',
};

export function AlertBanner({
  severity = 'info',
  title,
  message,
  className = '',
  ...rest
}: AlertBannerProps) {
  const colors = useHorecaColors();

  const iconConfig = {
    info: { Icon: InformationCircleIcon, color: colors.primary },
    warning: { Icon: ExclamationTriangleIcon, color: colors.statusReserved },
    error: { Icon: ExclamationCircleIcon, color: colors.error },
    success: { Icon: CheckCircleIcon, color: colors.statusAvailable },
  }[severity];

  const IconComponent = iconConfig.Icon;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={`flex-row items-start rounded-horeca border p-3.5 ${
        containerSeverityClasses[severity]
      } ${className}`.trim()}
      {...rest}
    >
      <View className="mr-3 pt-0.5">
        <IconComponent
          color={iconConfig.color}
          size={20}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <View className="flex-1">
        {title ? (
          <AppText
            variant="label"
            className={`font-semibold ${titleSeverityClasses[severity]} mb-0.5`}
          >
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" className="text-text leading-5">
          {message}
        </AppText>
      </View>
    </View>
  );
}
