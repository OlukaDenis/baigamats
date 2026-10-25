import { View } from 'react-native';

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
  ...inputProps
}: FormFieldProps) {
  return (
    <View className="mb-4">
      <AppText variant="label" className="mb-1.5">
        {label}
      </AppText>
      <AppTextInput
        accessibilityLabel={accessibilityLabel ?? label}
        hasError={Boolean(error)}
        {...inputProps}
      />
      {error ? (
        <View
          accessibilityRole="alert"
          className="mt-1.5 rounded-lg bg-secondary px-3 py-1.5"
        >
          <AppText variant="label" className="text-on-secondary">
            {error}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText className="mt-1 text-sm opacity-80">{helperText}</AppText>
      ) : null}
    </View>
  );
}
