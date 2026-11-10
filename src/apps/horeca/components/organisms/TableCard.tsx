import React from 'react';
import { Pressable, View } from 'react-native';
import {
  CheckCircleIcon,
  PlusIcon,
  UserGroupIcon,
} from 'react-native-heroicons/outline';
import type { Table } from '../../api/schemas';
import { AppText } from '../atoms/AppText';

const LIGHT_TEXT = '#FFFFFF';

/** Dark saturated card tones per table status (readable in both light and dark themes). */
export const TABLE_STATUS_TONES: Record<
  string,
  { background: string; border: string; accent: string; muted: string }
> = {
  available: {
    background: '#166534',
    border: '#15803D',
    accent: '#DCFCE7',
    muted: '#BBF7D0',
  },
  occupied: {
    background: '#7F1D1D',
    border: '#B91C1C',
    accent: '#FEE2E2',
    muted: '#FECACA',
  },
  reserved: {
    background: '#92400E',
    border: '#D97706',
    accent: '#FEF3C7',
    muted: '#FDE68A',
  },
  dirty: {
    background: '#374151',
    border: '#6B7280',
    accent: '#F3F4F6',
    muted: '#D1D5DB',
  },
};

export interface TableCardProps {
  table: Table;
  isSelected?: boolean;
  onPress: (table: Table) => void;
  currentTabAmount?: string;
  className?: string;
}

/**
 * Organism representing an individual dining table card on the floor plan.
 * Memoized to avoid full floor plan re-renders on selection or status change.
 */
export const TableCard = React.memo<TableCardProps>(
  ({
    table,
    isSelected = false,
    onPress,
    currentTabAmount,
    className = '',
  }) => {
    const cardTone = TABLE_STATUS_TONES[table.status] ?? TABLE_STATUS_TONES.available;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Table ${table.table_number}, ${table.status}`}
        onPress={() => onPress(table)}
        style={{ backgroundColor: cardTone.background, borderColor: cardTone.border }}
        className={`flex-1 m-1.5 p-3.5 rounded-horeca border shadow-sm active:opacity-80 ${isSelected ? 'border-2' : ''} ${className}`.trim()}
      >
        {/* Top Card Row */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <AppText variant="title" style={{ color: LIGHT_TEXT }} className="text-xl font-bold mr-1.5">
              {table.table_number}
            </AppText>
            {isSelected ? (
              <CheckCircleIcon color={LIGHT_TEXT} size={16} />
            ) : null}
          </View>

          {currentTabAmount ? (
            <View>
              <AppText variant="caption" style={{ color: cardTone.muted }} className="text-[10px] uppercase font-semibold">
                Tab
              </AppText>
              <AppText variant="label" style={{ color: LIGHT_TEXT }} className="font-bold text-xs">
                {currentTabAmount}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Section & Guests */}
        <View className="flex-row items-center mb-3">
          <UserGroupIcon color={cardTone.muted} size={14} />
          <AppText variant="caption" style={{ color: cardTone.muted }} className="ml-1 font-medium">
            {table.capacity} Guests • {table.section || 'General'}
          </AppText>
        </View>

        {/* Current Tab / Available Action */}
        <View
          style={{ borderTopColor: 'rgba(255, 255, 255, 0.22)' }}
          className="pt-2 border-t flex-row items-center justify-between"
        >
          <View className="flex-row items-center justify-between w-full">
            <AppText variant="caption" style={{ color: cardTone.accent }} className="font-semibold capitalize">
              {table.status}
            </AppText>
            <View className="h-6 w-6 rounded-full bg-white/20 items-center justify-center">
              <PlusIcon color={LIGHT_TEXT} size={14} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  },
  (prev, next) => {
    return (
      prev.table.id === next.table.id &&
      prev.table.status === next.table.status &&
      prev.table.table_number === next.table.table_number &&
      prev.table.capacity === next.table.capacity &&
      prev.table.section === next.table.section &&
      prev.isSelected === next.isSelected &&
      prev.currentTabAmount === next.currentTabAmount &&
      prev.className === next.className
    );
  },
);
