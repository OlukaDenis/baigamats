import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { MagnifyingGlassIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { useHorecaColors } from '../../theme/colors';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  className = '',
}: SearchBarProps) {
  const colors = useHorecaColors();

  return (
    <View
      className={`min-h-11 flex-row items-center rounded-xl border border-border bg-surface px-3.5 ${className}`.trim()}
    >
      <MagnifyingGlassIcon
        color={colors.onSurfaceVariant}
        size={18}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        cursorColor={colors.primary}
        selectionColor={`${colors.primary}44`}
        style={{ color: colors.onSurface }}
        className="ml-2.5 flex-1 py-2 text-sm text-text"
        accessibilityLabel={placeholder}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search input"
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          className="p-1 active:opacity-60"
          hitSlop={8}
        >
          <XMarkIcon
            color={colors.onSurfaceVariant}
            size={16}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      ) : null}
    </View>
  );
}
