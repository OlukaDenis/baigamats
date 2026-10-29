import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { EyeIcon, EyeSlashIcon } from 'react-native-heroicons/outline';

import { useTheme } from '../../theme/ThemeProvider';

export type AppTextInputInstance = ComponentRef<typeof TextInput>;

export type AppTextInputProps = TextInputProps & {
  ref?: Ref<AppTextInputInstance>;
  hasError?: boolean;
  isPassword?: boolean;
  leftIcon?: ReactNode;
  className?: string;
};

export function AppTextInput({
  ref,
  hasError = false,
  isPassword = false,
  leftIcon,
  secureTextEntry,
  className = '',
  style,
  onFocus,
  onBlur,
  ...rest
}: AppTextInputProps) {
  const { colors } = useTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const shouldMask = isPassword ? !passwordVisible : secureTextEntry;
  const borderClass = hasError
    ? 'border-secondary'
    : isFocused
      ? 'border-primary'
      : 'border-border';

  return (
    <View
      className={`min-h-12 flex-row items-center rounded-xl border bg-background px-4 ${borderClass} ${className}`.trim()}
    >
      {leftIcon ? (
        <View
          className="mr-3 items-center justify-center"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {leftIcon}
        </View>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textSecondary}
        cursorColor={colors.primary}
        selectionColor={`${colors.secondary}44`}
        secureTextEntry={shouldMask}
        onFocus={event => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={event => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        style={[{ color: colors.textPrimary }, style]}
        className="min-h-12 flex-1 py-2.5 text-base text-text-primary"
        {...rest}
      />
      {isPassword ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          onPress={() => setPasswordVisible(prev => !prev)}
          className="ml-2 min-h-11 min-w-11 items-center justify-center rounded-lg active:opacity-70"
          hitSlop={8}
        >
          {passwordVisible ? (
            <EyeSlashIcon
              color={colors.textSecondary}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : (
            <EyeIcon
              color={colors.textSecondary}
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
