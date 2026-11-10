import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { useHorecaColors } from '../../theme/colors';
import { buildControlStyleOverrides } from '../controlStyleOverrides';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const containerClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:opacity-90',
  secondary: 'bg-surface border border-border active:bg-surface/80',
  outline: 'border border-primary bg-transparent active:bg-primary/10',
  ghost: 'bg-transparent active:bg-surface/60',
  danger: 'bg-error active:opacity-90',
  success: 'bg-status-available active:opacity-90',
};

const labelClasses: Record<ButtonVariant, string> = {
  primary: 'text-on-primary font-semibold',
  secondary: 'text-text font-medium',
  outline: 'text-primary font-semibold',
  ghost: 'text-primary font-medium',
  danger: 'text-on-primary font-semibold',
  success: 'text-on-primary font-semibold',
};

const sizeClasses: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'min-h-9 px-3 py-1.5 rounded-horeca', text: 'text-sm' },
  md: { container: 'min-h-[58px] px-5 py-3 rounded-horeca', text: 'text-base' },
  lg: { container: 'min-h-[58px] px-6 py-4 rounded-horeca', text: 'text-lg font-semibold' },
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  labelClassName?: string;
  borderRadius?: number;
  height?: number;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className = '',
  labelClassName = '',
  borderRadius,
  height,
  style,
  ...rest
}: ButtonProps) {
  const colors = useHorecaColors();
  const isDisabled = disabled || loading;

  const indicatorColor = {
    primary: colors.onPrimary,
    secondary: colors.onSurface,
    outline: colors.primary,
    ghost: colors.primary,
    danger: colors.onError,
    success: colors.onPrimary,
  }[variant];

  const sizeStyle = sizeClasses[size];
  const overrideStyle = buildControlStyleOverrides({ borderRadius, height });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={state => [
        typeof style === 'function' ? style(state) : style,
        overrideStyle,
      ]}
      className={`flex-row items-center justify-center ${sizeStyle.container} ${
        containerClasses[variant]
      } ${isDisabled ? 'opacity-50' : ''} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <>
          {leftIcon ? (
            <View
              className="mr-2 items-center justify-center"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {leftIcon}
            </View>
          ) : null}
          <AppText
            className={`${labelClasses[variant]} ${sizeStyle.text} ${labelClassName}`.trim()}
          >
            {label}
          </AppText>
          {rightIcon ? (
            <View
              className="ml-2 items-center justify-center"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {rightIcon}
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
