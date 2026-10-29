import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ScreenEdge = 'top' | 'bottom' | 'left' | 'right';

export type ScreenTemplateProps = {
  children: ReactNode;
  /** Set to false for screens that manage their own virtualized list (e.g. FlatList). Default true. */
  scrollable?: boolean;
  /** Fixed header component (e.g. AppBar or HomeAppBar). Rendered outside the scrollable body. */
  header?: ReactNode;
  /** Fixed bottom component (e.g. action buttons). Rendered outside the scrollable body. */
  footer?: ReactNode;
  /** Pull-to-refresh control for scrollable screens. */
  refreshControl?: ReactElement;
  /** Which safe-area edges to pad. Defaults to ['top', 'bottom', 'left', 'right'], or without 'top' if header is provided. */
  edges?: ScreenEdge[];
  /** Optional class name for the outer container. */
  className?: string;
  /** Optional class name for the inner content container. */
  contentClassName?: string;
  /** Optional custom style for content container. */
  contentContainerStyle?: ViewStyle;
};

/**
 * Base screen layout wrapper:
 * - Edge-to-edge device safe-area insets management
 * - Fixed header (AppBar / HomeAppBar) and fixed bottom footer slots
 * - Keyboard avoidance on iOS
 * - Responsive max-width gutters
 */
export function ScreenTemplate({
  children,
  scrollable = true,
  header,
  footer,
  refreshControl,
  edges,
  className = '',
  contentClassName = '',
  contentContainerStyle,
}: ScreenTemplateProps) {
  const insets = useSafeAreaInsets();

  const effectiveEdges =
    edges ??
    (header
      ? ['bottom', 'left', 'right']
      : ['top', 'bottom', 'left', 'right']);

  const padTop = effectiveEdges.includes('top') ? insets.top + 16 : 16;
  const padBottom = footer
    ? 16
    : effectiveEdges.includes('bottom')
      ? insets.bottom + 24
      : 20;
  const padLeft = effectiveEdges.includes('left') ? insets.left + 20 : 20;
  const padRight = effectiveEdges.includes('right') ? insets.right + 20 : 20;

  const contentPadding = {
    paddingTop: padTop,
    paddingBottom: padBottom,
    paddingLeft: padLeft,
    paddingRight: padRight,
    ...contentContainerStyle,
  };

  const footerPadding = {
    paddingBottom: effectiveEdges.includes('bottom') ? insets.bottom + 12 : 12,
  };

  return (
    <View className={`flex-1 bg-background ${className}`}>
      {header}

      {scrollable ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-background"
        >
          <ScrollView
            className="flex-1 bg-background"
            contentContainerStyle={contentPadding}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            <View className={`w-full max-w-lg self-center ${contentClassName}`}>
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View className="flex-1 bg-background" style={contentPadding}>
          <View className={`w-full max-w-lg flex-1 self-center ${contentClassName}`}>
            {children}
          </View>
        </View>
      )}

      {footer ? (
        <View
          className="border-t border-border bg-surface px-5 pt-3 shadow-sm"
          style={footerPadding}
        >
          <View className="w-full max-w-lg self-center">{footer}</View>
        </View>
      ) : null}
    </View>
  );
}
