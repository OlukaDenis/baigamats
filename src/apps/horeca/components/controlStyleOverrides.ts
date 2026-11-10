import type { ViewStyle } from 'react-native';

export interface ControlDimensionOverrides {
  borderRadius?: number;
  height?: number;
}

/**
 * Builds an immutable ViewStyle object for explicit `borderRadius` and `height`
 * overrides so prop-level overrides take precedence over default and className styles.
 */
export function buildControlStyleOverrides({
  borderRadius,
  height,
}: ControlDimensionOverrides): ViewStyle | undefined {
  if (borderRadius === undefined && height === undefined) {
    return undefined;
  }

  return {
    ...(borderRadius !== undefined ? { borderRadius } : null),
    ...(height !== undefined ? { minHeight: height, height } : null),
  };
}
