import React, { type ComponentRef, type ReactNode, type RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ScreenScrollViewInstance = ComponentRef<typeof ScrollView>;

export type ScreenTemplateProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  scrollViewRef?: RefObject<ScreenScrollViewInstance | null>;
  scrollViewProps?: ScrollViewProps;
  keyboardAvoidingBehavior?: KeyboardAvoidingViewProps['behavior'];
  containerProps?: ViewProps;
  withTopInset?: boolean;
  withBottomInset?: boolean;
  className?: string;
  contentContainerClassName?: string;
};

/**
 * Standard Screen Scaffolding Template for HORECA.
 * Fully styled via NativeWind with dark/light background tokens and safe area handling.
 */
export function ScreenTemplate({
  children,
  header,
  footer,
  scrollable = false,
  scrollViewRef,
  scrollViewProps,
  keyboardAvoidingBehavior,
  containerProps,
  withTopInset = false,
  withBottomInset = false,
  className = '',
  contentContainerClassName = '',
}: ScreenTemplateProps) {
  const insets = useSafeAreaInsets();
  const resolvedBehavior =
    keyboardAvoidingBehavior ?? (Platform.OS === 'ios' ? 'padding' : 'height');

  const content = scrollable ? (
    <ScrollView
      ref={scrollViewRef}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
      contentContainerStyle={[
        {
          flexGrow: 1,
          paddingBottom: withBottomInset ? insets.bottom + 16 : 16,
        },
        scrollViewProps?.contentContainerStyle,
      ]}
      className="flex-1"
    >
      <View className={`w-full flex-1 ${contentContainerClassName}`.trim()}>
        {children}
      </View>
    </ScrollView>
  ) : (
    <View
      style={{
        flex: 1,
        paddingBottom: withBottomInset ? insets.bottom : 0,
      }}
      className="flex-1"
    >
      <View className={`w-full flex-1 ${contentContainerClassName}`.trim()}>
        {children}
      </View>
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        paddingTop: withTopInset ? insets.top : 0,
      }}
      className={`flex-1 bg-background ${className}`.trim()}
      {...containerProps}
    >
      <KeyboardAvoidingView
        behavior={resolvedBehavior}
        className="flex-1"
      >
        {header}
        {content}
        {footer}
      </KeyboardAvoidingView>
    </View>
  );
}
