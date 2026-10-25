import { useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { EyeIcon, EyeSlashIcon } from 'react-native-heroicons/outline';

import { useTheme } from '../../theme/ThemeProvider';

export type AppTextInputProps = TextInputProps & {
  hasError?: boolean;
  isPassword?: boolean;
  className?: string;
};

export function AppTextInput({
  hasError = false,
  isPassword = false,
  secureTextEntry,
  className = '',
  ...rest
}: AppTextInputProps) {
  const { colors } = useTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const shouldMask = isPassword ? !passwordVisible : secureTextEntry;
  const borderClass = hasError ? 'border-secondary' : 'border-primary/30';

  return (
    <View
      className={`min-h-12 flex-row items-center rounded-xl border-2 bg-surface px-4 ${borderClass} ${className}`}
    >
      <TextInput
        placeholderTextColor={colors.primary}
        secureTextEntry={shouldMask}
        className="min-h-12 flex-1 py-2 text-base text-content"
        {...rest}
      />
      {isPassword ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          onPress={() => setPasswordVisible(prev => !prev)}
          className="ml-2 min-h-11 min-w-11 items-center justify-center"
          hitSlop={8}
        >
          {passwordVisible ? (
            <EyeSlashIcon
              color={colors.primary}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : (
            <EyeIcon
              color={colors.primary}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
