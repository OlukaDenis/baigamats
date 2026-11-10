import React, { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { EyeIcon, EyeSlashIcon } from 'react-native-heroicons/outline';
import { useHorecaColors } from '../../theme/colors';
import { recordUserActivity } from '../../features/auth/utils/inactivityTracker';
import { buildControlStyleOverrides } from '../controlStyleOverrides';

export type AppTextInputInstance = ComponentRef<typeof TextInput>;

export type AppTextInputProps = TextInputProps & {
  ref?: Ref<AppTextInputInstance>;
  hasError?: boolean;
  isPassword?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  containerStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  height?: number;
};

export function AppTextInput({
  ref,
  hasError = false,
  isPassword = false,
  leftIcon,
  rightIcon,
  secureTextEntry,
  className = '',
  containerStyle,
  borderRadius,
  height,
  style,
  onFocus,
  onBlur,
  onChangeText,
  ...rest
}: AppTextInputProps) {
  const colors = useHorecaColors();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const shouldMask = isPassword ? !passwordVisible : secureTextEntry;
  const borderClass = hasError
    ? 'border-error'
    : isFocused
      ? 'border-primary'
      : 'border-border';

  const overrideStyle = buildControlStyleOverrides({ borderRadius, height });

  return (
    <View
      style={[containerStyle, overrideStyle]}
      className={`min-h-[58px] flex-row items-center rounded-horeca border bg-input px-4 ${borderClass} ${className}`.trim()}
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
        placeholderTextColor={colors.onSurfaceVariant}
        cursorColor={colors.primary}
        selectionColor={`${colors.primary}44`}
        secureTextEntry={shouldMask}
        onFocus={event => {
          recordUserActivity();
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={event => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onChangeText={text => {
          recordUserActivity();
          onChangeText?.(text);
        }}
        style={[
          { color: colors.onSurface },
          height !== undefined ? { minHeight: height } : undefined,
          style,
        ]}
        className="min-h-[58px] flex-1 py-2.5 text-base text-text"
        {...rest}
      />
      {rightIcon ? (
        <View className="ml-2 items-center justify-center">{rightIcon}</View>
      ) : null}
      {isPassword ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          onPress={() => setPasswordVisible(prev => !prev)}
          className="ml-2 min-h-10 min-w-10 items-center justify-center rounded-horeca active:opacity-70"
          hitSlop={8}
        >
          {passwordVisible ? (
            <EyeSlashIcon
              color={colors.onSurfaceVariant}
              size={20}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : (
            <EyeIcon
              color={colors.onSurfaceVariant}
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
