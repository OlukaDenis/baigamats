import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PlusIcon,
  UserGroupIcon,
} from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Table } from '@horeca/api/schemas';
import { useHorecaStore } from '@horeca/db/offlineStore';
import { useHorecaColors } from '@horeca/theme/colors';
import { AppText } from '@horeca/components/atoms/AppText';
import { Badge } from '@horeca/components/atoms/Badge';
import { Button } from '@horeca/components/atoms/Button';
import { HorecaAppBar } from '@horeca/components/organisms/HorecaAppBar';
import { ScreenTemplate } from '@horeca/components/templates/ScreenTemplate';

interface FloorPlanScreenProps {
  onOpenOrder: (table: Table) => void;
  onLockTerminal: () => void;
  onProfilePress?: () => void;
}

const SECTIONS = ['All', 'Main Dining', 'Patio', 'Bar'];

export const FloorPlanScreen: React.FC<FloorPlanScreenProps> = ({
  onOpenOrder,
  onLockTerminal,
  onProfilePress,
}) => {
  const insets = useSafeAreaInsets();
  const colors = useHorecaColors();

  const tables = useHorecaStore(state => state.tables);
  const activeTableId = useHorecaStore(state => state.activeTableId);
  const setActiveTableId = useHorecaStore(state => state.setActiveTableId);
  const isOnline = useHorecaStore(state => state.isOnline);

  const [selectedSection, setSelectedSection] = useState<string>('All');

  const filteredTables = tables.filter(tbl => {
    if (selectedSection === 'All') return true;
    return (tbl.section || '').toLowerCase() === selectedSection.toLowerCase();
  });

  const occupiedCount = tables.filter(t => t.status === 'occupied').length;
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const occupancyPercent = totalCapacity > 0 ? Math.round((occupiedCount / tables.length) * 100) : 0;

  const activeTable = tables.find(t => t.id === activeTableId) ?? tables[0];

  const renderTableCard = ({ item }: { item: Table }) => {
    const isSelected = item.id === activeTableId;
    const isOccupied = item.status === 'occupied';

    const statusBadgeVariant =
      item.status === 'occupied'
        ? 'occupied'
        : item.status === 'reserved'
          ? 'reserved'
          : item.status === 'dirty'
            ? 'dirty'
            : 'available';

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Table ${item.table_number}, ${item.status}`}
        onPress={() => setActiveTableId(item.id)}
        className={`flex-1 m-1.5 p-3.5 rounded-2xl border bg-surface transition-all ${
          isSelected
            ? 'border-2 border-primary shadow-md'
            : 'border-border shadow-sm active:border-primary/50'
        }`}
      >
        {/* Top Card Row */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <AppText variant="title" className="text-xl font-bold text-text mr-1.5">
              {item.table_number}
            </AppText>
            {isSelected ? (
              <CheckCircleIcon color={colors.primary} size={16} />
            ) : null}
          </View>

          <Badge
            label={item.status.toUpperCase()}
            variant={statusBadgeVariant}
            size="sm"
          />
        </View>

        {/* Section & Guests */}
        <View className="flex-row items-center mb-3">
          <UserGroupIcon color={colors.onSurfaceVariant} size={14} />
          <AppText variant="caption" className="ml-1 text-text-secondary font-medium">
            {item.capacity} Guests • {item.section || 'General'}
          </AppText>
        </View>

        {/* Current Tab / Clean Action */}
        <View className="pt-2 border-t border-border/50 flex-row items-center justify-between">
          {isOccupied ? (
            <View>
              <AppText variant="caption" className="text-[10px] text-text-secondary uppercase font-semibold">
                Current Tab
              </AppText>
              <AppText variant="label" className="text-primary font-bold">
                UGX 540,000
              </AppText>
            </View>
          ) : (
            <View className="flex-row items-center justify-between w-full">
              <AppText variant="caption" className="text-status-available font-semibold">
                Available
              </AppText>
              <View className="h-6 w-6 rounded-full bg-status-available/15 items-center justify-center">
                <PlusIcon color={colors.statusAvailable} size={14} />
              </View>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenTemplate
      className="bg-background"
      header={
        <HorecaAppBar
          title="Floor Plan"
          subtitle={`FLOOR • ${occupiedCount}/${tables.length} OCCUPIED`}
          isOnline={isOnline}
          onLockPress={onLockTerminal}
          onProfilePress={onProfilePress}
          rightAction={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Active Orders"
              onPress={() => onOpenOrder(activeTable)}
              className="h-10 px-3 mr-2 flex-row items-center justify-center rounded-xl bg-primary/10 border border-primary/25 active:opacity-70"
              hitSlop={6}
            >
              <ClipboardDocumentListIcon color={colors.primary} size={18} />
              <AppText variant="label" className="text-primary font-bold ml-1.5 text-xs">
                Orders
              </AppText>
              {occupiedCount > 0 ? (
                <View className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary items-center justify-center">
                  <AppText className="text-[10px] font-bold text-on-primary">
                    {occupiedCount}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          }
        />
      }
      contentContainerClassName="flex-1"
    >
      {/* Sections Filter Bar */}
      <View className="flex-row px-4 py-2.5 border-b border-border/40">
        {SECTIONS.map(section => {
          const isActive = selectedSection.toLowerCase() === section.toLowerCase();
          return (
            <Pressable
              key={section}
              accessibilityRole="button"
              accessibilityLabel={`Filter section ${section}`}
              onPress={() => setSelectedSection(section)}
              className={`mr-2 px-3.5 py-1.5 rounded-xl border ${
                isActive
                  ? 'bg-primary border-primary shadow-sm'
                  : 'bg-surface border-border active:bg-surface/80'
              }`}
            >
              <AppText
                variant="label"
                className={`text-xs font-semibold ${
                  isActive ? 'text-on-primary' : 'text-text'
                }`}
              >
                {section}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Live Floor Stats Overview Bar */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-surface/60 border-b border-border/40">
        <View className="flex-row items-center">
          <View className="h-2 w-2 rounded-full bg-primary mr-1.5" />
          <AppText variant="caption" className="text-text-secondary font-semibold text-[11px]">
            OCCUPANCY:{' '}
          </AppText>
          <AppText variant="caption" className="text-text font-bold text-[11px]">
            {occupancyPercent}% ({occupiedCount}/{tables.length})
          </AppText>
        </View>
        <View className="flex-row items-center">
          <AppText variant="caption" className="text-text-secondary font-semibold text-[11px]">
            TABS:{' '}
          </AppText>
          <AppText variant="caption" className="text-primary font-bold text-[11px]">
            UGX 1,280,000
          </AppText>
        </View>
      </View>

      {/* Tables Grid */}
      <FlatList
        data={filteredTables}
        keyExtractor={item => item.id}
        numColumns={2}
        renderItem={renderTableCard}
        contentContainerStyle={{
          padding: 12,
          paddingBottom: Math.max(insets.bottom, 16) + 84,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Floating Active Table Bar */}
      {activeTable ? (
        <View
          style={{ bottom: Math.max(insets.bottom, 12) + 8 }}
          className="absolute left-4 right-4 rounded-2xl bg-surface border border-border p-3.5 shadow-xl flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center mr-3">
              <AppText variant="title" className="text-primary font-bold">
                {activeTable.table_number}
              </AppText>
            </View>
            <View className="flex-1">
              <AppText variant="label" className="font-bold text-text" numberOfLines={1}>
                Table {activeTable.table_number} • {activeTable.section || 'General'}
              </AppText>
              <AppText variant="caption" className="text-text-secondary">
                {activeTable.status === 'occupied' ? 'UGX 540,000 • Order #8429' : 'Table is available'}
              </AppText>
            </View>
          </View>

          <Button
            label={activeTable.status === 'occupied' ? 'Open Order' : 'Start Order'}
            variant="primary"
            size="md"
            onPress={() => onOpenOrder(activeTable)}
            rightIcon={<ArrowRightIcon color={colors.onPrimary} size={16} />}
          />
        </View>
      ) : null}
    </ScreenTemplate>
  );
};
