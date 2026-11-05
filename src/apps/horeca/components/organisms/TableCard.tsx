import React from 'react';
import { Pressable, View } from 'react-native';
import {
  CheckCircleIcon,
  PlusIcon,
  UserGroupIcon,
} from 'react-native-heroicons/outline';
import type { Table } from '../../api/schemas';
import { useHorecaColors } from '../../theme/colors';
import { AppText } from '../atoms/AppText';

const DARK_TEXT = '#1F2937';
const MUTED_TEXT = '#4B5563';

/** Solid light card tones per table status (readable in both light and dark themes). */
const STATUS_TONES: Record<string, { background: string; border: string; accent: string }> = {
  available: { background: '#DCFCE7', border: '#86EFAC', accent: '#15803D' },
  occupied: { background: '#FEE2E2', border: '#FCA5A5', accent: '#B91C1C' },
  reserved: { background: '#FEF3C7', border: '#FCD34D', accent: '#B45309' },
  dirty: { background: '#E5E7EB', border: '#9CA3AF', accent: '#4B5563' },
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
 * Displays table number, occupancy status badge, capacity & section, and active tab or availability.
 */
export const TableCard: React.FC<TableCardProps> = ({
  table,
  isSelected = false,
  onPress,
  className = '',
}) => {
  const colors = useHorecaColors();
  const cardTone = STATUS_TONES[table.status] ?? STATUS_TONES.available;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Table ${table.table_number}, ${table.status}`}
      onPress={() => onPress(table)}
      style={{ backgroundColor: cardTone.background, borderColor: cardTone.border }}
      className={`flex-1 m-1.5 p-3.5 rounded-2xl border shadow-sm active:opacity-80 ${isSelected ? 'border-2' : ''} ${className}`.trim()}
    >
      {/* Top Card Row */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <AppText variant="title" style={{ color: DARK_TEXT }} className="text-xl font-bold mr-1.5">
            {table.table_number}
          </AppText>
          {isSelected ? (
            <CheckCircleIcon color={colors.primary} size={16} />
          ) : null}
        </View>

        {/* {isOccupied && (
          <View>
            <AppText variant="caption" style={{ color: MUTED_TEXT }} className="text-[10px] uppercase font-semibold">
              Current Tab
            </AppText>
            <AppText variant="label" style={{ color: DARK_TEXT }} className="font-bold">
              {currentTabAmount}
            </AppText>
          </View>
        )} */}
      </View>

      {/* Section & Guests */}
      <View className="flex-row items-center mb-3">
        <UserGroupIcon color={MUTED_TEXT} size={14} />
        <AppText variant="caption" style={{ color: MUTED_TEXT }} className="ml-1 font-medium">
          {table.capacity} Guests • {table.section || 'General'}
        </AppText>
      </View>

      {/* Current Tab / Available Action */}
      <View
        style={{ borderTopColor: cardTone.border }}
        className="pt-2 border-t flex-row items-center justify-between"
      >
        <View className="flex-row items-center justify-between w-full">
          <AppText variant="caption" style={{ color: cardTone.accent }} className="font-semibold capitalize">
            {table.status}
          </AppText>
          <View className="h-6 w-6 rounded-full bg-white/70 items-center justify-center">
            <PlusIcon color={cardTone.accent} size={14} />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

