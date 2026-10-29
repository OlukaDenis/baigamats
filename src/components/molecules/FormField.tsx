import { View } from 'react-native';
import { ExclamationCircleIcon } from 'react-native-heroicons/outline';

import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../atoms/AppText';
import { AppTextInput, type AppTextInputProps } from '../atoms/AppTextInput';

export type FormFieldProps = AppTextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
};

export function FormField({
  label,
  error,
  helperText,
  accessibilityLabel,
  accessibilityHint,
  ...inputProps
}: FormFieldProps) {
  const { colors } = useTheme();

  return (
    <View className="mb-4">
      <AppText variant="label" className="mb-1.5">
        {label}
      </AppText>
      <AppTextInput
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint ?? error ?? helperText}
        hasError={Boolean(error)}
        {...inputProps}
      />
      {error ? (
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          className="mt-2 flex-row items-center rounded-lg bg-secondary px-3 py-2"
        >
          <ExclamationCircleIcon
            color={colors.onSecondary}
            size={18}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <AppText variant="label" className="ml-2 flex-1 text-on-secondary">
            {error}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText className="mt-1.5 text-sm text-text-secondary">{helperText}</AppText>
      ) : null}
    </View>
  );
}
