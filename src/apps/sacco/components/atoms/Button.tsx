import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { useTheme } from '@sacco/theme/ThemeProvider';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

const containerClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'border border-border bg-surface',
};

// Secondary (Gold) always pairs with on-secondary: Navy on Gold 5.6:1 per Brand Guide.
const labelClasses: Record<ButtonVariant, string> = {
  primary: 'text-on-primary',
  secondary: 'text-on-secondary',
  outline: 'text-primary',
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className = '',
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const indicatorColor = {
    primary: colors.onPrimary,
    secondary: colors.onSecondary,
    outline: colors.primary,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`min-h-12 flex-row items-center justify-center rounded-xl px-5 active:opacity-80 ${
        containerClasses[variant]
      } ${isDisabled ? 'opacity-50' : ''} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <View className="flex-row items-center justify-center">
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
            variant="label"
            className={`text-base font-semibold ${labelClasses[variant]}`}
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
        </View>
      )}
    </Pressable>
  );
}
