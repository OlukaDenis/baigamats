import React from 'react';
import { View } from 'react-native';
import { ExclamationCircleIcon } from 'react-native-heroicons/outline';
import { useHorecaColors } from '../../theme/colors';
import { AppText } from '../atoms/AppText';
import { AppTextInput, type AppTextInputProps } from '../atoms/AppTextInput';

export type FormFieldProps = AppTextInputProps & {
  label: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
};

export function FormField({
  label,
  error,
  helperText,
  containerClassName = 'mb-4',
  accessibilityLabel,
  accessibilityHint,
  ...inputProps
}: FormFieldProps) {
  const colors = useHorecaColors();

  return (
    <View className={containerClassName}>
      <AppText variant="label" className="mb-1.5 text-text">
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
          className="mt-2 flex-row items-center rounded-horeca bg-error/10 border border-error/20 px-3 py-2"
        >
          <ExclamationCircleIcon
            color={colors.error}
            size={18}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <AppText variant="caption" className="ml-2 flex-1 text-error font-medium">
            {error}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="caption" className="mt-1.5 text-text-secondary">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}
