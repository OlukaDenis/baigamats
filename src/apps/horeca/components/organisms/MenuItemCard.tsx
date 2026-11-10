import React from 'react';
import { Pressable, View } from 'react-native';
import { MinusIcon, PlusIcon } from 'react-native-heroicons/outline';
import type { MenuItem } from '../../api/schemas';
import { useHorecaColors } from '../../theme/colors';
import { formatUGX } from '../../utils/currency';
import { AppText } from '../atoms/AppText';
import { Badge } from '../atoms/Badge';

export interface MenuItemCardProps {
  item: MenuItem;
  quantity?: number;
  disabled?: boolean;
  onAdd: (item: MenuItem) => void;
  onRemove?: (item: MenuItem) => void;
  className?: string;
}

/**
 * Organism representing a menu item card with quantity stepper and add controls.
 * Memoized to prevent entire list re-renders when a single item's quantity changes.
 */
export const MenuItemCard = React.memo<MenuItemCardProps>(
  ({
    item,
    quantity = 0,
    disabled = false,
    onAdd,
    onRemove,
    className = '',
  }) => {
    const colors = useHorecaColors();

    const isAvailable = item.is_active !== false;
    const canAdd = isAvailable && !disabled;

    return (
      <View
        className={`flex-row items-center p-3.5 mb-2.5 rounded-horeca border ${
          quantity > 0 ? 'bg-primary/5 border-primary/40' : 'bg-surface border-border'
        } ${!canAdd ? 'opacity-50' : ''} ${className}`.trim()}
      >
        {/* Icon / Emoji badge */}
        <View className="h-12 w-12 rounded-horeca bg-background border border-border items-center justify-center mr-3.5">
          <AppText className="text-xl">{item.station === 'bar' ? '🍸' : '🍲'}</AppText>
        </View>

        {/* Details */}
        <View className="flex-1 mr-2">
          <View className="flex-row items-center flex-wrap">
            <AppText variant="label" className="font-bold text-text mr-2" numberOfLines={1}>
              {item.name}
            </AppText>
            {item.age_restricted ? (
              <Badge label="18+" variant="reserved" size="sm" className="mr-1.5" />
            ) : null}
            {!isAvailable ? (
              <Badge label="UNAVAILABLE" variant="neutral" size="sm" />
            ) : null}
          </View>
          <AppText variant="caption" className="text-text-secondary">
            {item.station === 'bar' ? 'Bar' : 'Kitchen'}
          </AppText>
          <AppText variant="label" className="text-primary font-bold mt-1">
            UGX {formatUGX(item.price)}
          </AppText>
        </View>

        {/* Quantity Stepper or Add button */}
        {quantity > 0 ? (
          <View className="flex-row items-center bg-background border border-border rounded-horeca p-0.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Decrease ${item.name}`}
              disabled={disabled || !onRemove}
              onPress={() => onRemove?.(item)}
              className="h-9 w-9 items-center justify-center rounded-horeca bg-surface active:bg-primary/10"
            >
              <MinusIcon color={colors.onSurface} size={16} />
            </Pressable>
            <AppText className="w-8 text-center font-bold text-sm text-text">{quantity}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Increase ${item.name}`}
              disabled={!canAdd}
              onPress={() => onAdd(item)}
              className="h-9 w-9 items-center justify-center rounded-horeca bg-primary active:opacity-80"
            >
              <PlusIcon color={colors.onPrimary} size={16} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name}`}
            disabled={!canAdd}
            onPress={() => onAdd(item)}
            className="h-10 w-10 rounded-horeca bg-primary items-center justify-center active:opacity-80"
          >
            <PlusIcon color={colors.onPrimary} size={20} />
          </Pressable>
        )}
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.price === next.item.price &&
      prev.item.is_active === next.item.is_active &&
      prev.quantity === next.quantity &&
      prev.disabled === next.disabled &&
      prev.className === next.className
    );
  },
);
