import React from 'react';
import { View, type ViewProps } from 'react-native';
import { AppText } from './AppText';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'dirty';

const badgeContainerClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface border border-border',
  primary: 'bg-primary/15 border border-primary/30',
  secondary: 'bg-secondary/15 border border-secondary/30',
  success: 'bg-status-available/15 border border-status-available/30',
  warning: 'bg-status-reserved/15 border border-status-reserved/30',
  danger: 'bg-error/15 border border-error/30',
  info: 'bg-primaryContainer/20 border border-primaryContainer/40',
  neutral: 'bg-surfaceContainerHigh border border-border',
  available: 'bg-status-available/15 border border-status-available/30',
  occupied: 'bg-status-occupied/15 border border-status-occupied/30',
  reserved: 'bg-status-reserved/15 border border-status-reserved/30',
  dirty: 'bg-status-dirty/15 border border-status-dirty/30',
};

const badgeTextClasses: Record<BadgeVariant, string> = {
  default: 'text-text',
  primary: 'text-primary font-semibold',
  secondary: 'text-text-secondary font-medium',
  success: 'text-status-available font-semibold',
  warning: 'text-status-reserved font-semibold',
  danger: 'text-error font-semibold',
  info: 'text-primary font-medium',
  neutral: 'text-text-secondary font-medium',
  available: 'text-status-available font-semibold',
  occupied: 'text-status-occupied font-semibold',
  reserved: 'text-status-reserved font-semibold',
  dirty: 'text-status-dirty font-semibold',
};

export type BadgeProps = ViewProps & {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  labelClassName?: string;
};

export function Badge({
  label,
  variant = 'default',
  size = 'md',
  className = '',
  labelClassName = '',
  ...rest
}: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 rounded-horeca' : 'px-2.5 py-1 rounded-horeca';
  const textSizeClass = size === 'sm' ? 'text-xs' : 'text-xs';

  return (
    <View
      className={`flex-row items-center justify-center self-start ${sizeClasses} ${badgeContainerClasses[variant]} ${className}`.trim()}
      {...rest}
    >
      <AppText
        className={`${badgeTextClasses[variant]} ${textSizeClass} ${labelClassName}`.trim()}
      >
        {label}
      </AppText>
    </View>
  );
}
