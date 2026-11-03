import React from 'react';
import { Text, type TextProps } from 'react-native';

export type AppTextVariant = 'display' | 'title' | 'body' | 'label' | 'caption';

const variantClasses: Record<AppTextVariant, string> = {
  display: 'text-3xl font-bold tracking-tight',
  title: 'text-xl font-semibold tracking-tight',
  body: 'text-base leading-6',
  label: 'text-sm font-medium',
  caption: 'text-xs leading-4',
};

const CUSTOM_TEXT_COLOR_PATTERN =
  /\btext-(primary|secondary|tertiary|background|surface|border|on-primary|on-secondary|content|text-primary|text-secondary|error|success)\b/;

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  className?: string;
};

/**
 * HORECA Brand typography primitive powered by NativeWind.
 * Automatically adapts between light and dark themes using theme CSS variables.
 */
export function AppText({
  variant = 'body',
  className = '',
  accessibilityRole,
  ...rest
}: AppTextProps) {
  const isHeading = variant === 'display' || variant === 'title';
  const defaultColorClass = CUSTOM_TEXT_COLOR_PATTERN.test(className)
    ? ''
    : 'text-text';

  return (
    <Text
      accessibilityRole={accessibilityRole ?? (isHeading ? 'header' : 'text')}
      className={`${defaultColorClass} ${variantClasses[variant]} ${className}`.trim()}
      {...rest}
    />
  );
}
