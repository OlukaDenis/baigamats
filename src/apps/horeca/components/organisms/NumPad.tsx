import React from 'react';
import { Pressable, View } from 'react-native';
import { BackspaceIcon } from 'react-native-heroicons/outline';
import { useHorecaColors } from '../../theme/colors';
import { AppText } from '../atoms/AppText';

export interface NumPadProps {
  onDigitPress: (digit: string) => void;
  onClearPress: () => void;
  onBackspacePress: () => void;
  disableClear?: boolean;
  className?: string;
}

const PAD_LAYOUT = [
  { digit: '1', sub: '' },
  { digit: '2', sub: '' },
  { digit: '3', sub: '' },
  { digit: '4', sub: '' },
  { digit: '5', sub: '' },
  { digit: '6', sub: '' },
  { digit: '7', sub: '' },
  { digit: '8', sub: '' },
  { digit: '9', sub: '' },
];

/**
 * HORECA POS NumPad Organism.
 * 3x4 layout styled cleanly with NativeWind for PIN entry, quantity, and cash input.
 */
export function NumPad({
  onDigitPress,
  onClearPress,
  onBackspacePress,
  disableClear = false,
  className = '',
}: NumPadProps) {
  const colors = useHorecaColors();

  return (
    <View className={`w-full max-w-sm self-center px-4 ${className}`.trim()}>
      <View className="flex-row flex-wrap justify-between">
        {PAD_LAYOUT.map(item => (
          <Pressable
            key={item.digit}
            accessibilityLabel={`Digit ${item.digit}`}
            accessibilityRole="button"
            onPress={() => onDigitPress(item.digit)}
            className="w-[30%] mb-3 h-16 items-center justify-center rounded-2xl bg-surface border border-border shadow-sm active:bg-primary/10 active:border-primary"
          >
            <AppText className="text-2xl font-bold text-text">
              {item.digit}
            </AppText>
            {item.sub ? (
              <AppText variant="caption" className="text-[10px] text-text-secondary tracking-widest font-semibold">
                {item.sub}
              </AppText>
            ) : null}
          </Pressable>
        ))}

        {/* Bottom row: CLR, 0, Backspace */}
        <Pressable
          accessibilityLabel="Clear input"
          accessibilityRole="button"
          onPress={onClearPress}
          disabled={disableClear}
          className={`w-[30%] h-16 items-center justify-center rounded-2xl bg-surface border border-border shadow-sm active:bg-error/10 active:border-error ${disableClear ? 'opacity-30' : ''
            }`}
        >
          <AppText className="text-base font-bold text-error">
            CLR
          </AppText>
        </Pressable>

        <Pressable
          accessibilityLabel="Digit 0"
          accessibilityRole="button"
          onPress={() => onDigitPress('0')}
          className="w-[30%] h-16 items-center justify-center rounded-2xl bg-surface border border-border shadow-sm active:bg-primary/10 active:border-primary"
        >
          <AppText className="text-2xl font-bold text-text">
            0
          </AppText>
        </Pressable>

        <Pressable
          accessibilityLabel="Backspace"
          accessibilityRole="button"
          onPress={onBackspacePress}
          className="w-[30%] h-16 items-center justify-center rounded-2xl bg-surface border border-border shadow-sm active:bg-primary/10 active:border-primary"
        >
          <BackspaceIcon
            color={colors.onSurface}
            size={24}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      </View>
    </View>
  );
}
