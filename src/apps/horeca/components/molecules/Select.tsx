import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { CheckIcon, ChevronDownIcon } from 'react-native-heroicons/outline';
import { useHorecaColors } from '../../theme/colors';
import { AppText } from '../atoms/AppText';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
  /** Optional secondary text shown on the right (e.g. a count). */
  hint?: string;
}

export interface SelectProps<T extends string = string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Select<T extends string = string>({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select...',
  className = '',
  disabled = false,
}: SelectProps<T>) {
  const colors = useHorecaColors();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}: ${selected?.label ?? 'none'}`}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className="min-h-11 flex-row items-center justify-between rounded-xl border border-border bg-surface px-3.5 active:opacity-70"
      >
        <AppText variant="label" className="text-sm font-semibold text-text flex-1" numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </AppText>
        <ChevronDownIcon color={colors.onSurfaceVariant} size={16} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close options"
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <View className="w-full max-h-[60%] rounded-2xl border border-border bg-surface overflow-hidden">
            {label ? (
              <AppText variant="label" className="px-4 pt-3 pb-2 text-xs font-bold text-text-secondary">
                {label}
              </AppText>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item }) => {
                const isActive = item.value === value;
                return (
                  <Pressable
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className="flex-row items-center justify-between px-4 py-3 active:bg-primary/10"
                  >
                    <AppText
                      variant="label"
                      className={`text-sm ${isActive ? 'text-primary font-bold' : 'text-text'}`}
                    >
                      {item.label}
                    </AppText>
                    <View className="flex-row items-center">
                      {item.hint ? (
                        <AppText variant="caption" className="text-text-secondary text-xs mr-2">
                          {item.hint}
                        </AppText>
                      ) : null}
                      {isActive ? <CheckIcon color={colors.primary} size={16} /> : null}
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
