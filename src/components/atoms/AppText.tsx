import { Text, type TextProps } from 'react-native';

export type AppTextVariant = 'display' | 'title' | 'body' | 'label';

const variantClasses: Record<AppTextVariant, string> = {
  display: 'text-3xl font-bold',
  title: 'text-xl font-semibold',
  body: 'text-base',
  label: 'text-sm font-medium',
};

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  className?: string;
};

/** Brand-coloured text primitive. Respects system font scaling by default. */
export function AppText({
  variant = 'body',
  className = '',
  accessibilityRole,
  ...rest
}: AppTextProps) {
  const isHeading = variant === 'display' || variant === 'title';
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (isHeading ? 'header' : 'text')}
      className={`text-content ${variantClasses[variant]} ${className}`}
      {...rest}
    />
  );
}
