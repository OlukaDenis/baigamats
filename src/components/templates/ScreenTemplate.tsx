import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ScreenTemplateProps = {
  children: ReactNode;
  /** Set to false for screens that manage their own virtualized list. */
  scrollable?: boolean;
};

/** Base screen layout: brand background, safe-area padding and consistent gutters. */
export function ScreenTemplate({ children, scrollable = true }: ScreenTemplateProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + 16,
    paddingBottom: insets.bottom + 16,
    paddingLeft: insets.left + 20,
    paddingRight: insets.right + 20,
  };

  if (!scrollable) {
    return (
      <View className="flex-1 bg-background" style={padding}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={padding}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
