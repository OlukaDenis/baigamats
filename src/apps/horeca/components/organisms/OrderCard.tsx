import React from 'react';
import { Pressable, View } from 'react-native';
import {
  ChevronRightIcon,
  ShoppingBagIcon,
  TrashIcon,
  UserGroupIcon,
} from 'react-native-heroicons/outline';
import type { Order, Table } from '../../api/schemas';
import { useHorecaColors } from '../../theme/colors';
import { AppText } from '../atoms/AppText';
import { Badge } from '../atoms/Badge';

export interface OrderCardProps {
  order: Order;
  table?: Table | null;
  onPress: (order: Order) => void;
  onCancel?: (order: Order) => void;
  className?: string;
}

/**
 * Organism representing an order card in the orders list.
 * Displays order number, table/tab details, offline indicator, billed status, cancel action, item count, party size, and total amount.
 */
export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  table,
  onPress,
  onCancel,
  className = '',
}) => {
  const colors = useHorecaColors();

  const itemsCount = (order.items ?? []).reduce((sum, it) => sum + it.qty, 0);
  const amount =
    order.total_amount > 0
      ? order.total_amount
      : (order.items ?? []).reduce((sum, it) => sum + it.unit_price * it.qty, 0);

  const isBilled = order.status === 'billed';
  const isOffline = order.id.startsWith('temp-ord-');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.order_number}, ${itemsCount} items, status ${order.status}`}
      onPress={() => onPress(order)}
      className={`mb-3 p-4 rounded-xl bg-surface border border-border shadow-sm active:opacity-80 ${className}`.trim()}
    >
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className={`h-10 w-10 rounded-2xl items-center justify-center mr-3 border ${isBilled
              ? 'bg-status-available/10 border-status-available/30'
              : 'bg-primary/10 border-primary/20'
              }`}
          >
            <AppText
              variant="label"
              className={`font-extrabold text-sm ${isBilled ? 'text-status-available' : 'text-primary'
                }`}
            >
              {table ? `${table.table_number}` : 'ORD'}
            </AppText>
          </View>

          <View className="flex-1">
            <View className="flex-row items-center">
              <AppText variant="label" className="font-bold text-text text-base mr-2">
                {order.order_number}
              </AppText>
              {isOffline ? (
                <Badge label="OFFLINE" variant="warning" size="sm" />
              ) : null}
            </View>
            <AppText variant="caption" className="text-text-secondary text-[11px] mt-0.5">
              {table
                ? `Table ${table.table_number} • ${table.section ?? 'Main Dining'}`
                : order.tab_name
                  ? `Tab: ${order.tab_name}`
                  : 'Takeaway Customer'}
            </AppText>
          </View>
        </View>

        {/* Status Badge & Actions */}
        <View className="flex-row items-center">
          <Badge
            label={isBilled ? 'BILLED (PAID)' : 'OPEN'}
            variant={isBilled ? 'available' : 'primary'}
            size="sm"
          />

          {!isBilled && onCancel ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel Order ${order.order_number}`}
              onPress={() => onCancel(order)}
              className="h-8 w-8 ml-2 rounded-xl bg-error/10 border border-error/20 items-center justify-center active:opacity-70"
              hitSlop={6}
            >
              <TrashIcon color={colors.error} size={15} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Footer row: Total items count and Total Amount */}
      <View className="flex-row items-center justify-between pt-2.5 mt-1 border-t border-border/40">
        <View className="flex-row items-center space-x-3">
          <View className="flex-row items-center mr-3">
            <ShoppingBagIcon color={colors.primary} size={15} />
            <AppText variant="caption" className="text-text font-bold text-xs ml-1.5">
              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
            </AppText>
          </View>

          {order.party_size ? (
            <View className="flex-row items-center">
              <UserGroupIcon color={colors.onSurfaceVariant} size={14} />
              <AppText variant="caption" className="text-text-secondary text-xs font-semibold ml-1">
                {order.party_size} guests
              </AppText>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center">
          <AppText variant="title" className="text-primary font-extrabold text-base mr-2">
            UGX {amount.toLocaleString()}
          </AppText>
          <ChevronRightIcon color={colors.onSurfaceVariant} size={18} />
        </View>
      </View>
    </Pressable>
  );
};
