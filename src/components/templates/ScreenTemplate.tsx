import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ScreenTemplateProps = {
  children: ReactNode;
  /** Set to false for screens that manage their own virtualized list. */
  scrollable?: boolean;
};

/** Base screen layout: brand background, safe-area padding, keyboard avoidance, and consistent gutters. */
export function ScreenTemplate({ children, scrollable = true }: ScreenTemplateProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + 16,
    paddingBottom: insets.bottom + 24,
    paddingLeft: insets.left + 20,
    paddingRight: insets.right + 20,
  };

  if (!scrollable) {
    return (
      <View className="flex-1 bg-background" style={padding}>
        <View className="w-full max-w-lg flex-1 self-center">{children}</View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={padding}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-lg self-center">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
