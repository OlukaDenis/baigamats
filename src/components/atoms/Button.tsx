import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

const containerClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'border-2 border-primary bg-transparent',
};

// Secondary (orange) always pairs with on-secondary: never white/light text on orange.
const labelClasses: Record<ButtonVariant, string> = {
  primary: 'text-on-primary',
  secondary: 'text-on-secondary',
  outline: 'text-primary',
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  className?: string;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
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
      } ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <AppText variant="label" className={`text-base ${labelClasses[variant]}`}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}
